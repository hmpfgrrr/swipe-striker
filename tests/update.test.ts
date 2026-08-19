import { describe, expect, it } from 'vitest';
import { hasWaitingUpdate } from '../src/update';

describe('PWA update detection', () => {
  it('offers an update only when a new worker is waiting over an active app', () => {
    expect(hasWaitingUpdate({ waiting: {} as ServiceWorker }, true)).toBe(true);
    expect(hasWaitingUpdate({ waiting: null }, true)).toBe(false);
    expect(hasWaitingUpdate({ waiting: {} as ServiceWorker }, false)).toBe(false);
  });
});
