import Phaser from 'phaser';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Main from './scenes/Main.js';
import Shop from './scenes/Shop.js';

export const TILE_SIZE = 32;
export const GRID_COLS = 20;
export const GRID_ROWS = 14;

export function createGameConfig(parentId) {
  return {
    type: Phaser.AUTO,
    parent: parentId,
    width: GRID_COLS * TILE_SIZE,
    height: GRID_ROWS * TILE_SIZE + 64, // extra space for HUD
    pixelArt: true,
    backgroundColor: '#0b1020',
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [Boot, Menu, Main, Shop],
  };
}
