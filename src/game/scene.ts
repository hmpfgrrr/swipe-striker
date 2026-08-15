import Phaser from 'phaser';
import { APP_VERSION, COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { getFieldLayout } from './layout';
import type { FieldLayout } from './layout';
import {
  createPatrolRange,
  interpolateReaction,
  scaleReactionProgress,
  selectDefenderReaction,
  selectGoalkeeperReaction,
} from './movement';
import type { Reaction } from './movement';
import { evaluateShotFrame } from './rules';
import { createShotPath } from './trajectory';
import type { Defender, PitchBounds, Point, ShotOutcome } from './types';
export { createInitialDefenders, getFieldLayout } from './layout';

type ActorVisual = {
  body: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  logical: Defender;
  start: Point;
};
type FieldMode = 'grass' | 'indoor';
type ReplayActorPositions = { goalkeeper: Point; defenders: Point[] };

const FIELD_BOUNDS: PitchBounds = { left: 20, right: 370, top: 28, bottom: 816, ballRadius: 10 };
const INDOOR_BOUNDS: PitchBounds = { ...FIELD_BOUNDS, sideBounce: true };
const OUTCOME_TEXT: Record<ShotOutcome, string> = {
  goal: 'TOR!',
  saved: 'GEHALTEN',
  blocked: 'GEBLOCKT',
  out: 'AUS',
  missed: 'DANEBEN',
};
const HIGHSCORE_STORAGE_KEY = 'swipe-striker-highscore';

export class GameScene extends Phaser.Scene {
  private layout!: FieldLayout;
  private ball!: Phaser.GameObjects.Arc;
  private pathLine!: Phaser.GameObjects.Graphics;
  private feedback!: Phaser.GameObjects.Text;
  private restart!: Phaser.GameObjects.Text;
  private fieldButton!: Phaser.GameObjects.Text;
  private highscoreText!: Phaser.GameObjects.Text;
  private goalkeeper!: ActorVisual;
  private defenders: ActorVisual[] = [];
  private patrolTweens: Phaser.Tweens.Tween[] = [];
  private shotTween?: Phaser.Tweens.Tween;
  private feedbackTimer?: Phaser.Time.TimerEvent;
  private replayTimer?: Phaser.Time.TimerEvent;
  private dragPath: Point[] = [];
  private dragging = false;
  private shotActive = false;
  private fieldMode: FieldMode = 'grass';
  private fieldSelection: Phaser.GameObjects.Text[] = [];
  private lastShotPath: Point[] = [];
  private lastShotActorPositions?: ReplayActorPositions;
  private replaying = false;
  private highscore = 0;

  constructor() {
    super('GameScene');
  }

  create(data?: { fieldMode?: FieldMode; chooseField?: boolean }): void {
    if (!data?.fieldMode) {
      this.showFieldSelection();
      return;
    }
    this.startGame(data.fieldMode);
  }

  private showFieldSelection(): void {
    const title = this.add
      .text(GAME_WIDTH / 2, 240, 'SPIELFELD WÄHLEN', {
        fontFamily: 'system-ui',
        fontSize: '26px',
        color: '#fff4dc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(GAME_WIDTH / 2, 285, 'Wie möchtest du spielen?', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#d2f0dc',
      })
      .setOrigin(0.5);
    const options: Array<{ mode: FieldMode; label: string; y: number }> = [
      { mode: 'grass', label: 'RASEN', y: 390 },
      { mode: 'indoor', label: 'INDOOR MIT BANDE', y: 500 },
    ];
    const buttons = options.map(({ mode, label, y }) => {
      const option = this.add
        .text(GAME_WIDTH / 2, y, label, {
          fontFamily: 'system-ui',
          fontSize: '18px',
          color: '#0b1720',
          backgroundColor: mode === 'grass' ? '#8bc34a' : '#c49a6c',
          padding: { x: 24, y: 16 },
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      option.on('pointerdown', () => this.startGame(mode));
      return option;
    });
    this.fieldSelection = [title, subtitle, ...buttons];
  }

  private startGame(mode: FieldMode): void {
    this.fieldMode = mode;
    this.loadHighscore();
    if (typeof localStorage !== 'undefined') localStorage.setItem('swipe-striker-field', mode);
    this.fieldSelection.forEach((option) => option.destroy());
    this.fieldSelection = [];
    this.layout = getFieldLayout(GAME_WIDTH, GAME_HEIGHT);
    this.drawField();
    this.createActors();
    this.bindInput();
    this.resetLevel();
  }

  private drawField(): void {
    const graphics = this.add.graphics();
    if (this.fieldMode === 'indoor') {
      this.drawIndoorField(graphics);
      return;
    }
    graphics.fillStyle(COLORS.pitch).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const fieldLeft = 20;
    const fieldTop = 28;
    const fieldWidth = GAME_WIDTH - 40;
    const fieldHeight = GAME_HEIGHT - 56;
    const stripeCount = 12;
    const stripeHeight = fieldHeight / stripeCount;
    for (let stripe = 0; stripe < stripeCount; stripe += 1) {
      const distanceFromCenter = Math.min(stripe, stripeCount - 1 - stripe);
      if (distanceFromCenter % 2 === 0) {
        graphics
          .fillStyle(COLORS.pitchDark, 0.65)
          .fillRect(fieldLeft, fieldTop + stripe * stripeHeight, fieldWidth, stripeHeight);
      }
    }
    graphics
      .lineStyle(3, COLORS.cream, 0.35)
      .strokeRect(20, 28, GAME_WIDTH - 40, GAME_HEIGHT - 56)
      .strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 62)
      .lineBetween(20, GAME_HEIGHT * 0.5, GAME_WIDTH - 20, GAME_HEIGHT * 0.5);
    this.add.text(24, 32, `SWIPE STRIKER ${APP_VERSION}`, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#fff4dc',
      fontStyle: 'bold',
    });
    this.createHighscoreText();
    this.add.text(24, 58, 'Wische nach vorn – seitlich für Drall', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#d2f0dc',
    });
    this.pathLine = this.add.graphics();
    this.feedback = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, '', {
        fontFamily: 'system-ui',
        fontSize: '34px',
        color: '#fff4dc',
        fontStyle: 'bold',
        stroke: '#0b1720',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.restart = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 'NOCHMAL', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#0b1720',
        backgroundColor: '#fff4dc',
        padding: { x: 18, y: 12 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10)
      .setVisible(false);
    this.restart.on('pointerdown', () => this.resetLevel());
    this.createFieldButton();
  }

  private drawIndoorField(graphics: Phaser.GameObjects.Graphics): void {
    const fieldLeft = 20;
    const fieldTop = 28;
    const fieldWidth = GAME_WIDTH - 40;
    const fieldHeight = GAME_HEIGHT - 56;
    const stripeCount = 12;
    const stripeHeight = fieldHeight / stripeCount;
    graphics.fillStyle(0x243746).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let stripe = 0; stripe < stripeCount; stripe += 1) {
      const distanceFromCenter = Math.min(stripe, stripeCount - 1 - stripe);
      graphics
        .fillStyle(distanceFromCenter % 2 === 0 ? 0x9b7048 : 0xa97f52)
        .fillRect(fieldLeft, fieldTop + stripe * stripeHeight, fieldWidth, stripeHeight);
    }
    graphics
      .fillStyle(0x70472f)
      .fillRect(fieldLeft - 8, fieldTop - 8, fieldWidth + 16, 8)
      .fillRect(fieldLeft - 8, fieldTop + fieldHeight, fieldWidth + 16, 8)
      .fillRect(fieldLeft - 8, fieldTop, 8, fieldHeight)
      .fillRect(fieldLeft + fieldWidth, fieldTop, 8, fieldHeight);
    graphics
      .lineStyle(3, COLORS.cream, 0.9)
      .strokeRect(fieldLeft, fieldTop, fieldWidth, fieldHeight)
      .strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 62)
      .lineBetween(fieldLeft, GAME_HEIGHT * 0.5, fieldLeft + fieldWidth, GAME_HEIGHT * 0.5);
    this.add.text(24, 32, `SWIPE STRIKER ${APP_VERSION} · INDOOR`, {
      fontFamily: 'system-ui',
      fontSize: '18px',
      color: '#fff4dc',
      fontStyle: 'bold',
    });
    this.createHighscoreText();
    this.add.text(24, 58, 'Bande nutzen – seitlich für Abpraller', {
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#fff4dc',
    });
    this.pathLine = this.add.graphics();
    this.feedback = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, '', {
        fontFamily: 'system-ui',
        fontSize: '34px',
        color: '#fff4dc',
        fontStyle: 'bold',
        stroke: '#0b1720',
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.restart = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, 'NOCHMAL', {
        fontFamily: 'system-ui',
        fontSize: '16px',
        color: '#0b1720',
        backgroundColor: '#fff4dc',
        padding: { x: 18, y: 12 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(10)
      .setVisible(false);
    this.restart.on('pointerdown', () => this.resetLevel());
    this.createFieldButton();
  }

  private createHighscoreText(): void {
    this.highscoreText = this.add
      .text(24, GAME_HEIGHT - 105, '', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#fff4dc',
        fontStyle: 'bold',
      })
      .setOrigin(0, 1)
      .setDepth(20);
    this.updateHighscoreText();
  }

  private loadHighscore(): void {
    if (typeof localStorage === 'undefined') return;
    const stored = Number.parseInt(localStorage.getItem(HIGHSCORE_STORAGE_KEY) ?? '0', 10);
    this.highscore = Number.isFinite(stored) && stored >= 0 ? stored : 0;
  }

  private updateHighscoreText(): void {
    this.highscoreText?.setText(`HIGHSCORE: ${this.highscore}`);
  }

  private registerGoal(): void {
    this.highscore += 1;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HIGHSCORE_STORAGE_KEY, String(this.highscore));
    }
    this.updateHighscoreText();
  }

  private createFieldButton(): void {
    this.fieldButton = this.add
      .text(GAME_WIDTH - 24, GAME_HEIGHT - 105, 'FELD', {
        fontFamily: 'system-ui',
        fontSize: '13px',
        color: '#0b1720',
        backgroundColor: '#fff4dc',
        padding: { x: 12, y: 9 },
        fontStyle: 'bold',
      })
      .setOrigin(1)
      .setInteractive({ useHandCursor: true })
      .setDepth(20)
      .setVisible(true);
    this.fieldButton.on('pointerdown', () => this.scene.restart({ chooseField: true }));
  }

  private makeActor(
    defender: Defender,
    label: string,
    hairColor: number,
    gloves = false,
    jerseyColor = COLORS.orange,
  ): ActorVisual {
    const logical = { ...defender, center: { ...defender.center } };
    const body = this.createPixelPlayer(logical.center, jerseyColor, hairColor, 'front', gloves);
    return {
      body,
      label: this.add
        .text(logical.center.x, logical.center.y, label, { fontSize: '12px', color: '#0b1720', fontStyle: 'bold' })
        .setOrigin(0.5),
      logical,
      start: { ...logical.center },
    };
  }

  private createPixelPlayer(
    point: Point,
    jerseyColor: number,
    hairColor = 0x382316,
    facing: 'front' | 'back' = 'front',
    gloves = false,
  ): Phaser.GameObjects.Container {
    const skin = 0xffc08a;
    const shorts = 0x20232a;
    const socks = 0xf5f0dc;
    const shoes = 0x111318;
    const body = this.add.container(point.x, point.y);
    const addBlock = (x: number, y: number, width: number, height: number, color: number): void => {
      body.add(this.add.rectangle(x + width / 2, y + height / 2, width, height, color).setOrigin(0.5));
    };
    addBlock(-10, -31, 20, 5, hairColor);
    addBlock(-13, -27, 5, 6, hairColor);
    addBlock(8, -27, 5, 6, hairColor);
    addBlock(-10, -26, 20, 18, facing === 'back' ? hairColor : skin);
    addBlock(-13, -21, 3, 7, facing === 'back' ? hairColor : skin);
    addBlock(10, -21, 3, 7, facing === 'back' ? hairColor : skin);
    if (facing === 'front') {
      addBlock(-6, -20, 3, 3, shoes);
      addBlock(3, -20, 3, 3, shoes);
      addBlock(-1, -16, 3, 3, 0xd99062);
      addBlock(-1, -10, 2, 1, 0x8f4f3f);
    }
    addBlock(-3, -8, 6, 2, skin);
    addBlock(-4, -6, 8, 2, skin);
    addBlock(-14, -4, 28, 19, jerseyColor);
    addBlock(-18, -1, 4, 12, jerseyColor);
    addBlock(14, -1, 4, 12, jerseyColor);
    addBlock(gloves ? -22 : -20, gloves ? 6 : 7, gloves ? 6 : 4, gloves ? 6 : 4, gloves ? 0xffffff : skin);
    addBlock(16, gloves ? 6 : 7, gloves ? 6 : 4, gloves ? 6 : 4, gloves ? 0xffffff : skin);
    addBlock(-11, 15, 22, 8, shorts);
    addBlock(-11, 23, 8, 12, jerseyColor);
    addBlock(3, 23, 8, 12, jerseyColor);
    addBlock(-11, 35, 8, 7, socks);
    addBlock(3, 35, 8, 7, socks);
    addBlock(-15, 42, 12, 4, shoes);
    addBlock(3, 42, 12, 4, shoes);
    body.setSize(40, 50);
    return body;
  }

  private createActors(): void {
    const { goal, goalkeeper, defenders, striker, ball } = this.layout;
    const goalGraphics = this.add.graphics();
    goalGraphics.fillStyle(0x78b968).fillRect(goal.x, goal.y, goal.width, goal.height);
    for (let x = goal.x + 10; x < goal.x + goal.width; x += 14) {
      goalGraphics.fillStyle(COLORS.cream, 0.55).fillRect(x, goal.y + 5, 2, goal.height - 5);
    }
    for (let y = goal.y + 10; y < goal.y + goal.height; y += 10) {
      goalGraphics.fillStyle(COLORS.cream, 0.55).fillRect(goal.x + 5, y, goal.width - 10, 2);
    }
    goalGraphics
      .fillStyle(COLORS.cream)
      .fillRect(goal.x - 5, goal.y - 5, goal.width + 10, 6)
      .fillRect(goal.x - 5, goal.y - 5, 6, goal.height + 12)
      .fillRect(goal.x + goal.width - 1, goal.y - 5, 6, goal.height + 12)
      .fillRect(goal.x - 5, goal.y + goal.height, goal.width + 10, 7);
    this.goalkeeper = this.makeActor(goalkeeper, 'GK', 0x171717, true, 0x3d7eff);
    const defenderHairColors = [0x382316, 0x171717, 0xc88745];
    this.defenders = defenders.map((defender, index) =>
      this.makeActor(defender, `${index + 1}`, defenderHairColors[index]),
    );
    this.createPixelPlayer(striker, COLORS.yellow, 0x382316, 'back');
    this.add
      .text(striker.x, striker.y, '5', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#0b1720',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.ball = this.add.circle(ball.x, ball.y, FIELD_BOUNDS.ballRadius, COLORS.white).setDepth(5);
  }

  private setActorPosition(actor: ActorVisual, point: Point): void {
    actor.body.setPosition(point.x, point.y);
    actor.label.setPosition(point.x, point.y);
    actor.logical.center = { ...point };
  }

  private startPatrols(): void {
    this.stopPatrols();
    this.defenders.forEach((actor, index) => {
      const halfWidth = actor.logical.patrolHalfWidth ?? 30;
      const range = createPatrolRange(
        actor.start.x,
        halfWidth,
        FIELD_BOUNDS.left + actor.logical.radius,
        FIELD_BOUNDS.right - actor.logical.radius,
      );
      this.setActorPosition(actor, { x: range.from, y: actor.start.y });
      this.patrolTweens.push(
        this.tweens.add({
          targets: actor.body,
          x: range.to,
          duration: 1250 + index * 180,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          onUpdate: () => this.setActorPosition(actor, { x: actor.body.x, y: actor.start.y }),
        }),
      );
    });
    const goal = this.layout.goal;
    const minimumKeeperX = goal.x + this.goalkeeper.logical.radius;
    const maximumKeeperX = goal.x + goal.width - this.goalkeeper.logical.radius;
    this.setActorPosition(this.goalkeeper, { x: minimumKeeperX, y: this.goalkeeper.start.y });
    this.patrolTweens.push(
      this.tweens.add({
        targets: this.goalkeeper.body,
        x: maximumKeeperX,
        duration: 1450,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        onUpdate: () =>
          this.setActorPosition(this.goalkeeper, { x: this.goalkeeper.body.x, y: this.goalkeeper.start.y }),
      }),
    );
  }

  private stopPatrols(): void {
    this.patrolTweens.forEach((tween) => tween.stop());
    this.patrolTweens = [];
  }

  private bindInput(): void {
    const bounds = this.fieldMode === 'indoor' ? INDOOR_BOUNDS : FIELD_BOUNDS;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.shotActive || this.restart.visible) return;
      const point = { x: pointer.x, y: pointer.y };
      if (Phaser.Math.Distance.Between(point.x, point.y, this.layout.ball.x, this.layout.ball.y) <= 48) {
        this.dragging = true;
        this.dragPath = [point];
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragPath.push({ x: pointer.x, y: pointer.y });
      const result = createShotPath(this.dragPath, this.layout.ball, bounds);
      this.drawPath(result.valid ? result.points : []);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dragPath.push({ x: pointer.x, y: pointer.y });
      const result = createShotPath(this.dragPath, this.layout.ball, bounds);
      this.drawPath([]);
      if (!result.valid) {
        this.showOutcome('DANEBEN');
        return;
      }
      this.lastShotPath = result.points.map((point) => ({ ...point }));
      this.animateShot(result.points);
    });
  }

  private drawPath(path: Point[]): void {
    this.pathLine.clear();
    if (path.length < 2) return;
    this.pathLine.lineStyle(5, COLORS.cream, 0.75).beginPath().moveTo(path[0].x, path[0].y);
    path.slice(1).forEach((point) => this.pathLine.lineTo(point.x, point.y));
    this.pathLine.strokePath();
  }

  private animateShot(path: Point[], duration = 650, isReplay = false): void {
    if (isReplay && this.lastShotActorPositions) {
      this.setActorPosition(this.goalkeeper, this.lastShotActorPositions.goalkeeper);
      this.defenders.forEach((actor, index) =>
        this.setActorPosition(actor, this.lastShotActorPositions!.defenders[index]),
      );
    } else if (!isReplay) {
      this.lastShotActorPositions = {
        goalkeeper: { ...this.goalkeeper.logical.center },
        defenders: this.defenders.map((actor) => ({ ...actor.logical.center })),
      };
    }
    this.stopPatrols();
    this.shotActive = true;
    this.restart.setVisible(false);
    const defenderReactions = this.defenders.map((actor) => selectDefenderReaction(actor.logical, path, 55, 35, 40));
    const keeperReaction = selectGoalkeeperReaction(
      this.goalkeeper.logical,
      path,
      this.layout.goal.x,
      this.layout.goal.x + this.layout.goal.width,
      65,
    );
    let previousBall = { x: this.ball.x, y: this.ball.y };

    this.shotTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        if (!this.shotActive) return;
        const progress = tween.getValue() ?? 0;
        const pathPosition = progress * (path.length - 1);
        const index = Math.min(path.length - 1, Math.floor(pathPosition));
        const next = Math.min(path.length - 1, index + 1);
        const fraction = pathPosition - index;
        const currentBall = {
          x: Phaser.Math.Linear(path[index].x, path[next].x, fraction),
          y: Phaser.Math.Linear(path[index].y, path[next].y, fraction),
        };
        this.ball.setPosition(currentBall.x, currentBall.y);
        this.defenders.forEach((actor, actorIndex) =>
          this.setActorPosition(actor, interpolateReaction(defenderReactions[actorIndex], progress)),
        );
        const keeperProgress = scaleReactionProgress(progress, duration, 650);
        this.setActorPosition(this.goalkeeper, interpolateReaction(keeperReaction, keeperProgress));
        const bounds = this.fieldMode === 'indoor' ? INDOOR_BOUNDS : FIELD_BOUNDS;
        const outcome = isReplay
          ? null
          : evaluateShotFrame(
              previousBall,
              currentBall,
              this.defenders.map((actor) => actor.logical),
              this.goalkeeper.logical,
              this.layout.goal,
              bounds,
            );
        const previousFrame = previousBall;
        previousBall = currentBall;
        if (
          outcome === 'goal' &&
          previousFrame.y > this.layout.goal.y + this.layout.goal.height &&
          currentBall.y <= this.layout.goal.y + this.layout.goal.height
        ) {
          const goalLine = this.layout.goal.y + this.layout.goal.height;
          const crossingProgress = (previousFrame.y - goalLine) / (previousFrame.y - currentBall.y);
          const crossingX = previousFrame.x + (currentBall.x - previousFrame.x) * crossingProgress;
          this.ball.setPosition(crossingX, goalLine);
        }
        if (outcome) this.finishShot(outcome);
      },
      onComplete: () => {
        if (!this.shotActive) return;
        if (isReplay) {
          this.shotActive = false;
          this.replaying = false;
          this.showOutcome('TOR!');
        } else {
          this.finishShot('missed');
        }
      },
    });
  }

  private finishShot(outcome: ShotOutcome): void {
    if (!this.shotActive) return;
    this.shotActive = false;
    this.shotTween?.stop();
    if (outcome === 'goal' && !this.replaying) this.registerGoal();
    this.showOutcome(OUTCOME_TEXT[outcome]);
    if (outcome === 'goal' && !this.replaying && this.lastShotPath.length) {
      this.replayTimer?.remove(false);
      this.replayTimer = this.time.delayedCall(1100, () => this.playGoalReplay());
    }
  }

  private showOutcome(message: string): void {
    this.feedbackTimer?.remove(false);
    this.feedback.setText(message).setAlpha(1);
    this.restart.setVisible(true);
    this.feedbackTimer = this.time.delayedCall(900, () => {
      this.feedback.setAlpha(0.72);
      this.feedbackTimer = undefined;
    });
  }

  private resetActor(actor: ActorVisual): void {
    this.setActorPosition(actor, actor.start);
  }

  private playGoalReplay(): void {
    if (this.shotActive || !this.lastShotPath.length) return;
    this.resetLevel();
    this.replaying = true;
    this.feedback.setText('WIEDERHOLUNG').setAlpha(1);
    this.animateShot(this.getGoalReplayPath(), 1400, true);
  }

  private getGoalReplayPath(): Point[] {
    const goalLine = this.layout.goal.y + this.layout.goal.height;
    for (let index = 1; index < this.lastShotPath.length; index += 1) {
      const previous = this.lastShotPath[index - 1];
      const current = this.lastShotPath[index];
      if (previous.y > goalLine && current.y <= goalLine) {
        const progress = (previous.y - goalLine) / (previous.y - current.y);
        return [
          ...this.lastShotPath.slice(0, index),
          {
            x: previous.x + (current.x - previous.x) * progress,
            y: goalLine,
          },
        ];
      }
    }
    return this.lastShotPath;
  }

  resetLevel(): void {
    if (!this.ball) return;
    this.shotTween?.stop();
    this.feedbackTimer?.remove(false);
    this.replayTimer?.remove(false);
    this.feedbackTimer = undefined;
    this.replayTimer = undefined;
    this.stopPatrols();
    this.ball.setPosition(this.layout.ball.x, this.layout.ball.y);
    this.defenders.forEach((actor) => this.resetActor(actor));
    this.resetActor(this.goalkeeper);
    this.dragPath = [];
    this.dragging = false;
    this.shotActive = false;
    this.restart.setVisible(false);
    this.feedback.setText('').setAlpha(0);
    this.pathLine.clear();
    this.startPatrols();
  }
}
