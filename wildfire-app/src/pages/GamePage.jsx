import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../game/config.js';

const CONTAINER_ID = 'phaser-game-container';

export default function GamePage() {
  const gameRef = useRef(null);

  useEffect(() => {
    // Guard against React StrictMode's double-invoke in dev, which would
    // otherwise create two Phaser instances in the same div.
    if (gameRef.current) return;

    gameRef.current = new Phaser.Game(createGameConfig(CONTAINER_ID));

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-8">
      <h1 className="text-xl font-semibold text-orange-300">Catching Fire: Wave Defense</h1>
      <p className="text-sm text-slate-400">
        Move with arrow keys / WASD, spray with spacebar. Clear every wave to
        draft a free upgrade, then see how far you can push your run.
      </p>
      <div
        id={CONTAINER_ID}
        className="overflow-hidden rounded-lg border border-slate-700"
      />
    </main>
  );
}
