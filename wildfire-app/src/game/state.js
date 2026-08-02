// Simple shared mutable state for the whole game session.
// Read/written by Main.js and Shop.js via Phaser's scene registry
// (see Boot.js, where this gets attached to game.registry).

export function createInitialState() {
  return {
    coins: 0,
    wave: 1,
    upgrades: {
      hoseRange: 1, // tiles of radius per level
      waterCapacity: 1, // multiplier on max water
      moveSpeed: 1, // multiplier on player speed
    },
  };
}

export const UPGRADE_COSTS = {
  hoseRange: (level) => 20 + level * 15,
  waterCapacity: (level) => 15 + level * 10,
  moveSpeed: (level) => 15 + level * 10,
};

export const MAX_UPGRADE_LEVEL = 5;

// Levels are stored as raw ints (1-5) but effects scale sub-linearly so a
// maxed-out run stays strong without trivializing later waves.
export function waterCapacityMultiplier(level) {
  return 1 + (level - 1) * 0.25; // Lv.1 -> 1x, Lv.5 -> 2x
}

export function moveSpeedMultiplier(level) {
  return 1 + (level - 1) * 0.15; // Lv.1 -> 1x, Lv.5 -> 1.6x
}

export function hoseRangeRadius(level) {
  return 1 + Math.floor((level - 1) / 2); // Lv.1-2 -> 1 tile, Lv.3-4 -> 2, Lv.5 -> 3
}
