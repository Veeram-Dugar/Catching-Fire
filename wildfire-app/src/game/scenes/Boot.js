import Phaser from 'phaser';
import { createInitialState } from '../state.js';
import { TILE_SIZE } from '../config.js';

// Silhouette for a wavy retro flame, in unit space: x in [-0.5, 0.5]
// (tip-centered), y in [0, 1] (0 = base, 1 = tip). Scaled/positioned by
// flamePoints() below to draw layered fire tiles without image assets.
const FLAME_TEMPLATE = [
  [-0.35, 0.0],
  [-0.42, 0.32],
  [-0.16, 0.5],
  [-0.32, 0.74],
  [0.0, 1.0],
  [0.3, 0.76],
  [0.12, 0.5],
  [0.42, 0.28],
  [0.34, 0.0],
];

function flamePoints(cx, baseY, scale, factor) {
  const w = 26 * scale * factor;
  const h = 26 * scale * factor;
  return FLAME_TEMPLATE.map(([nx, ny]) => ({ x: cx + nx * w, y: baseY - ny * h }));
}

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
    const T = TILE_SIZE;

    this.drawGrassTile(g, T);
    g.generateTexture('tile-grass', T, T);
    g.clear();

    this.drawFireTile(g, T, false);
    g.generateTexture('tile-fire-small', T, T);
    g.clear();

    this.drawFireTile(g, T, true);
    g.generateTexture('tile-fire-large', T, T);
    g.clear();

    this.drawRefillTile(g, T);
    g.generateTexture('tile-refill', T, T);
    g.clear();

    this.drawPlayer(g, T);
    g.generateTexture('player', T, T);
    g.clear();

    this.drawCoin(g, T);
    g.generateTexture('coin', T, T);
    g.clear();

    this.drawWaterDrop(g);
    g.generateTexture('water-drop', 8, 8);

    g.destroy();
  }

  drawGrassTile(g, T) {
    // Two-tone ground with a scattering of fixed blade tufts for texture.
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x234a2b, 1);
    g.fillRect(0, 0, T, T / 2);

    g.fillStyle(0x3a6b3f, 1);
    const blades = [
      [3, 22, 2, 8],
      [9, 18, 2, 10],
      [15, 24, 2, 6],
      [21, 16, 2, 12],
      [27, 20, 2, 8],
      [6, 8, 2, 6],
      [24, 6, 2, 6],
    ];
    blades.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));

    g.fillStyle(0x4f8a55, 1);
    const highlights = [
      [9, 18, 1, 4],
      [21, 16, 1, 5],
      [3, 22, 1, 3],
    ];
    highlights.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  }

  drawFireTile(g, T, large) {
    // Scorched ground base.
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x2b2018, 1);
    g.fillRect(0, T - 8, T, 8);

    const cx = T / 2;
    const baseY = T - 6;
    const scale = large ? 1 : 0.72;

    g.fillStyle(large ? 0xdc2626 : 0xea580c, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 1), true);

    g.fillStyle(0xf97316, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 0.72), true);

    g.fillStyle(0xfacc15, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 0.42), true);

    if (large) {
      g.fillStyle(0xfde047, 1);
      g.fillCircle(cx - 10, 8, 1.5);
      g.fillCircle(cx + 9, 5, 1.5);
      g.fillCircle(cx + 2, 3, 1.5);
    }
  }

  drawRefillTile(g, T) {
    // Grass background so it reads as a station placed on the field.
    this.drawGrassTile(g, T);

    const cx = T / 2;

    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(cx - 9, T - 8, 18, 5, 1);

    g.fillStyle(0x2563eb, 1);
    g.fillRoundedRect(cx - 7, 10, 14, 18, 3);
    g.fillStyle(0x1d4ed8, 1);
    g.fillRect(cx - 7, 10, 14, 4);

    g.fillStyle(0x1e40af, 1);
    g.fillRect(cx - 11, 16, 4, 5);
    g.fillRect(cx + 7, 16, 4, 5);

    g.fillStyle(0xfacc15, 1);
    g.fillRoundedRect(cx - 5, 4, 10, 7, 2);

    g.lineStyle(1, 0x0f172a, 0.6);
    g.strokeRoundedRect(cx - 7, 10, 14, 18, 3);
  }

  drawPlayer(g, T) {
    const cx = T / 2;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, T - 3, T * 0.5, T * 0.16);

    // Boots.
    g.fillStyle(0x1f2937, 1);
    g.fillRect(cx - 7, T - 8, 5, 6);
    g.fillRect(cx + 2, T - 8, 5, 6);

    // Jacket / torso.
    g.fillStyle(0xf97316, 1);
    g.fillRoundedRect(cx - 9, T - 21, 18, 14, 3);
    g.fillStyle(0xfacc15, 1);
    g.fillRect(cx - 9, T - 12, 18, 2);

    // Arm + hose nozzle reaching out to the side.
    g.fillStyle(0xea580c, 1);
    g.fillRect(cx + 6, T - 18, 6, 5);
    g.fillStyle(0x64748b, 1);
    g.fillRect(cx + 11, T - 17, 5, 3);

    // Head.
    g.fillStyle(0xfcd7b6, 1);
    g.fillRoundedRect(cx - 6, T - 29, 12, 10, 3);

    // Helmet.
    g.fillStyle(0xdc2626, 1);
    g.fillRoundedRect(cx - 8, T - 32, 16, 6, 3);
    g.fillStyle(0xfde047, 1);
    g.fillRect(cx - 2, T - 31, 4, 2);

    g.lineStyle(1, 0x1e1b16, 0.55);
    g.strokeRoundedRect(cx - 9, T - 21, 18, 14, 3);
  }

  drawCoin(g, T) {
    const cx = T / 2;
    const cy = T / 2;

    g.fillStyle(0x000000, 0.2);
    g.fillCircle(cx, cy + 1, T * 0.28);

    g.fillStyle(0xeab308, 1);
    g.fillCircle(cx, cy, T * 0.28);
    g.fillStyle(0xfde047, 1);
    g.fillCircle(cx, cy, T * 0.21);
    g.fillStyle(0xfacc15, 1);
    g.fillRect(cx - 2, cy - T * 0.14, 4, T * 0.28);

    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(cx - T * 0.09, cy - T * 0.09, T * 0.06);

    g.lineStyle(1, 0x92400e, 0.6);
    g.strokeCircle(cx, cy, T * 0.28);
  }

  drawWaterDrop(g) {
    g.fillStyle(0x38bdf8, 1);
    g.fillCircle(4, 5, 3);
    g.fillStyle(0xbae6fd, 1);
    g.fillCircle(3, 4, 1.2);
  }
}
