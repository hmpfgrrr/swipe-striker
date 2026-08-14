import { describe, expect, it } from 'vitest';
import { interpolateReaction, selectDefenderReaction, selectGoalkeeperReaction } from '../src/game/movement';

describe('actor reactions', () => {
  it('selects the closest reachable defender interception', () => {
    const defender = { center: { x: 100, y: 400 }, radius: 18 };
    expect(selectDefenderReaction(defender, [{x:190,y:500},{x:145,y:420},{x:130,y:380}])).toEqual({start:{x:100,y:400},target:{x:130,y:380}});
  });
  it('keeps an unreachable defender in place', () => {
    const defender = { center: { x: 100, y: 400 }, radius: 18 };
    expect(selectDefenderReaction(defender, [{x:250,y:300}])).toEqual({start:{x:100,y:400},target:{x:100,y:400}});
  });
  it('caps defender movement at 55 pixels', () => {
    const reaction = selectDefenderReaction({center:{x:100,y:400},radius:18}, [{x:170,y:400}], 80, 45, 55);
    expect(reaction.target.x).toBeCloseTo(155);
    expect(reaction.target.y).toBe(400);
  });
  it('caps goalkeeper dive and stays inside goal edges', () => {
    const keeper = { center: { x: 195, y: 160 }, radius: 21 };
    const reaction = selectGoalkeeperReaction(keeper, [{x:320,y:160}], 78, 312);
    expect(reaction.target).toEqual({x:285,y:160});
  });
  it('clamps the final goalkeeper target inside the goal mouth', () => {
    const keeper = { center: { x: 0, y: 160 }, radius: 21 };
    const reaction = selectGoalkeeperReaction(keeper, [{x:320,y:160}], 78, 312);
    expect(reaction.start.x).toBe(99);
    expect(reaction.target.x).toBe(189);
    expect(reaction.target.x - reaction.start.x).toBe(90);
  });
  it('interpolates reactions with clamped progress', () => {
    const reaction = {start:{x:10,y:20},target:{x:30,y:40}};
    expect(interpolateReaction(reaction, 0.5)).toEqual({x:20,y:30});
    expect(interpolateReaction(reaction, 2)).toEqual({x:30,y:40});
    expect(interpolateReaction(reaction, -1)).toEqual({x:10,y:20});
  });
});
