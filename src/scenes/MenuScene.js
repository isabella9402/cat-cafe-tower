/* =========================================================================
 *  MenuScene — title / best score / tap-to-start. Kawaii pastel theme.
 * ========================================================================= */

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const w = this.scale.width, h = this.scale.height;
    const cx = w / 2;

    // background: sky if available, else pastel gradient
    if (hasTex(this, 'bgMorning')) {
      const bg = this.add.image(cx, h / 2, 'bgMorning').setDepth(-100);
      const src = this.textures.get('bgMorning').getSourceImage();
      bg.setScale(Math.max(w / src.width, h / src.height));   // cover
    } else {
      addPastelBackground(this);
    }

    // ---- title: logo art if available, else styled English title ----------
    let titleObj;
    if (hasTex(this, 'logo')) {
      titleObj = this.add.image(cx, h * 0.22, 'logo').setOrigin(0.5);
      titleObj.setScale(Math.min((w * 0.82) / titleObj.width, 1.1));
    } else {
      titleObj = addStyledText(this, cx, h * 0.20, TXT.TITLE, FONT_STYLES.titleEn);
    }
    // gentle floating tween (y ±5px, 2s, yoyo)
    this.tweens.add({
      targets: titleObj, y: titleObj.y - 5, duration: 2000,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    // Korean subtitle — bigger & bolder now (Black Han Sans)
    addStyledText(this, cx, h * 0.31, TXT.SUBTITLE, FONT_STYLES.titleKo);

    // ---- hero: floating cat above the tap prompt --------------------------
    const catKey = texKey(this, 'catIdle', 'catPlaceholder');
    if (hasTex(this, catKey)) {
      const cat = this.add.image(cx, h * 0.50, catKey);
      cat.setScale(120 / cat.height);
      this.tweens.add({ targets: cat, y: cat.y - 14, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const plat = this.add.graphics().setDepth(-1);
      plat.fillStyle(GAME_CONFIG.COLOR_PLATFORM_SAFE, 0.9);
      plat.fillEllipse(cx, h * 0.50 + 66, 170, 48);
    }

    // ---- best score -------------------------------------------------------
    const best = +(localStorage.getItem(GAME_CONFIG.BEST_KEY) || 0);
    addStyledText(this, cx, h * 0.66, `${TXT.BEST}  ${best}`, FONT_STYLES.bestScore);

    // ---- play button + tap prompt ----------------------------------------
    if (hasTex(this, 'play')) {
      const play = this.add.image(cx, h * 0.77, 'play').setOrigin(0.5);
      play.setScale(Math.min((w * 0.42) / play.width, 0.9));
      const bs = play.scaleX;
      this.tweens.add({ targets: play, scaleX: bs * 1.05, scaleY: bs * 1.05, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    const tap = addStyledText(this, cx, h * 0.85, TXT.TAP_START, FONT_STYLES.headingKo, {
      style: { stroke: '#ffffff', strokeThickness: 4 },   // readability over the sky
    });
    // pulsing scale (1.0 <-> 1.08)
    this.tweens.add({ targets: tap, scaleX: 1.08, scaleY: 1.08, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ---- hints (handwritten Gaegu, one multiline block w/ line spacing) ---
    addStyledText(this, cx, h * 0.92, `${TXT.HOW_TO}\n${TXT.HOW_TO_2}`, FONT_STYLES.hintKo, {
      lineSpacing: 8,
      style: { align: 'center', stroke: '#ffffff', strokeThickness: 4 },
    });

    // ---- start ------------------------------------------------------------
    const start = () => {
      this.cameras.main.fadeOut(220, 255, 229, 236);
      this.time.delayedCall(230, () => this.scene.start('Game'));
    };
    this.input.once('pointerdown', start);

    this.cameras.main.fadeIn(260, 255, 229, 236);
  }
}
