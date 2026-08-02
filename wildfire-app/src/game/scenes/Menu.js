import Phaser from 'phaser';
import { getBestWave } from '../state.js';

export default class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 70, 'CATCHING\nFIRE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f97316',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2, 'Arrow keys / WASD to move\nSpacebar to spray water\nClear waves to draft free upgrades', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    const bestWave = getBestWave();
    if (bestWave > 0) {
      this.add
        .text(width / 2, height / 2 + 46, `Best wave: ${bestWave}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#fde047',
        })
        .setOrigin(0.5);
    }

    const startButton = this.add
      .text(width / 2, height / 2 + 90, '[ START ]', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.scene.start('Main'));
    startButton.on('pointerover', () => startButton.setColor('#86efac'));
    startButton.on('pointerout', () => startButton.setColor('#4ade80'));

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Main'));
  }
}
