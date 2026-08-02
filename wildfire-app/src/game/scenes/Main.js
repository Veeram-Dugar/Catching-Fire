import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS, GRASS_VARIANT_COUNT } from '../config.js';
import {
  waterCapacityMultiplier,
  moveSpeedMultiplier,
  hoseRangeRadius,
  sprayCostMultiplier,
  coinMagnetRadius,
  coinValue,
  emberShieldCharges,
  fireRetardantMultiplier,
  waterRegenPerSecond,
  sprinklerIntervalMs,
  createInitialUpgrades,
  recordBestWave,
  BIG_SHOP_INTERVAL,
} from '../state.js';

const TILE_STATE = {
  GRASS: 'grass',
  FIRE_SMALL: 'fire-small',
  FIRE_LARGE: 'fire-large',
  FIRE_INFERNO: 'fire-inferno',
  REFILL: 'refill',
};

function isFireTile(tile) {
  return (
    tile === TILE_STATE.FIRE_SMALL ||
    tile === TILE_STATE.FIRE_LARGE ||
    tile === TILE_STATE.FIRE_INFERNO
  );
}

const HUD_HEIGHT = 64;
const BASE_MAX_WATER = 120;
const BASE_MOVE_SPEED = 160;
const BASE_SPRAY_COST = 15;
const LOSE_COVERAGE_RATIO = 0.72; // lose if fire covers this fraction of grass tiles
const DANGER_WARNING_RATIO = LOSE_COVERAGE_RATIO * 0.65; // shows a warning before it's too late
const INFERNO_UNLOCK_WAVE = 12; // waves before this never escalate past FIRE_LARGE

const COMBO_WINDOW_MS = 2000; // kills within this long of the last one keep the streak alive
const COMBO_MULTIPLIER_CAP = 3;
const GOLDEN_COIN_CHANCE = 0.08;
const GOLDEN_COIN_MULTIPLIER = 3;

// The first EASY_WAVES stay nearly flat so new runs have room to breathe;
// difficulty only starts compounding exponentially after that, capped so
// it stays hard-but-survivable rather than spiraling into "impossible."
const EASY_WAVES = 5;

function fireCountForWave(wave) {
  if (wave <= EASY_WAVES) {
    return 2 + Math.floor((wave - 1) / 3); // wave1: 2 ... wave5: 3
  }
  const overflow = wave - EASY_WAVES;
  return Math.min(3 + Math.round(Math.pow(1.14, overflow)), 30);
}

function spreadDelayForWave(wave) {
  if (wave <= EASY_WAVES) {
    return 900 - (wave - 1) * 10; // wave1: 900ms ... wave5: 860ms
  }
  const overflow = wave - EASY_WAVES;
  return Math.max(860 * Math.pow(0.93, overflow), 350);
}

export default class Main extends Phaser.Scene {
  constructor() {
    super('Main');
  }

  init() {
    this.state = this.game.registry.get('state');
    this.grid = []; // 2D array of TILE_STATE
    this.tileSprites = []; // 2D array of Phaser images mirroring `grid`
    this.water = BASE_MAX_WATER * waterCapacityMultiplier(this.state.upgrades.waterCapacity);
    this.gameOver = false;
    // Ember Shield charges refill at the start of every wave.
    this.shieldCharges = emberShieldCharges(this.state.upgrades.emberShield);
    this.comboCount = 0;
    this.lastKillTime = -Infinity;
  }

  create() {
    this.buildGrid();
    this.buildPlayer();
    this.buildHud();
    this.buildInput();

    // Fire spreads on a timer, gets exponentially faster each wave.
    this.spreadTimer = this.time.addEvent({
      delay: spreadDelayForWave(this.state.wave),
      loop: true,
      callback: () => this.spreadFire(),
    });

    // Sprinkler Drone: passively auto-extinguishes fires on its own timer.
    const sprinklerInterval = sprinklerIntervalMs(this.state.upgrades.sprinklerDrone);
    if (sprinklerInterval) {
      this.sprinklerTimer = this.time.addEvent({
        delay: sprinklerInterval,
        loop: true,
        callback: () => this.sprinklerTick(),
      });
    }

    this.coinsGroup = this.physics.add.group();

    this.sprayParticles = this.add.particles(0, 0, 'water-drop', {
      lifespan: 260,
      speed: { min: 80, max: 220 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 1, end: 0 },
      gravityY: 220,
      emitting: false,
    });
    this.sprayParticles.setDepth(5);
  }

  // ---------- Grid setup ----------

