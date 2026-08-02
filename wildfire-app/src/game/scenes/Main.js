import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../config.js';
import {
  waterCapacityMultiplier,
  moveSpeedMultiplier,
  hoseRangeRadius,
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
const LOSE_COVERAGE_RATIO = 0.6; // lose if fire covers this fraction of grass tiles

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
  }

  create() {
    this.buildGrid();
    this.buildPlayer();
    this.buildHud();
    this.buildInput();

    // Fire spreads on a timer, gets a bit faster each wave.
    const spreadDelay = Math.max(900 - this.state.wave * 60, 350);
    this.spreadTimer = this.time.addEvent({
      delay: spreadDelay,
      loop: true,
      callback: () => this.spreadFire(),
    });

    this.coinsGroup = this.physics.add.group();
    this.physics.add.overlap(this.player, this.coinsGroup, (_player, coin) => {
      this.state.coins += 10;
      coin.destroy();
      this.updateHud();
    });
  }

  // ---------- Grid setup ----------

  buildGrid() {
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      this.tileSprites[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row][col] = TILE_STATE.GRASS;
        const sprite = this.add.image(
          col * TILE_SIZE + TILE_SIZE / 2,
          row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT,
          'tile-grass'
        );
        this.tileSprites[row][col] = sprite;
      }
    }

    // Place a couple of refill stations away from the edges.
    this.setTile(2, 2, TILE_STATE.REFILL);
    this.setTile(GRID_ROWS - 3, GRID_COLS - 3, TILE_STATE.REFILL);

    // Seed initial fires. More fires each wave.
    // (This is also the hook point for seeding fires from real Supabase
    // reports — see fetchAndSeedFromReports() below.)
    const fireCount = Math.min(3 + this.state.wave, 12);
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
        ? 'tile-grass'
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

    const ignitions = [];
    const escalations = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = this.grid[row][col];
        if (tile === TILE_STATE.FIRE_SMALL) {
          // Chance to escalate to a large fire.
          if (Math.random() < 0.25) escalations.push([row, col]);
        }
        if (tile === TILE_STATE.FIRE_SMALL || tile === TILE_STATE.FIRE_LARGE) {
          const spreadChance = tile === TILE_STATE.FIRE_LARGE ? 0.35 : 0.18;
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

    escalations.forEach(([r, c]) => this.setTile(r, c, TILE_STATE.FIRE_LARGE));
    ignitions.forEach(([r, c]) => {
      if (this.grid[r][c] === TILE_STATE.GRASS) {
        this.setTile(r, c, TILE_STATE.FIRE_SMALL);
      }
    });

    this.checkLoseCondition();
  }

  checkLoseCondition() {
    let fireCount = 0;
    let totalTiles = GRID_ROWS * GRID_COLS;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (
          this.grid[row][col] === TILE_STATE.FIRE_SMALL ||
          this.grid[row][col] === TILE_STATE.FIRE_LARGE
        ) {
          fireCount++;
        }
      }
    }
    if (fireCount / totalTiles >= LOSE_COVERAGE_RATIO) {
      this.endGame(false);
    }
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
    this.hudText.setText(
      `Wave ${wave}   Coins: ${coins}   Water: ${Math.round(this.water)}/${Math.round(
        maxWater
      )}   [Space] spray`
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

    // Water regen (slow, unless standing on a refill tile).
    const maxWater = BASE_MAX_WATER * waterCapacityMultiplier(this.state.upgrades.waterCapacity);
    const onRefill = this.currentPlayerTile()?.state === TILE_STATE.REFILL;
    const regenRate = onRefill ? 40 : 5; // per second
    this.water = Math.min(maxWater, this.water + (regenRate * delta) / 1000);

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.spray();
    }

    this.updateHud();
    this.checkWinCondition();
  }

  currentPlayerTile() {
    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor((this.player.y - HUD_HEIGHT) / TILE_SIZE);
    if (!this.inBounds(row, col)) return null;
    return { row, col, state: this.grid[row][col] };
  }

  spray() {
    const cost = 15;
    if (this.water < cost) return;

    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor((this.player.y - HUD_HEIGHT) / TILE_SIZE);
    const radius = hoseRangeRadius(this.state.upgrades.hoseRange);

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

  spawnCoin(row, col) {
    const coin = this.coinsGroup.create(
      col * TILE_SIZE + TILE_SIZE / 2,
      row * TILE_SIZE + TILE_SIZE / 2 + HUD_HEIGHT,
      'coin'
    );
    coin.setImmovable(true);
    coin.body.setAllowGravity(false);
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
    this.player.setVelocity(0, 0);

    if (won) {
      this.state.wave += 1;
      this.time.delayedCall(400, () => this.scene.start('Shop'));
    } else {
      const { width, height } = this.scale;
      this.add
        .rectangle(0, 0, width, height, 0x000000, 0.7)
        .setOrigin(0, 0);
      this.add
        .text(width / 2, height / 2 - 20, 'FIRE OVERWHELMED THE AREA', {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#f87171',
          align: 'center',
        })
        .setOrigin(0.5);
      const retry = this.add
        .text(width / 2, height / 2 + 20, '[ RETRY FROM WAVE 1 ]', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#4ade80',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      retry.on('pointerdown', () => {
        this.state.coins = 0;
        this.state.wave = 1;
        this.state.upgrades = { hoseRange: 1, waterCapacity: 1, moveSpeed: 1 };
        this.scene.start('Main');
      });
    }
  }
}
