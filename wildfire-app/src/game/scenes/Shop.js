import Phaser from 'phaser';
import { UPGRADE_LABELS, UPGRADE_DESCRIPTIONS, drawUpgradeOptions } from '../state.js';

const REROLL_BASE_COST = 12;

export default class Shop extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init() {
    this.state = this.game.registry.get('state');
    this.picked = false;
  }

  create() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 36, `WAVE ${this.state.wave} CLEARED`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#4ade80',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 60, 'Choose one upgrade — it\'s free', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.coinsText = this.add
      .text(width / 2, 82, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fde047',
      })
      .setOrigin(0.5);

    this.cardRows = [];
    this.options = drawUpgradeOptions(this.state.upgrades, 3);
    this.buildCards();

    this.rerollBtn = this.add
      .text(width / 2, 320, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.rerollBtn.on('pointerdown', () => this.reroll());

    this.continueBtn = this.add
      .text(width / 2, 360, '[ NEXT WAVE ]', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.continueBtn.on('pointerdown', () => this.scene.start('Main'));

    this.refresh();
  }

  buildCards() {
    const { width } = this.scale;
    let y = 120;
    for (const key of this.options) {
      const label = this.add
        .text(width / 2, y, '', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#e2e8f0',
          align: 'center',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(width / 2, y + 18, UPGRADE_DESCRIPTIONS[key], {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#64748b',
        })
        .setOrigin(0.5);
      const takeBtn = this.add
        .text(width / 2, y + 38, '[ TAKE IT ]', {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#4ade80',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      takeBtn.on('pointerdown', () => this.take(key));

      this.cardRows.push({ key, label, desc, takeBtn });
      y += 62;
    }
  }

  take(key) {
    if (this.picked) return;
    this.state.upgrades[key] += 1;
    this.lastPicked = key;
    this.picked = true;
    this.refresh();
  }

  reroll() {
    if (this.picked) return;
    const cost = this.rerollCost();
    if (this.state.coins < cost) return;
    this.state.coins -= cost;
    this.options = drawUpgradeOptions(this.state.upgrades, 3);
    this.clearCards();
    this.buildCards();
    this.refresh();
  }

  rerollCost() {
    return REROLL_BASE_COST + this.state.wave * 2;
  }

  clearCards() {
    for (const row of this.cardRows) {
      row.label.destroy();
      row.desc.destroy();
      row.takeBtn.destroy();
    }
    this.cardRows = [];
  }

  refresh() {
    this.coinsText.setText(`Coins: ${this.state.coins}`);

    for (const row of this.cardRows) {
      const level = this.state.upgrades[row.key];
      row.label.setText(`${UPGRADE_LABELS[row.key]}  Lv.${level} -> Lv.${level + 1}`);

      if (this.picked) {
        row.takeBtn.disableInteractive();
        row.takeBtn.setColor('#64748b');
        row.takeBtn.setText(row.key === this.lastPicked ? '[ TAKEN ]' : '[ ---- ]');
      }
    }

    if (this.options.length === 0) {
      // Every upgrade is maxed out — nothing left to draft.
      this.clearCards();
      this.add
        .text(this.scale.width / 2, 160, 'ALL UPGRADES MAXED', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#4ade80',
        })
        .setOrigin(0.5);
      this.picked = true;
    }

    const cost = this.rerollCost();
    const canReroll = !this.picked && this.state.coins >= cost && this.options.length > 0;
    this.rerollBtn.setVisible(!this.picked && this.options.length > 0);
    this.rerollBtn.setText(`[ REROLL: ${cost} coins ]`);
    this.rerollBtn.setColor(canReroll ? '#38bdf8' : '#475569');
    if (canReroll) {
      this.rerollBtn.setInteractive({ useHandCursor: true });
    } else {
      this.rerollBtn.disableInteractive();
    }

    this.continueBtn.setVisible(this.picked);
  }
}
