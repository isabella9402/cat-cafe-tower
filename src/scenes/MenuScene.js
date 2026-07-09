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

    // ---- logo (top) or styled text fallback -------------------------------
    if (hasTex(this, 'logo')) {
      const logo = this.add.image(cx, 190, 'logo').setOrigin(0.5);
      logo.setScale((w * 0.82) / logo.width);
      this.tweens.add({ targets: logo, y: 184, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const title = addStyledText(this, cx, 150, TXT.TITLE, FONT_STYLES.titleEn);
      this.tweens.add({ targets: title, y: 145, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      addStyledText(this, cx, 215, TXT.SUBTITLE, FONT_STYLES.titleKo);
    }

    // ---- hero cat (floating) ---------------------------------------------
    const catKey = texKey(this, 'catIdle', 'catPlaceholder');
    if (hasTex(this, catKey)) {
      const cat = this.add.image(cx, 430, catKey);
      cat.setScale(Math.min(0.5, 230 / cat.height));
      const plat = this.add.graphics().setDepth(-1);
      plat.fillStyle(GAME_CONFIG.COLOR_PLATFORM_SAFE, 0.9);
      plat.fillEllipse(cx, 430 + cat.displayHeight / 2 - 6, 170, 44);
      this.tweens.add({ targets: cat, y: 422, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // ---- best score (with coin) ------------------------------------------
    const best = +(localStorage.getItem(GAME_CONFIG.BEST_KEY) || 0);
    const bestText = addStyledText(this, cx, 570, `${TXT.BEST}  ${best}`, FONT_STYLES.bestScore, {
      style: { fontSize: '28px', color: '#FF6B9D', stroke: '#ffffff', strokeThickness: 4 },
    });
    if (hasTex(this, 'coin')) {
      const coin = this.add.image(0, 0, 'coin').setOrigin(1, 0.5);
      coin.setScale(34 / coin.height);
      coin.setPosition(bestText.x - bestText.width / 2 - 10, 570);
    }

    // ---- how-to panel: 3 short cute lines --------------------------------
    const howto = [TXT.HOW_TO, TXT.HOW_TO_2, TXT.HOW_TO_3];
    const panelY = 690, lineH = 34, padY = 18;
    const panelH = howto.length * lineH + padY * 2, panelW = w * 0.86;
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 0.55);
    pg.fillRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 22);
    pg.lineStyle(3, 0xffffff, 0.9);
    pg.strokeRoundedRect(cx - panelW / 2, panelY - panelH / 2, panelW, panelH, 22);
    const top = panelY - panelH / 2 + padY + lineH / 2;
    howto.forEach((line, i) => {
      addStyledText(this, cx, top + i * lineH, line, FONT_STYLES.hintKo, {
        style: { fontSize: '23px', color: '#8B5A3C', stroke: '#ffffff', strokeThickness: 3 },
      });
    });

    // ---- play button (smaller) with press feedback -----------------------
    this._starting = false;
    const start = () => {
      if (this._starting) return;
      this._starting = true;
      this.cameras.main.fadeOut(220, 255, 229, 236);
      this.time.delayedCall(230, () => this.scene.start('Game'));
    };

    if (hasTex(this, 'play')) {
      const play = this.add.image(cx, 838, 'play').setOrigin(0.5).setInteractive({ useHandCursor: true });
      play.setScale(Math.min((w * 0.34) / play.width, 1));   // smaller than before (was 0.46)
      const bs = play.scaleX;
      const idle = this.tweens.add({ targets: play, scaleX: bs * 1.05, scaleY: bs * 1.05, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      play.on('pointerdown', () => {
        idle.stop();
        this.tweens.add({ targets: play, scaleX: bs * 0.95, scaleY: bs * 0.95, duration: 80, yoyo: true, ease: 'Quad.out', onComplete: start });
      });
    }

    // ---- tap prompt (bottom) ---------------------------------------------
    const tap = addStyledText(this, cx, 910, TXT.TAP_START, FONT_STYLES.bodyKo, {
      style: { fontSize: '20px', color: '#6b4f34', stroke: '#ffffff', strokeThickness: 4 },
    });
    this.tweens.add({ targets: tap, scaleX: 1.08, scaleY: 1.08, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // tap anywhere (empty area) also starts
    this.input.on('pointerdown', (p, over) => { if (!over.length) start(); });

    this.cameras.main.fadeIn(260, 255, 229, 236);
  }
}
