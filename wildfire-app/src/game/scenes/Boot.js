import Phaser from 'phaser';
import { createInitialState } from '../state.js';
import { TILE_SIZE, GRASS_VARIANT_COUNT } from '../config.js';

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

// A few fixed blade/detail layouts so grass tiles don't all look identical
// when tiled across the grid — each is picked at random per-tile in Main.js.
const GRASS_VARIANTS = [
  {
    blades: [
      [3, 22, 2, 8],
      [9, 18, 2, 10],
      [15, 24, 2, 6],
      [21, 16, 2, 12],
      [27, 20, 2, 8],
      [6, 8, 2, 6],
      [24, 6, 2, 6],
    ],
    highlights: [
      [9, 18, 1, 4],
      [21, 16, 1, 5],
      [3, 22, 1, 3],
    ],
    extra: null,
  },
  {
    blades: [
      [5, 20, 2, 10],
      [12, 16, 2, 8],
      [19, 22, 2, 6],
      [25, 14, 2, 10],
      [2, 10, 2, 6],
      [16, 6, 2, 8],
    ],
    highlights: [
      [12, 16, 1, 4],
      [25, 14, 1, 5],
    ],
    extra: 'pebbles',
  },
  {
    blades: [
      [4, 18, 2, 8],
      [11, 24, 2, 6],
      [18, 14, 2, 12],
      [24, 20, 2, 8],
      [8, 6, 2, 6],
      [28, 8, 2, 6],
    ],
    highlights: [
      [18, 14, 1, 5],
      [24, 20, 1, 4],
    ],
    extra: 'flowers',
  },
];

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

    for (let i = 0; i < GRASS_VARIANT_COUNT; i++) {
      this.drawGrassTile(g, T, i);
      g.generateTexture(`tile-grass-${i}`, T, T);
      g.clear();
    }

    this.drawFireTile(g, T, 'small');
    g.generateTexture('tile-fire-small', T, T);
    g.clear();

    this.drawFireTile(g, T, 'large');
    g.generateTexture('tile-fire-large', T, T);
    g.clear();

    this.drawFireTile(g, T, 'inferno');
    g.generateTexture('tile-fire-inferno', T, T);
    g.clear();

    this.drawRefillTile(g, T);
    g.generateTexture('tile-refill', T, T);
    g.clear();

    this.drawPlayer(g, T);
    g.generateTexture('player', T, T);
    g.clear();

    this.drawCoin(g, T, false);
    g.generateTexture('coin', T, T);
    g.clear();

    this.drawCoin(g, T, true);
    g.generateTexture('coin-golden', T, T);
    g.clear();

    this.drawWaterDrop(g);
    g.generateTexture('water-drop', 8, 8);

    g.destroy();
  }

  drawGrassTile(g, T, variantIndex = 0) {
    const variant = GRASS_VARIANTS[variantIndex % GRASS_VARIANTS.length];

    // Two-tone ground with a scattering of blade tufts for texture.
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(0x234a2b, 1);
    g.fillRect(0, 0, T, T / 2);

    g.fillStyle(0x3a6b3f, 1);
    variant.blades.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));

    g.fillStyle(0x4f8a55, 1);
    variant.highlights.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));

    if (variant.extra === 'pebbles') {
      g.fillStyle(0x64748b, 0.7);
      g.fillCircle(22, 26, 1.5);
      g.fillCircle(25, 24, 1);
    } else if (variant.extra === 'flowers') {
      g.fillStyle(0xfde68a, 0.9);
      g.fillCircle(20, 9, 1.3);
      g.fillCircle(6, 14, 1.3);
    }

    // Subtle edge so tiles read as discrete cells rather than a solid mass.
    g.lineStyle(1, 0x0f2016, 0.35);
    g.strokeRect(0.5, 0.5, T - 1, T - 1);
  }

  drawFireTile(g, T, tier) {
    // tier: 'small' | 'large' | 'inferno' — inferno is the toughest, only
    // seen in later waves, and reads as visibly angrier than a large fire.
    const large = tier === 'large' || tier === 'inferno';
    const inferno = tier === 'inferno';

    // Scorched ground base — inferno chars the ground almost black.
    g.fillStyle(0x1e3a24, 1);
    g.fillRect(0, 0, T, T);
    g.fillStyle(inferno ? 0x1a1210 : 0x2b2018, 1);
    g.fillRect(0, T - 8, T, 8);

    const cx = T / 2;
    const baseY = T - 6;
    const scale = inferno ? 1.15 : large ? 1 : 0.72;

    // Soft glow halo behind the flame.
    g.fillStyle(inferno ? 0x7c2d12 : large ? 0xf97316 : 0xfb923c, inferno ? 0.3 : 0.18);
    g.fillCircle(cx, baseY - 10 * scale, (inferno ? 18 : 15) * scale);

    if (large) {
      // A second, offset tongue behind the main flame for a flicker look.
      g.fillStyle(inferno ? 0x991b1b : 0xea580c, 1);
      g.fillPoints(flamePoints(cx - 4, baseY, scale * 0.85, 0.9), true);
    }

    g.fillStyle(inferno ? 0x450a0a : large ? 0xdc2626 : 0xea580c, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 1), true);

    g.fillStyle(inferno ? 0xb91c1c : 0xf97316, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 0.72), true);

    g.fillStyle(inferno ? 0xf97316 : 0xfacc15, 1);
    g.fillPoints(flamePoints(cx, baseY, scale, 0.42), true);

    g.fillStyle(0xfff7ed, 0.9);
    g.fillPoints(flamePoints(cx, baseY, scale, inferno ? 0.24 : 0.2), true);

    if (large) {
      g.fillStyle(0xfde047, 1);
      g.fillCircle(cx - 10, 8, 1.5);
      g.fillCircle(cx + 9, 5, 1.5);
      g.fillCircle(cx + 2, 3, 1.5);

      // Faint smoke puffs drifting up — thicker and darker for inferno.
      g.fillStyle(0x475569, inferno ? 0.5 : 0.3);
      g.fillCircle(cx - 6, 5, inferno ? 4 : 3);
      g.fillCircle(cx + 5, 3, inferno ? 3.5 : 2.5);
    }

    if (inferno) {
      g.fillStyle(0xfacc15, 1);
      g.fillCircle(cx - 3, 2, 1.3);
      g.fillCircle(cx + 8, 9, 1.3);
      g.fillStyle(0x1e293b, 0.45);
      g.fillCircle(cx, 1, 3);
      g.lineStyle(1, 0x000000, 0.4);
      g.strokeRect(0.5, 0.5, T - 1, T - 1);
    }
  }

  drawRefillTile(g, T) {
    // Grass background so it reads as a station placed on the field.
    this.drawGrassTile(g, T, 0);

    const cx = T / 2;

    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(cx - 9, T - 8, 18, 5, 1);

    g.fillStyle(0x2563eb, 1);
    g.fillRoundedRect(cx - 7, 10, 14, 18, 3);
    g.fillStyle(0x1d4ed8, 1);
    g.fillRect(cx - 7, 10, 14, 4);
    g.fillStyle(0x3b82f6, 1);
    g.fillRect(cx - 6, 15, 3, 10);

    g.fillStyle(0x1e40af, 1);
    g.fillRect(cx - 11, 16, 4, 5);
    g.fillRect(cx + 7, 16, 4, 5);

    g.fillStyle(0x0f172a, 0.6);
    g.fillCircle(cx - 3, 20, 0.8);
    g.fillCircle(cx + 3, 20, 0.8);

    g.fillStyle(0xfacc15, 1);
    g.fillRoundedRect(cx - 5, 4, 10, 7, 2);
    g.fillStyle(0xfde68a, 0.8);
    g.fillRect(cx - 3, 5, 3, 2);

    g.lineStyle(1, 0x0f172a, 0.6);
    g.strokeRoundedRect(cx - 7, 10, 14, 18, 3);
  }

  drawPlayer(g, T) {
    const cx = T / 2;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, T - 3, T * 0.5, T * 0.16);

    // Water tank, peeking out above the shoulders.
    g.fillStyle(0x0369a1, 1);
    g.fillRoundedRect(cx - 6, T - 24, 12, 12, 3);
    g.fillStyle(0x0284c7, 1);
    g.fillRect(cx - 6, T - 24, 12, 3);

    // Boots.
    g.fillStyle(0x1f2937, 1);
    g.fillRect(cx - 7, T - 8, 5, 6);
    g.fillRect(cx + 2, T - 8, 5, 6);
    g.fillStyle(0x374151, 1);
    g.fillRect(cx - 7, T - 8, 5, 2);
    g.fillRect(cx + 2, T - 8, 5, 2);

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
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(cx + 14, T - 16, 2, 1);

    // Head.
    g.fillStyle(0xfcd7b6, 1);
    g.fillRoundedRect(cx - 6, T - 29, 12, 10, 3);

    // Face.
    g.fillStyle(0x1e1b16, 0.8);
    g.fillCircle(cx - 2, T - 24, 0.7);
    g.fillCircle(cx + 2, T - 24, 0.7);

    // Helmet with a brim.
    g.fillStyle(0xdc2626, 1);
    g.fillRoundedRect(cx - 8, T - 32, 16, 6, 3);
    g.fillRect(cx - 9, T - 27, 18, 2);
    g.fillStyle(0xfde047, 1);
    g.fillRect(cx - 2, T - 31, 4, 2);
    g.fillStyle(0xf87171, 0.6);
    g.fillRect(cx - 6, T - 31, 4, 1);

    g.lineStyle(1, 0x1e1b16, 0.55);
    g.strokeRoundedRect(cx - 9, T - 21, 18, 14, 3);
    g.strokeRoundedRect(cx - 6, T - 24, 12, 12, 3);
  }

  drawCoin(g, T, golden = false) {
    const cx = T / 2;
    const cy = T / 2;

    if (golden) {
      g.fillStyle(0xfde047, 0.35);
      g.fillCircle(cx, cy, T * 0.42);
    }

    g.fillStyle(0x000000, 0.2);
    g.fillCircle(cx, cy + 1, T * 0.28);

    g.fillStyle(golden ? 0xb45309 : 0x92400e, 1);
    g.fillCircle(cx, cy, T * 0.29);
    g.fillStyle(golden ? 0xfacc15 : 0xeab308, 1);
    g.fillCircle(cx, cy, T * 0.27);
    g.fillStyle(golden ? 0xfef9c3 : 0xfde047, 1);
    g.fillCircle(cx, cy, T * 0.2);
    g.fillStyle(0xfacc15, 1);
    g.fillRect(cx - 2, cy - T * 0.13, 4, T * 0.26);

    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(cx - T * 0.09, cy - T * 0.09, T * 0.06);

    // Tiny sparkle accent.
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(cx + T * 0.14, cy - T * 0.18, 2, 5);
    g.fillRect(cx + T * 0.11, cy - T * 0.155, 5, 2);

    if (golden) {
      // A second sparkle so it reads as clearly rarer than a normal coin.
      g.fillRect(cx - T * 0.22, cy + T * 0.08, 2, 5);
      g.fillRect(cx - T * 0.25, cy + T * 0.105, 5, 2);
    }

    g.lineStyle(1, golden ? 0xb45309 : 0x78350f, 0.7);
    g.strokeCircle(cx, cy, T * 0.29);
  }

  drawWaterDrop(g) {
    g.fillStyle(0x38bdf8, 1);
    g.fillCircle(4, 5, 3);
    g.fillStyle(0xbae6fd, 1);
    g.fillCircle(3, 4, 1.2);
  }
}
