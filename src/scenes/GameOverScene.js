/* =========================================================================
 *  GameOverScene — results panel (Korean), retry / menu. Kawaii theme.
 * ========================================================================= */

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.data_ = data || { score: 0, best: 0, isRecord: false, depth: 0 }; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const d = this.data_;

    // Guard against rapid taps double-firing a button (two fadeOut/scene.start).
    this._leaving = false;
    this.leaveTo = (target) => {
      if (this._leaving) return;
      this._leaving = true;
      this.cameras.main.fadeOut(200, 60, 44, 30);
      this.time.delayedCall(210, () => this.scene.start(target));
    };

    addPastelBackground(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x6b4f34, 0.14);

    const pw = Math.min(W * 0.84, 360), ph = 380, px = W / 2, py = H * 0.5;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.16); g.fillRoundedRect(px - pw / 2, py - ph / 2 + 8, pw, ph, 28);
    g.fillStyle(0xffffff, 1);    g.fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 28);
    g.fillStyle(0xFFF6E9, 1);    g.fillRoundedRect(px - pw / 2 + 6, py - ph / 2 + 6, pw - 12, ph - 12, 22);

    const top = py - ph / 2;

    // ---- title "게임 오버" (titleKo, darker rose) with a Back.Out entrance ----
    const title = addStyledText(this, px, top + 50, TXT.GAME_OVER, FONT_STYLES.titleKo, {
      style: { color: '#FF5C8A' },
    });
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });

    // ---- knocked-out cat --------------------------------------------------
    const catKey = texKey(this, CAT_TEX.gameover, 'catPlaceholder');
    if (hasTex(this, catKey)) {
      const cat = this.add.image(px, top + 128, catKey);
      cat.setScale(100 / cat.height);
      this.tweens.add({ targets: cat, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // ---- score / depth / best --------------------------------------------
    addStyledText(this, px, top + 190, TXT.SCORE, FONT_STYLES.captionKo, { alpha: 1 });
    addStyledText(this, px, top + 224, '' + d.score, FONT_STYLES.scoreNumber);
    addStyledText(this, px, top + 272, `${TXT.DEPTH} ${d.depth}${TXT.FLOOR_UNIT}`, FONT_STYLES.headingKo, {
      style: { fontSize: '22px' },
    });
    addStyledText(this, px, top + 308, `${TXT.BEST}  ${d.best}`, FONT_STYLES.bestScore);

    // ---- new-record banner (bestScore + bouncy 1.0->1.2->1.0 x3) ----------
    if (d.isRecord) {
      const rec = addStyledText(this, px, top + 20, TXT.NEW_RECORD, FONT_STYLES.bestScore, {
        style: { color: '#f0a030', stroke: '#ffffff', strokeThickness: 5 }, depth: 10,
      });
      this.tweens.add({
        targets: rec, scaleX: 1.2, scaleY: 1.2, duration: 260,
        yoyo: true, repeat: 2, ease: 'Sine.inOut',   // three 1.0->1.2->1.0 bounces
      });
      const conf = this.add.particles(0, 0, TEX.P_CONF, {
        speedY: { min: 120, max: 300 }, speedX: { min: -80, max: 80 }, rotate: { start: 0, end: 360 },
        scale: { start: 1, end: 0.5 }, lifespan: 2000, gravityY: 130,
        tint: [0xe0674f, 0xf0a030, 0xffc9de, 0xffd166, 0xffffff], emitting: false,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, -12, W, 12) },
      }).setDepth(50);
      this.time.delayedCall(200, () => conf.explode(70));
    }

    // ---- buttons (labels styled buttonKo via makeButton) ------------------
    makeButton(this, px, py + ph / 2 + 6, TXT.REPLAY, {
      width: pw * 0.9, height: 60, fill: GAME_CONFIG.COLOR_FIRE,
      onClick: () => this.leaveTo('Game'),
    });
    makeButton(this, px, py + ph / 2 + 76, TXT.HOME, {
      width: pw * 0.9, height: 52, fill: 0xb59b78, fontSize: 22,
      onClick: () => this.leaveTo('Menu'),
    });

    this.cameras.main.fadeIn(240, 255, 229, 236);
  }
}
