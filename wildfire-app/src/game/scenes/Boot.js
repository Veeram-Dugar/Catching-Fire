import Phaser from 'phaser';
import { createInitialState } from '../state.js';
import { TILE_SIZE } from '../config.js';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // No external assets required to start — everything is drawn
    // procedurally below. Swap these for real spritesheets later by
    // loading them here with this.load.image(...) / this.load.spritesheet(...).
  }

  create() {
    if (!this.game.registry.get('state')) {
      this.game.registry.set('state', createInitialState());
    }

    this.generatePlaceholderTextures();
    this.scene.start('Menu');
  }

  generatePlaceholderTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Grass tile
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture('tile-grass', TILE_SIZE, TILE_SIZE);
    g.clear();

    // Fire tile (small)
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xf97316, 1);
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 3);
    g.generateTexture('tile-fire-small', TILE_SIZE, TILE_SIZE);
    g.clear();

    // Fire tile (large)
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0xdc2626, 1);
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2.2);
    g.fillStyle(0xf97316, 1);
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 3.2);
    g.generateTexture('tile-fire-large', TILE_SIZE, TILE_SIZE);
    g.clear();

    // Refill station tile
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.fillStyle(0x38bdf8, 1);
    g.fillRect(TILE_SIZE / 4, TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2);
    g.generateTexture('tile-refill', TILE_SIZE, TILE_SIZE);
    g.clear();

    // Player
    g.fillStyle(0xfacc15, 1);
    g.fillRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    g.generateTexture('player', TILE_SIZE, TILE_SIZE);
    g.clear();

    // Coin
    g.fillStyle(0xfde047, 1);
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 4);
    g.generateTexture('coin', TILE_SIZE, TILE_SIZE);
    g.destroy();
  }
}
