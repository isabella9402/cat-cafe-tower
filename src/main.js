/* =========================================================================
 *  main — Phaser config + scene registration.
 *
 *  Fixed 9:16 portrait logical canvas (540x960) with FIT scaling: the canvas
 *  keeps a phone-shaped aspect on every screen and is centered; the HTML/CSS
 *  paints a soft sky behind the letterbox (no more solid pink bars).
 * ========================================================================= */

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  transparent: true,          // CSS paints the page background; the string
                              // 'transparent' is NOT a valid Phaser color.
  scale: {
    mode: Phaser.Scale.FIT,
    // CSS flexbox (#game) centers the canvas. Using Phaser CENTER_BOTH *as well*
    // double-offsets it and pushes the canvas to the right on wide windows, so
    // autoCenter is disabled here and CSS is the single source of centering.
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 540,               // logical game width  (9:16)
    height: 960,              // logical game height
    // NOTE: `resolution` is intentionally omitted — it is non-functional in
    // Phaser 3.x and can blank the canvas. FIT already scales the 540x960
    // backing store up crisply to the device.
  },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
window.game = game;

// Re-center / re-fit on window resize & orientation change. (FIT already
// listens for resize, but refresh() guarantees an immediate re-layout.)
window.addEventListener('resize', () => game.scale.refresh());
