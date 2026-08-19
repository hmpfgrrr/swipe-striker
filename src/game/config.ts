import packageJson from '../../package.json';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;
export const APP_VERSION = packageJson.version;
export const PORTRAIT_ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;
export const COLORS = {
  ink: 0x0b1720,
  pitch: 0x1e9b67,
  pitchDark: 0x16744f,
  cream: 0xfff4dc,
  orange: 0xff795e,
  yellow: 0xffe066,
  strikerJersey: 0xffff38,
  white: 0xffffff,
};
