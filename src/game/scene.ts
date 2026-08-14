import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { evaluateShot } from './rules';
import { normalizePath, samplePolyline } from './trajectory';
import type { Point } from './types'; import { createInitialDefenders, getFieldLayout } from './layout'; import type { FieldLayout } from './layout'; export { createInitialDefenders, getFieldLayout } from './layout';

export class GameScene extends Phaser.Scene {
  private layout!: FieldLayout; private ball!: Phaser.GameObjects.Arc; private pathLine!: Phaser.GameObjects.Graphics; private feedback!: Phaser.GameObjects.Text; private restart!: Phaser.GameObjects.Text;
  private dragPath: Point[] = []; private dragging = false; private shotActive = false;
  constructor() { super('GameScene'); }

  create(): void {
    this.layout = getFieldLayout(GAME_WIDTH, GAME_HEIGHT); this.drawField(); this.createActors(); this.bindInput(); this.resetLevel();
  }

  private drawField(): void {
    const g = this.add.graphics(); g.fillStyle(COLORS.pitch); g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT); g.fillStyle(COLORS.pitchDark, 0.25); g.fillTriangle(0, GAME_HEIGHT, GAME_WIDTH * 0.42, 0, GAME_WIDTH, GAME_HEIGHT); g.lineStyle(3, COLORS.cream, 0.35); g.strokeRect(20, 28, GAME_WIDTH - 40, GAME_HEIGHT - 56); g.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, 62); g.lineBetween(20, GAME_HEIGHT * 0.52, GAME_WIDTH - 20, GAME_HEIGHT * 0.52);
    this.add.text(24, 32, 'SWIPE STRIKER', { fontFamily: 'system-ui', fontSize: '18px', color: '#fff4dc', fontStyle: 'bold' }); this.add.text(24, 58, 'Zeichne deine Schusskurve', { fontFamily: 'system-ui', fontSize: '13px', color: '#d2f0dc' });
    this.pathLine = this.add.graphics(); this.feedback = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.67, '', { fontFamily: 'system-ui', fontSize: '34px', color: '#fff4dc', fontStyle: 'bold', stroke: '#0b1720', strokeThickness: 7 }).setOrigin(0.5).setDepth(10);
    this.restart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.94, 'NOCHMAL SPIELEN', { fontFamily: 'system-ui', fontSize: '16px', color: '#0b1720', backgroundColor: '#fff4dc', padding: { x: 18, y: 12 }, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10).setVisible(false); this.restart.on('pointerdown', () => this.resetLevel());
  }

  private createActors(): void {
    const { goal, goalkeeper, defenders, striker, ball } = this.layout; const g = this.add.graphics(); g.fillStyle(COLORS.cream); g.fillRect(goal.x, goal.y + goal.height, goal.width, 7); g.lineStyle(3, COLORS.cream, 0.85); g.strokeRect(goal.x, goal.y, goal.width, goal.height); this.add.circle(goalkeeper.center.x, goalkeeper.center.y, goalkeeper.radius, COLORS.orange); this.add.text(goalkeeper.center.x, goalkeeper.center.y, 'GK', { fontSize: '11px', color: '#0b1720', fontStyle: 'bold' }).setOrigin(0.5);
    defenders.forEach((defender, i) => { this.add.circle(defender.center.x, defender.center.y, defender.radius, COLORS.orange); this.add.text(defender.center.x, defender.center.y, `${i + 1}`, { fontSize: '13px', color: '#0b1720', fontStyle: 'bold' }).setOrigin(0.5); }); this.add.circle(striker.x, striker.y, 24, COLORS.yellow); this.add.text(striker.x, striker.y, '9', { fontSize: '16px', color: '#0b1720', fontStyle: 'bold' }).setOrigin(0.5); this.ball = this.add.circle(ball.x, ball.y, 10, COLORS.white).setDepth(5);
  }

  private bindInput(): void { this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { if (this.shotActive || this.restart.visible) return; const p = { x: pointer.x, y: pointer.y }; if (Phaser.Math.Distance.Between(p.x, p.y, this.layout.ball.x, this.layout.ball.y) <= 48) { this.dragging = true; this.dragPath = [p]; } }); this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (this.dragging) { this.dragPath.push({ x: pointer.x, y: pointer.y }); this.drawPath(this.dragPath); } }); this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => { if (!this.dragging) return; this.dragging = false; this.dragPath.push({ x: pointer.x, y: pointer.y }); const path = samplePolyline(normalizePath(this.dragPath), 12); this.drawPath([]); if (path.length < 2) { this.showOutcome('DANEBEN'); return; } this.animateShot(path); }); }
  private drawPath(path: Point[]): void { this.pathLine.clear(); if (path.length < 2) return; this.pathLine.lineStyle(5, COLORS.cream, 0.75); this.pathLine.beginPath(); this.pathLine.moveTo(path[0].x, path[0].y); path.slice(1).forEach(p => this.pathLine.lineTo(p.x, p.y)); this.pathLine.strokePath(); }
  private animateShot(path: Point[]): void { this.shotActive = true; this.restart.setVisible(false); this.tweens.addCounter({ from: 0, to: path.length - 1, duration: 550, ease: 'Sine.easeInOut', onUpdate: tween => { const value = tween.getValue() ?? 0; const index = Math.min(path.length - 1, Math.floor(value)); const next = Math.min(path.length - 1, index + 1); const fraction = value - index; this.ball.setPosition(Phaser.Math.Linear(path[index].x, path[next].x, fraction), Phaser.Math.Linear(path[index].y, path[next].y, fraction)); }, onComplete: () => { const outcome = evaluateShot(path, this.layout.defenders, this.layout.goalkeeper, this.layout.goal); this.showOutcome({ goal: 'TOR!', saved: 'GEHALTEN', blocked: 'GEBLOCKT', missed: 'DANEBEN' }[outcome]); } }); }
  private showOutcome(message: string): void { this.feedback.setText(message).setAlpha(1); this.shotActive = false; this.restart.setVisible(true); this.time.delayedCall(900, () => this.feedback.setAlpha(0.72)); }
  resetLevel(): void { if (!this.ball) return; this.tweens.killTweensOf(this.ball); this.ball.setPosition(this.layout.ball.x, this.layout.ball.y); this.dragPath = []; this.dragging = false; this.shotActive = false; this.restart.setVisible(false); this.feedback.setAlpha(0); this.pathLine.clear(); }
}
