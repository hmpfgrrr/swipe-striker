import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function pngDimensions(filename: string): { width: number; height: number } {
  const file = readFileSync(resolve('public', filename));
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

describe('PWA app icons', () => {
  it.each([
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ])('provides %s at %d × %d pixels', (filename, size) => {
    expect(pngDimensions(filename)).toEqual({ width: size, height: size });
  });

  it('links the iPhone home-screen icon as a PNG', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');
    expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png" />');
  });

  it('registers PNG icons for regular and maskable PWA use', () => {
    const config = readFileSync(resolve('vite.config.ts'), 'utf8');
    expect(config).toContain('icon-192.png`');
    expect(config).toContain('icon-512.png`');
    expect(config).toContain("purpose: 'any'");
    expect(config).toContain("purpose: 'maskable'");
  });
});