  buildGrid() {
    this.grassVariant = []; // 2D array; each grass tile keeps its texture variant
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.tileSprites[row] = [];
      this.grassVariant[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row][col] = TILE_STATE.GRASS;
        this.grassVariant[row][col] = Phaser.Math.Between(0, GRASS_VARIANT_COUNT - 1);
        const sprite = this.add.image(
          col * TILE_SIZE + TILE_SIZE / 2,
          row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT,
          `tile-grass-${this.grassVariant[row][col]}`
        );
        this.tileSprites[row][col] = sprite;
      }
    }

    // Place a couple of refill stations away from the edges.
    this.setTile(2, 2, TILE_STATE.REFILL);
    this.setTile(GRID_ROWS - 3, GRID_COLS - 3, TILE_STATE.REFILL);

    // Seed initial fires at random, growing exponentially with wave.
    // Stretch goal: seed from real Supabase reports instead of random
    // placement (not yet implemented — see README's "stretch goals").
    const fireCount = fireCountForWave(this.state.wave);
    let placed = 0;
    while (placed < fireCount) {
      const row = Phaser.Math.Between(0, GRID_ROWS - 1);
      const col = Phaser.Math.Between(0, GRID_COLS - 1);
      if (this.grid[row][col] === TILE_STATE.GRASS) {
        this.setTile(row, col, TILE_STATE.FIRE_SMALL);
        placed++;
      }
    }
  }

  setTile(row, col, newState) {
    this.grid[row][col] = newState;
    const key =
      newState === TILE_STATE.GRASS
        ? `tile-grass-${this.grassVariant[row][col]}`
        : newState === TILE_STATE.FIRE_SMALL
        ? 'tile-fire-small'
        : newState === TILE_STATE.FIRE_LARGE
        ? 'tile-fire-large'
        : newState === TILE_STATE.FIRE_INFERNO
        ? 'tile-fire-inferno'
        : 'tile-refill';
    this.tileSprites[row][col].setTexture(key);
  }

  /**
   * Knocks a fire tile down by one stage (inferno -> large -> small ->
   * grass). Returns true if the tile was fully extinguished this call, so
   * the caller can decide whether to reward a coin for it.
   */
  extinguishStep(row, col, { spawnCoin = false } = {}) {
    const tile = this.grid[row][col];
    if (tile === TILE_STATE.FIRE_INFERNO) {
      this.setTile(row, col, TILE_STATE.FIRE_LARGE);
      return false;
    }
    if (tile === TILE_STATE.FIRE_LARGE) {
      this.setTile(row, col, TILE_STATE.FIRE_SMALL);
      return false;
    }
    if (tile === TILE_STATE.FIRE_SMALL) {
      this.setTile(row, col, TILE_STATE.GRASS);
      if (spawnCoin) this.spawnCoin(row, col);
      return true;
    }
    return false;
  }

  inBounds(row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
  }

  // ---------- Fire spread ----------

  spreadFire() {
    if (this.gameOver) return;

    const retardant = fireRetardantMultiplier(this.state.upgrades.fireRetardant);
    const infernoUnlocked = this.state.wave >= INFERNO_UNLOCK_WAVE;

    // Escalate first so a tile that grows this tick already spreads at
    // its new, faster rate below, not its old one.
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.grid[row][col];
        if (tile === TILE_STATE.FIRE_SMALL && Math.random() < 0.16 * retardant) {
          this.setTile(row, col, TILE_STATE.FIRE_LARGE);
        } else if (
          infernoUnlocked &&
          tile === TILE_STATE.FIRE_LARGE &&
          Math.random() < 0.1 * retardant
        ) {
          this.setTile(row, col, TILE_STATE.FIRE_INFERNO);
        }
      }
    }

    const ignitions = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.grid[row][col];
        if (isFireTile(tile)) {
          const spreadChance =
            (tile === TILE_STATE.FIRE_INFERNO
              ? 0.32
              : tile === TILE_STATE.FIRE_LARGE
              ? 0.26
              : 0.11) * retardant;
          const neighbors = [
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1],
          ];
          for (const [nr, nc] of neighbors) {
            if (!this.inBounds(nr, nc)) continue;
            if (this.grid[nr][nc] === TILE_STATE.GRASS && Math.random() < spreadChance) {
              ignitions.push([nr, nc]);
            }
          }
        }
      }
    }

    ignitions.forEach(([r, c]) => {
      if (this.grid[r][c] === TILE_STATE.GRASS) {
        this.setTile(r, c, TILE_STATE.FIRE_SMALL);
      }
    });

    this.checkLoseCondition();
  }

  checkLoseCondition() {
    const fireTiles = [];
    const totalTiles = GRID_ROWS * GRID_COLS;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isFireTile(this.grid[row][col])) {
          fireTiles.push([row, col]);
        }
      }
    }

    const coverage = fireTiles.length / totalTiles;
    this.dangerText.setVisible(coverage >= DANGER_WARNING_RATIO);

    if (coverage < LOSE_COVERAGE_RATIO) return;

    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.triggerEmberShield(fireTiles);
      return;
    }

    this.endGame(false);
  }

  triggerEmberShield(fireTiles) {
    // Knock out roughly half of the current fire to buy breathing room —
    // a save, not a full clear, so the wave still needs finishing.
    const toClear = Phaser.Utils.Array.Shuffle(fireTiles.slice()).slice(
      0,
      Math.ceil(fireTiles.length / 2)
    );
    toClear.forEach(([r, c]) => this.setTile(r, c, TILE_STATE.GRASS));
    this.dangerText.setVisible(false);

    const msg = this.add
      .text(this.scale.width / 2, HUD_HEIGHT + 24, 'EMBER SHIELD ACTIVATED!', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#7dd3fc',
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: msg,
      y: msg.y - 20,
      alpha: 0,
      duration: 1200,
      onComplete: () => msg.destroy(),
    });
  }

  sprinklerTick() {
    if (this.gameOver) return;

    const fireTiles = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isFireTile(this.grid[row][col])) {
          fireTiles.push([row, col]);
        }
      }
    }
    if (fireTiles.length === 0) return;

    // Knocks a fire down one stage rather than clearing it outright, so a
    // low-level drone can't trivially delete a tough inferno fire in one hit.
    const [r, c] = Phaser.Utils.Array.GetRandom(fireTiles);
    this.extinguishStep(r, c, { spawnCoin: false });
    this.sprayParticles.explode(
      6,
      c * TILE_SIZE + TILE_SIZE / 2,
      r * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT
    );
  }

  // ---------- Player ----------

  buildPlayer() {
    this.player = this.physics.add.sprite(
      TILE_SIZE * 1.5,
      HUD_HEIGHT + TILE_SIZE * 1.5,
      'player'
    );
    this.player.setCollideWorldBounds(true);
    this.player.body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(0, HUD_HEIGHT, this.scale.width, this.scale.height - HUD_HEIGHT)
    );
  }

  buildInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // ---------- HUD ----------

  buildHud() {
    this.add.rectangle(0, 0, this.scale.width, HUD_HEIGHT, 0x0b1020).setOrigin(0, 0);
    this.hudText = this.add.text(10, 8, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e2e8f0',
    });
    this.dangerText = this.add
      .text(10, 34, '⚠ FIRE SPREADING FAST — keep spraying!', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f87171',
      })
      .setVisible(false);
    this.updateHud();
  }

  updateHud() {
    const { coins, wave, upgrades } = this.state;
    const maxWater = BASE_MAX_WATER * waterCapacityMultiplier(upgrades.waterCapacity);
    const shieldText = upgrades.emberShield > 0 ? `   Shield: ${this.shieldCharges}` : '';
    const comboActive =
      this.comboCount >= 2 && this.time.now - this.lastKillTime <= COMBO_WINDOW_MS;
    const comboText = comboActive ? `   Combo x${this.comboCount}` : '';
    this.hudText.setText(
      `Wave ${wave}   Coins: ${coins}   Water: ${Math.round(this.water)}/${Math.round(
        maxWater
      )}${shieldText}${comboText}   [Space] spray`
    );
  }

  // ---------- Update loop ----------

  update(_time, delta) {
    if (this.gameOver) return;

    const speed = BASE_MOVE_SPEED * moveSpeedMultiplier(this.state.upgrades.moveSpeed);
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= speed;
    if (right) vx += speed;
    if (up) vy -= speed;
    if (down) vy += speed;
    this.player.setVelocity(vx, vy);
    if (vx !== 0) this.player.setFlipX(vx < 0);

    // Water regen (slow, unless standing on a refill tile).
    const maxWater = BASE_MAX_WATER * waterCapacityMultiplier(this.state.upgrades.waterCapacity);
    const onRefill = this.currentPlayerTile()?.state === TILE_STATE.REFILL;
    const regenRate = onRefill ? 40 : waterRegenPerSecond(this.state.upgrades.waterRegen); // per second
    this.water = Math.min(maxWater, this.water + (regenRate * delta) / 1000);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.spray();
    }

    this.collectNearbyCoins();
    this.updateHud();
    this.checkWinCondition();
  }

  collectNearbyCoins() {
    const radius = coinMagnetRadius(this.state.upgrades.coinMagnet);
    this.coinsGroup
      .getChildren()
      .slice()
      .forEach((coin) => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y);
        if (dist <= radius) {
          this.state.coins += coin.value ?? 6;
          coin.destroy();
        }
      });
  }

  currentPlayerTile() {
    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor((this.player.y - HUD_HEIGHT) / TILE_SIZE);
    if (!this.inBounds(row, col)) return null;
    return { row, col, state: this.grid[row][col] };
  }

  spray() {
    const cost = BASE_SPRAY_COST * sprayCostMultiplier(this.state.upgrades.sprayEfficiency);
    if (this.water < cost) return;

    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor((this.player.y - HUD_HEIGHT) / TILE_SIZE);
    const radius = hoseRangeRadius(this.state.upgrades.hoseRange);

    this.playSprayEffect(radius);

    let hitSomething = false;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (!this.inBounds(r, c)) continue;
        if (isFireTile(this.grid[r][c])) {
          this.extinguishStep(r, c, { spawnCoin: true });
          hitSomething = true;
        }
      }
    }

    if (hitSomething) {
      this.water -= cost;
    }
  }

  playSprayEffect(radiusTiles) {
    const reachPx = (radiusTiles + 0.5) * TILE_SIZE;

    // Expanding ring shows how far the hose just reached.
    const ring = this.add.circle(this.player.x, this.player.y, 4, 0x38bdf8, 0.3);
    ring.setStrokeStyle(2, 0x7dd3fc, 0.8);
    ring.setDepth(4);
    this.tweens.add({
      targets: ring,
      radius: reachPx,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Burst of water droplets from the nozzle.
    this.sprayParticles.explode(14, this.player.x, this.player.y);
  }

  spawnCoin(row, col) {
    // Kills within COMBO_WINDOW_MS of each other chain a coin multiplier.
    const now = this.time.now;
    this.comboCount = now - this.lastKillTime <= COMBO_WINDOW_MS ? this.comboCount + 1 : 1;
    this.lastKillTime = now;
    const comboMultiplier = Math.min(1 + (this.comboCount - 1) * 0.5, COMBO_MULTIPLIER_CAP);

    const golden = Math.random() < GOLDEN_COIN_CHANCE;
    const baseValue = coinValue(this.state.upgrades.coinMagnet);
    const value = Math.round(baseValue * (golden ? GOLDEN_COIN_MULTIPLIER : 1) * comboMultiplier);

    const coin = this.coinsGroup.create(
      col * TILE_SIZE + TILE_SIZE / 2,
      row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT,
      golden ? 'coin-golden' : 'coin'
    );
    coin.setImmovable(true);
    coin.body.setAllowGravity(false);
    coin.value = value;

    if (golden || this.comboCount >= 2) {
      this.showKillPopup(row, col, golden ? 'GOLDEN!' : `x${this.comboCount} COMBO`, golden);
    }
  }

  showKillPopup(row, col, label, golden) {
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT;
    const text = this.add
      .text(x, y - 14, label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: golden ? '#fde047' : '#4ade80',
      })
      .setOrigin(0.5)
      .setDepth(6);
    this.tweens.add({
      targets: text,
      y: y - 34,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy(),
    });
  }

  // ---------- Win / lose ----------

  checkWinCondition() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (isFireTile(this.grid[row][col])) {
          return; // fires remain
        }
      }
    }
    this.endGame(true);
  }

  endGame(won) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.spreadTimer.remove(false);
    this.sprinklerTimer?.remove(false);
    this.player.setVelocity(0, 0);

    if (won) {
      // A full paid shop appears every Nth wave; otherwise a free draft.
      // Neither scene increments `state.wave` until "next wave" is
      // clicked, so the "WAVE X CLEARED" title shows the wave just won.
      const nextScene = this.state.wave % BIG_SHOP_INTERVAL === 0 ? 'BigShop' : 'Shop';
      this.time.delayedCall(400, () => this.scene.start(nextScene));
    } else {
      recordBestWave(this.state.wave);

      const { width, height } = this.scale;
      this.add
        .rectangle(0, 0, width, height, 0x000000, 0.7)
        .setOrigin(0, 0);
      this.add
        .text(width / 2, height / 2 - 30, 'FIRE OVERWHELMED THE AREA', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#f87171',
          align: 'center',
        })
        .setOrigin(0.5);
      this.add
        .text(width / 2, height / 2, `You reached Wave ${this.state.wave}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#94a3b8',
        })
        .setOrigin(0.5);
      const retry = this.add
        .text(width / 2, height / 2 + 30, '[ RETRY FROM WAVE 1 ]', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#4ade80',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      retry.on('pointerdown', () => {
        this.state.coins = 0;
        this.state.wave = 1;
        this.state.upgrades = createInitialUpgrades();
        this.scene.start('Main');
      });
    }
  }
}
