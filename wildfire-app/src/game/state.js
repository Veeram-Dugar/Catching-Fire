// Shared mutable state for the whole game session, read/written by Main.js
// and Shop.js via Phaser's scene registry (see Boot.js, where this gets
// attached to game.registry). Also holds small localStorage-backed
// roguelite meta stats (best wave reached) that persist across runs.

export function createInitialState() {
  return {
    coins: 0,
    wave: 1,
    upgrades: createInitialUpgrades(),
  };
}

export function createInitialUpgrades() {
  return {
    hoseRange: 1, // tiles of radius per level
    waterCapacity: 1, // multiplier on max water
    moveSpeed: 1, // multiplier on player speed
    sprayEfficiency: 1, // multiplier on water cost per spray (lower is cheaper)
    coinMagnet: 1, // pickup radius + coin value
    emberShield: 0, // wave-saving charges per wave; starts unowned
  };
}

export const UPGRADE_LABELS = {
  hoseRange: 'Hose Range',
  waterCapacity: 'Water Tank',
  moveSpeed: 'Boots',
  sprayEfficiency: 'Nozzle Tuning',
  coinMagnet: 'Coin Magnet',
  emberShield: 'Ember Shield',
};

export const UPGRADE_DESCRIPTIONS = {
  hoseRange: 'Wider spray radius',
  waterCapacity: 'More max water',
  moveSpeed: 'Move faster',
  sprayEfficiency: 'Cheaper sprays',
  coinMagnet: 'Bigger pickup range + coin value',
  emberShield: 'Auto-save a wave from disaster',
};

export const UPGRADE_MAX_LEVEL = {
  hoseRange: 8,
  waterCapacity: 8,
  moveSpeed: 8,
  sprayEfficiency: 8,
  coinMagnet: 8,
  emberShield: 3,
};

export const UPGRADE_COSTS = {
  hoseRange: (level) => 15 + level * 12,
  waterCapacity: (level) => 12 + level * 8,
  moveSpeed: (level) => 12 + level * 8,
  sprayEfficiency: (level) => 12 + level * 8,
  coinMagnet: (level) => 10 + level * 7,
  emberShield: (level) => 35 + level * 30,
};

// Levels scale sub-linearly and cap at UPGRADE_MAX_LEVEL so a maxed-out
// run stays strong without trivializing later waves.
export function waterCapacityMultiplier(level) {
  return 1 + (level - 1) * 0.18; // Lv.1 -> 1x, Lv.8 -> ~2.26x
}

export function moveSpeedMultiplier(level) {
  return 1 + (level - 1) * 0.1; // Lv.1 -> 1x, Lv.8 -> 1.7x
}

export function hoseRangeRadius(level) {
  return 1 + Math.floor((level - 1) / 2); // Lv.1-2 -> 1 tile, ... Lv.7-8 -> 4
}

export function sprayCostMultiplier(level) {
  return Math.max(0.6, 1 - (level - 1) * 0.06); // Lv.1 -> 1x, Lv.8 -> 0.6x
}

export function coinMagnetRadius(level) {
  return 20 + (level - 1) * 10; // px, Lv.1 -> 20, Lv.8 -> 90
}

export function coinValue(level) {
  return 10 + (level - 1) * 2; // Lv.1 -> 10, Lv.8 -> 24
}

export function emberShieldCharges(level) {
  return level; // 0 (unowned) .. 3
}

// ---------- Roguelite draft helpers ----------

/** Picks up to `count` distinct, not-yet-maxed upgrade keys at random. */
export function drawUpgradeOptions(upgrades, count = 3) {
  const pool = Object.keys(UPGRADE_LABELS).filter(
    (key) => upgrades[key] < UPGRADE_MAX_LEVEL[key]
  );
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

// ---------- Persistent meta stats (best wave reached) ----------

const BEST_WAVE_KEY = 'catching-fire:best-wave';

export function getBestWave() {
  try {
    return Number(window.localStorage.getItem(BEST_WAVE_KEY)) || 0;
  } catch {
    return 0; // localStorage unavailable (e.g. private mode) — not critical.
  }
}

export function recordBestWave(wave) {
  try {
    if (wave > getBestWave()) {
      window.localStorage.setItem(BEST_WAVE_KEY, String(wave));
    }
  } catch {
    // Ignore — best-wave tracking is a nice-to-have, not required to play.
  }
}
