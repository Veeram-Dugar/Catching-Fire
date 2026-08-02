import Phaser from 'phaser';
import { UPGRADE_COSTS, MAX_UPGRADE_LEVEL } from '../state.js';

const UPGRADE_LABELS = {
  hoseRange: 'Hose Range',
  waterCapacity: 'Water Capacity',
  moveSpeed: 'Move Speed',
};

export default class Shop extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init() {
    this.state = this.game.registry.get('state');
  }

  create() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 40, `WAVE ${this.state.wave} CLEARED`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#4ade80',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, 75, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fde047',
      })
      .setOrigin(0.5);

    this.rows = {};
    let y = 130;
    for (const key of Object.keys(UPGRADE_LABELS)) {
      this.rows[key] = this.buildUpgradeRow(key, y);
      y += 70;
    }

    const continueBtn = this.add
      .text(width / 2, y + 20, '[ NEXT WAVE ]', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    continueBtn.on('pointerdown', () => this.scene.start('Main'));

    this.refresh();
  }

  buildUpgradeRow(key, y) {
    const { width } = this.scale;
    const label = this.add.text(width / 2 - 180, y, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e2e8f0',
    });
    const buyBtn = this.add
      .text(width / 2 + 120, y, '[ BUY ]', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#4ade80',
      })
      .setInteractive({ useHandCursor: true });

    buyBtn.on('pointerdown', () => this.buyUpgrade(key));

    return { label, buyBtn };
  }

  buyUpgrade(key) {
    const level = this.state.upgrades[key];
    if (level >= MAX_UPGRADE_LEVEL) return;

    const cost = UPGRADE_COSTS[key](level);
    if (this.state.coins < cost) return;

    this.state.coins -= cost;
    this.state.upgrades[key] += 1;
    this.refresh();
  }

  refresh() {
    this.coinsText.setText(`Coins: ${this.state.coins}`);

    for (const [key, row] of Object.entries(this.rows)) {
      const level = this.state.upgrades[key];
      const maxed = level >= MAX_UPGRADE_LEVEL;
      const cost = maxed ? null : UPGRADE_COSTS[key](level);

      row.label.setText(
        `${UPGRADE_LABELS[key]}  Lv.${level}${maxed ? ' (MAX)' : `   Cost: ${cost}`}`
      );

      if (maxed) {
        row.buyBtn.setText('[ MAX ]');
        row.buyBtn.setColor('#64748b');
      } else if (this.state.coins < cost) {
        row.buyBtn.setText('[ BUY ]');
        row.buyBtn.setColor('#64748b');
      } else {
        row.buyBtn.setText('[ BUY ]');
        row.buyBtn.setColor('#4ade80');
      }
    }
  }
}
