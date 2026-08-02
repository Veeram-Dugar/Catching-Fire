import Phaser from 'phaser';
import { getBestWave, BIG_SHOP_INTERVAL, DIFFICULTY } from '../state.js';
import { drawPanel } from '../ui.js';

const DIFFICULTY_ORDER = [DIFFICULTY.EASY, DIFFICULTY.NORMAL, DIFFICULTY.HARD];
const DIFFICULTY_LABEL = {
  [DIFFICULTY.EASY]: 'EASY',
  [DIFFICULTY.NORMAL]: 'NORMAL',
  [DIFFICULTY.HARD]: 'HARD',
};

export default class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.scale;

    drawPanel(this, width / 2 - 170, 90, 340, 340, 0xf97316);

    this.add
      .text(width / 2, height / 2 - 110, 'CATCHING\nFIRE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f97316',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 - 35,
        `Arrow keys / WASD to move\nSpacebar to spray water\nDraft a free upgrade each wave\nSupply drop shop every ${BIG_SHOP_INTERVAL} waves`,
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#94a3b8',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    this.state = this.game.registry.get('state');
    this.difficulty = this.state.difficulty ?? DIFFICULTY.NORMAL;

    this.add
      .text(width / 2, height / 2 + 18, 'Difficulty', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    this.difficultyButtons = {};
    DIFFICULTY_ORDER.forEach((level, i) => {
      const x = width / 2 + (i - 1) * 90;
      const btn = this.add
        .text(x, height / 2 + 42, `[ ${DIFFICULTY_LABEL[level]} ]`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#94a3b8',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this.selectDifficulty(level));
      this.difficultyButtons[level] = btn;
    });
    this.refreshDifficultyButtons();

    const bestWave = getBestWave();
    if (bestWave > 0) {
      this.add
        .text(width / 2, height / 2 + 76, `Best wave: ${bestWave}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#fde047',
        })
        .setOrigin(0.5);
    }

    const startButton = this.add
      .text(width / 2, height / 2 + 112, '[ START ]', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#4ade80',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerdown', () => this.startGame());
    startButton.on('pointerover', () => startButton.setColor('#86efac'));
    startButton.on('pointerout', () => startButton.setColor('#4ade80'));

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
  }

  selectDifficulty(level) {
    this.difficulty = level;
    this.refreshDifficultyButtons();
  }

  refreshDifficultyButtons() {
    for (const [level, btn] of Object.entries(this.difficultyButtons)) {
      const selected = level === this.difficulty;
      btn.setColor(selected ? '#4ade80' : '#94a3b8');
    }
  }

  startGame() {
    this.state.difficulty = this.difficulty;
    this.scene.start('Main');
  }
}
