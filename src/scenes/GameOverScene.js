/* =========================================================================
 *  GameOverScene — results panel (Korean), retry / menu. Kawaii theme.
 *  Laid out for the fixed 540x960 canvas; panel is a Container so the whole
 *  card can scale-in as one unit.
 * ========================================================================= */

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.data_ = data || { score: 0, best: 0, isRecord: false, depth: 0 }; }

  create() {
    const W = this.scale.width, H = this.scale.height;   // 540 x 960
    const d = this.data_;

    // guard against rapid taps double-firing a button
    this._leaving = false;
    this.leaveTo = (target) => {
      if (this._leaving) return;
      this._leaving = true;
      this.cameras.main.fadeOut(200, 60, 44, 30);
      this.time.delayedCall(210, () => this.scene.start(target));
    };

    addPastelBackground(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5);   // dim overlay

    // ---- panel container (440x560, centered) ------------------------------
    const PW = 440, PH = 560, TOP = -PH / 2;                // TOP = panel-top in container space
    const panel = this.add.container(W / 2, H / 2);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.16); g.fillRoundedRect(-PW / 2, -PH / 2 + 10, PW, PH, 30);
    g.fillStyle(0xffffff, 1);    g.fillRoundedRect(-PW / 2, -PH / 2, PW, PH, 30);
    g.fillStyle(0xFFF6E9, 1);    g.fillRoundedRect(-PW / 2 + 7, -PH / 2 + 7, PW - 14, PH - 14, 24);
    panel.add(g);

    // title "게임 오버" — 60px from panel top
    panel.add(addStyledText(this, 0, TOP + 60, TXT.GAME_OVER, FONT_STYLES.titleKo, {
      style: { color: '#FF5C8A' },
    }));

    // knocked-out cat — 150px from top, ~120x120, gentle wobble
    const catKey = texKey(this, CAT_TEX.gameover, 'catPlaceholder');
    if (hasTex(this, catKey)) {
      const cat = this.add.image(0, TOP + 150, catKey);
      cat.setScale(120 / cat.height);
      panel.add(cat);
      this.tweens.add({ targets: cat, angle: { from: -5, to: 5 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // score — label + number (~300px from top)
    panel.add(addStyledText(this, 0, TOP + 250, TXT.SCORE, FONT_STYLES.captionKo, { alpha: 1 }));
    panel.add(addStyledText(this, 0, TOP + 290, '' + d.score, FONT_STYLES.scoreNumber));

    // depth (~370px from top)
    panel.add(addStyledText(this, 0, TOP + 360, `${TXT.DEPTH} ${d.depth}${TXT.FLOOR_UNIT}`,
      FONT_STYLES.headingKo, { style: { fontSize: '24px' } }));

    // best / new-record line (~420px from top)
    const bestLabel = d.isRecord ? TXT.NEW_RECORD : `${TXT.BEST}  ${d.best}`;
    panel.add(addStyledText(this, 0, TOP + 410, bestLabel, FONT_STYLES.bestScore, {
      style: d.isRecord ? { color: '#f0a030', stroke: '#ffffff', strokeThickness: 5 } : {},
    }));

    // buttons side-by-side (~480px from top) — inside the panel
    const retry = makeButton(this, -103, TOP + 490, TXT.REPLAY, {
      width: 196, height: 58, fill: GAME_CONFIG.COLOR_FIRE, fontSize: 22,
      onClick: () => this.leaveTo('Game'),
    });
    const menu = makeButton(this, 103, TOP + 490, TXT.HOME, {
      width: 196, height: 58, fill: 0xb59b78, fontSize: 22,
      onClick: () => this.leaveTo('Menu'),
    });
    panel.add(retry); panel.add(menu);

    // ---- panel entrance: scale 0.5 -> 1.0, Back.Out, 400ms ----------------
    panel.setScale(0.5);
    this.tweens.add({ targets: panel, scale: 1, duration: 400, ease: 'Back.Out' });

    // ---- new-record celebration: confetti + sparkle burst -----------------
    if (d.isRecord) {
      const conf = this.add.particles(0, 0, TEX.P_CONF, {
        speedY: { min: 120, max: 300 }, speedX: { min: -80, max: 80 }, rotate: { start: 0, end: 360 },
        scale: { start: 1, end: 0.5 }, lifespan: 2000, gravityY: 130,
        tint: [0xe0674f, 0xf0a030, 0xffc9de, 0xffd166, 0xffffff], emitting: false,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, -12, W, 12) },
      }).setDepth(50);
      this.time.delayedCall(200, () => conf.explode(70));

      // sparkle burst around the best-score text (world position)
      const sparkKey = texKey(this, 'vfxSparkle', TEX.P_STAR);
      const spark = this.add.particles(0, 0, sparkKey, {
        speed: { min: 60, max: 180 }, scale: { start: 0.5, end: 0 }, lifespan: 700,
        tint: [0xffd166, 0xff9ec0, 0xffffff], emitting: false,
        frame: sparkKey === 'vfxSparkle' ? [0, 2] : undefined,
      }).setDepth(51);
      this.time.delayedCall(450, () => spark.explode(20, W / 2, H / 2 + TOP + 410));
    }

    this.cameras.main.fadeIn(240, 255, 229, 236);
  }
}
