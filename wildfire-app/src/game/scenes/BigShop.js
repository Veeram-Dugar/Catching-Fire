import Phaser from 'phaser';
import { UPGRADE_LABELS, UPGRADE_COSTS, UPGRADE_MAX_LEVEL } from '../state.js';
import { drawPanel } from '../ui.js';

// The full paid shop, shown every BIG_SHOP_INTERVAL waves (see state.js)
// so coins saved between free drafts have somewhere meaningful to go —
// unlike the draft in Shop.js, you can buy exactly what you want here,
// and buy more than one upgrade if you've saved enough.
export default class BigShop extends Phaser.Scene {
  constructor() {
    super('BigShop');
  }

  init() {
    this.state = this.game.registry.get('state');
  }

  create() {
    const { width } = this.scale;

    drawPanel(this, width / 2 - 180, 10, 360, 450, 0xfde047);

    this.add
      .text(width / 2, 30, `WAVE ${this.state.wave} CLEARED`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#4ade80',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 52, 'SUPPLY DROP — spend your coins', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fde047',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, 74, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fde047',
      })
      .setOrigin(0.5);

    this.rows = {};
    let y = 104;
    for (const key of Object.keys(UPGRADE_LABELS)) {
      this.rows[key] = this.buildRow(key, y);
      y += 34;
    }

    const continueBtn = this.add
      .text(width / 2, y + 20, '[ NEXT WAVE ]', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    continueBtn.on('pointerdown', () => {
      this.state.wave += 1;
      this.scene.start('Main');
    });

    this.refresh();
  }

  buildRow(key, y) {
    const { width } = this.scale;
    const label = this.add.text(width / 2 - 190, y, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e2e8f0',
    });
    const buyBtn = this.add
      .text(width / 2 + 140, y, '[ BUY ]', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4ade80',
      })
      .setInteractive({ useHandCursor: true });

    buyBtn.on('pointerdown', () => this.buyUpgrade(key));

    return { label, buyBtn };
  }

  buyUpgrade(key) {
    const level = this.state.upgrades[key];
    if (level >= UPGRADE_MAX_LEVEL[key]) return;

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
      const maxed = level >= UPGRADE_MAX_LEVEL[key];
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
