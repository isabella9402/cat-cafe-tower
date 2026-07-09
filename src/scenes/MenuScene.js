/* =========================================================================
 *  MenuScene — title / best score / tap-to-start. Kawaii pastel theme.
 *  Laid out for the fixed 540x960 (9:16) canvas.
 * ========================================================================= */

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const w = this.scale.width, h = this.scale.height;   // 540 x 960
    const cx = w / 2;                                     // 270

    // ---- background: sky cover if available, else pastel gradient ---------
    if (hasTex(this, 'bgMorning')) {
      const bg = this.add.image(cx, h / 2, 'bgMorning').setDepth(-100);
      const src = this.textures.get('bgMorning').getSourceImage();
      bg.setScale(Math.max(w / src.width, h / src.height));
    } else {
      addPastelBackground(this);
    }

    // ---- logo (y=180, 90% width) or styled text fallback ------------------
    if (hasTex(this, 'logo')) {
      const logo = this.add.image(cx, 180, 'logo').setOrigin(0.5);
      logo.setScale((w * 0.9) / logo.width);
      this.tweens.add({ targets: logo, y: 175, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const title = addStyledText(this, cx, 150, TXT.TITLE, FONT_STYLES.titleEn);
      this.tweens.add({ targets: title, y: 145, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      addStyledText(this, cx, 210, TXT.SUBTITLE, FONT_STYLES.titleKo);
    }

    // ---- hero cat (y=480, floating) ---------------------------------------
    const catKey = texKey(this, 'catIdle', 'catPlaceholder');
    if (hasTex(this, catKey)) {
      const cat = this.add.image(cx, 480, catKey);
      cat.setScale(Math.min(0.62, 290 / cat.height));    // ~0.6 of original, fits the slot
      const plat = this.add.graphics().setDepth(-1);
      plat.fillStyle(GAME_CONFIG.COLOR_PLATFORM_SAFE, 0.9);
      plat.fillEllipse(cx, 480 + cat.displayHeight / 2 - 6, 200, 52);
      this.tweens.add({ targets: cat, y: 472, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // ---- best score (y=680, prominent, with coin) -------------------------
    const best = +(localStorage.getItem(GAME_CONFIG.BEST_KEY) || 0);
    const bestText = addStyledText(this, cx, 680, `${TXT.BEST}  ${best}`, FONT_STYLES.bestScore, {
      style: { fontSize: '28px', color: '#FF6B9D', stroke: '#ffffff', strokeThickness: 4 },
    });
    if (hasTex(this, 'coin')) {
      const coin = this.add.image(0, 0, 'coin').setOrigin(1, 0.5);
      coin.setScale(34 / coin.height);
      coin.setPosition(bestText.x - bestText.width / 2 - 10, 680);
    }

    // ---- play button (y=780) with press feedback --------------------------
    this._starting = false;
    const start = () => {
      if (this._starting) return;
      this._starting = true;
      this.cameras.main.fadeOut(220, 255, 229, 236);
      this.time.delayedCall(230, () => this.scene.start('Game'));
    };

    if (hasTex(this, 'play')) {
      const play = this.add.image(cx, 780, 'play').setOrigin(0.5).setInteractive({ useHandCursor: true });
      play.setScale(Math.min((w * 0.46) / play.width, 1));
      const bs = play.scaleX;
      const idle = this.tweens.add({ targets: play, scaleX: bs * 1.05, scaleY: bs * 1.05, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      play.on('pointerdown', () => {
        idle.stop();
        this.tweens.add({ targets: play, scaleX: bs * 0.95, scaleY: bs * 0.95, duration: 80, yoyo: true, ease: 'Quad.out', onComplete: start });
      });
    }

    // ---- tap prompt BELOW the button (y=870, smaller, pulsing) ------------
    const tap = addStyledText(this, cx, 870, TXT.TAP_START, FONT_STYLES.bodyKo, {
      style: { fontSize: '20px', color: '#6b4f34', stroke: '#ffffff', strokeThickness: 4 },
    });
    this.tweens.add({ targets: tap, scaleX: 1.08, scaleY: 1.08, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ---- hint lines (Gaegu handwriting, bottom) ---------------------------
    const hintStyle = { fontSize: '19px', stroke: '#ffffff', strokeThickness: 4 };
    addStyledText(this, cx, 910, TXT.HOW_TO, FONT_STYLES.hintKo, { style: hintStyle });
    addStyledText(this, cx, 936, TXT.HOW_TO_2, FONT_STYLES.hintKo, { style: hintStyle });

    // tap anywhere (empty area) also starts
    this.input.on('pointerdown', (p, over) => { if (!over.length) start(); });

    this.cameras.main.fadeIn(260, 255, 229, 236);
  }
}
