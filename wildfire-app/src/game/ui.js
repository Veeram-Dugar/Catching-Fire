// Small shared drawing helpers for the menu/shop screens, so they read as
// designed panels rather than text floating on the bare background.

/** Draws a bordered panel behind other content; call before adding text. */
export function drawPanel(scene, x, y, width, height, borderColor) {
  const panel = scene.add.graphics();
  panel.fillStyle(0x0b1020, 0.62);
  panel.fillRoundedRect(x, y, width, height, 12);
  panel.lineStyle(2, borderColor, 0.55);
  panel.strokeRoundedRect(x, y, width, height, 12);
  panel.lineStyle(1, 0xfacc15, 0.2);
  panel.strokeRoundedRect(x + 4, y + 4, width - 8, height - 8, 9);
  return panel;
}
