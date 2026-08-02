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
