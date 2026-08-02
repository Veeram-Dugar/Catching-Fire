import Phaser from 'phaser';

export default class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'WILDFIRE\nSIMULATOR', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f97316',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, 'Arrow keys / WASD to move\nSpacebar to spray water', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(width / 2, height / 2 + 80, '[ START ]', {
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
