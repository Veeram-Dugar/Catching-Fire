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
  REFILL: 'refill',
};

const HUD_HEIGHT = 64;
const BASE_MAX_WATER = 120;
const BASE_MOVE_SPEED = 160;
const BASE_SPRAY_COST = 15;
const LOSE_COVERAGE_RATIO = 0.72; // lose if fire covers this fraction of grass tiles

// The first EASY_WAVES stay nearly flat so new runs have room to breathe;
// difficulty only starts compounding exponentially after that, capped so
// it stays hard-but-survivable rather than spiraling into "impossible."
const EASY_WAVES = 15;

function fireCountForWave(wave) {
  if (wave <= EASY_WAVES) {
    return 2 + Math.floor((wave - 1) / 3); // wave1: 2 ... wave15: 6
  }
  const overflow = wave - EASY_WAVES;
  return Math.min(6 + Math.round(Math.pow(1.14, overflow)), 30);
}

function spreadDelayForWave(wave) {
  if (wave <= EASY_WAVES) {
    return 900 - (wave - 1) * 10; // wave1: 900ms ... wave15: 760ms
  }
  const overflow = wave - EASY_WAVES;
  return Math.max(760 * Math.pow(0.93, overflow), 350);
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
        : 'tile-refill';
    this.tileSprites[row][col].setTexture(key);
  }

  inBounds(row, col) {
    return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
  }

  // ---------- Fire spread ----------

  spreadFire() {
    if (this.gameOver) return;

    const retardant = fireRetardantMultiplier(this.state.upgrades.fireRetardant);

    // Escalate first so a tile that grows into a large fire this tick
    // already spreads at the large-fire rate below, not the small one.
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.grid[row][col] === TILE_STATE.FIRE_SMALL && Math.random() < 0.16 * retardant) {
          this.setTile(row, col, TILE_STATE.FIRE_LARGE);
        }
      }
    }

    const ignitions = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.grid[row][col];
        if (tile === TILE_STATE.FIRE_SMALL || tile === TILE_STATE.FIRE_LARGE) {
          const spreadChance = (tile === TILE_STATE.FIRE_LARGE ? 0.26 : 0.11) * retardant;
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
        if (
          this.grid[row][col] === TILE_STATE.FIRE_SMALL ||
          this.grid[row][col] === TILE_STATE.FIRE_LARGE
        ) {
          fireTiles.push([row, col]);
        }
      }
    }

    if (fireTiles.length / totalTiles < LOSE_COVERAGE_RATIO) return;

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
        if (
          this.grid[row][col] === TILE_STATE.FIRE_SMALL ||
          this.grid[row][col] === TILE_STATE.FIRE_LARGE
        ) {
          fireTiles.push([row, col]);
        }
      }
    }
    if (fireTiles.length === 0) return;

    const [r, c] = Phaser.Utils.Array.GetRandom(fireTiles);
    this.setTile(r, c, TILE_STATE.GRASS);
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
    this.updateHud();
  }

  updateHud() {
    const { coins, wave, upgrades } = this.state;
    const maxWater = BASE_MAX_WATER * waterCapacityMultiplier(upgrades.waterCapacity);
    const shieldText = upgrades.emberShield > 0 ? `   Shield: ${this.shieldCharges}` : '';
    this.hudText.setText(
      `Wave ${wave}   Coins: ${coins}   Water: ${Math.round(this.water)}/${Math.round(
        maxWater
      )}${shieldText}   [Space] spray`
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
          this.state.coins += coin.value ?? 10;
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
        const tile = this.grid[r][c];
        if (tile === TILE_STATE.FIRE_LARGE) {
          this.setTile(r, c, TILE_STATE.FIRE_SMALL);
          hitSomething = true;
        } else if (tile === TILE_STATE.FIRE_SMALL) {
          this.setTile(r, c, TILE_STATE.GRASS);
          this.spawnCoin(r, c);
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
    const coin = this.coinsGroup.create(
      col * TILE_SIZE + TILE_SIZE / 2,
      row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT,
      'coin'
    );
    coin.setImmovable(true);
    coin.body.setAllowGravity(false);
    coin.value = coinValue(this.state.upgrades.coinMagnet);
  }

  // ---------- Win / lose ----------

  checkWinCondition() {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (
          this.grid[row][col] === TILE_STATE.FIRE_SMALL ||
          this.grid[row][col] === TILE_STATE.FIRE_LARGE
        ) {
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
