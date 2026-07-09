/* =========================================================================
 *  main — Phaser config + scene registration.
 *
 *  Sizes to the window (FIT + letterbox), transparent background (CSS paints
 *  the page bg), no built-in physics — the Helix logic is fully custom.
 * ========================================================================= */

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
window.game = game;
