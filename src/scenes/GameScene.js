/* =========================================================================
 *  GameScene — canonical Helix Jump gameplay (top-down cat-café tower).
 *
 *  Player only rotates the tower (drag, with inertia). The cat falls under
 *  gravity, bounces on safe wedges (combo resets), falls through gaps (combo++),
 *  dies on red wedges — unless in fire mode, where it plows through everything.
 * ========================================================================= */

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init() {
    this._dead = false;
    this.score = 0;
    this.depth = 0;
    this.lastCollisionDepth = 0;   // depth 0 is the cat's spawn plane — skip it
    this._lastScore = -1;   // HUD caches: avoid re-rendering text textures every frame
    this._lastDepth = -1;
  }

  create() {
    const w = this.scale.width, h = this.scale.height;
    GAME_CONFIG.TOWER_CENTER_X = w / 2;
    this.catScreenY = h * GAME_CONFIG.CAT_SCREEN_Y_RATIO;

    // --- background: parallax sky if loaded, else pastel gradient ---------
    if (hasTex(this, 'bgMorning')) {
      this.bg = this.add.tileSprite(0, 0, w, h, 'bgMorning').setOrigin(0).setDepth(-200);
      const src = this.textures.get('bgMorning').getSourceImage();
      this.bgScale = w / src.width;                 // cover the width
      this.bg.setTileScale(this.bgScale, this.bgScale);
    } else {
      addPastelBackground(this);
      this.bg = null;
    }

    // world state (Tower owns its own render layers)
    this.tower = new Tower(this);
    this.cat = new Cat(this, GAME_CONFIG.TOWER_CENTER_X, 0);
    this.cat.reset(GAME_CONFIG.TOWER_CENTER_X, 0);
    this.cat.velocityY = 0;
    this.camY = this.cat.y - this.catScreenY;        // screenY = worldY - camY

    this.tower.update(0, this.cat.y);                 // seed initial levels

    this._makeFx();
    this._buildHUD();
    this._bindInput();
    this._buildFireVignette();

    this.cameras.main.fadeIn(240, 255, 229, 236);
    this._render();
    this._updateHUD();
  }

  // Orange edge vignette + continuous micro-shake while in fire mode (SPEC 7).
  _buildFireVignette() {
    this.fireVignette = this.add.graphics().setDepth(90000).setScrollFactor(0).setVisible(false);
    this._drawFireVignette();
    // guard against duplicate listeners stacking across scene restarts (retry)
    this.events.off('fireModeStart');
    this.events.off('fireModeEnd');
    this.events.on('fireModeStart', () => {
      this.fireVignette.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.fireVignette, alpha: 1, duration: 200 });
      this.cameras.main.shake(GAME_CONFIG.FIRE_MODE_DURATION * 1000, 0.005);
      if (this.comboLabel) {
        this.tweens.killTweensOf(this.comboLabel);
        this.comboLabel.setScale(1);
        this.tweens.add({ targets: this.comboLabel, scaleX: 1.3, scaleY: 1.3, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      }
    });
    this.events.on('fireModeEnd', () => {
      this.tweens.add({
        targets: this.fireVignette, alpha: 0, duration: 300,
        onComplete: () => this.fireVignette.setVisible(false),
      });
      if (this.comboLabel) { this.tweens.killTweensOf(this.comboLabel); this.comboLabel.setScale(1); }
    });
  }

  _drawFireVignette() {
    const w = this.scale.width, h = this.scale.height;
    const g = this.fireVignette;
    g.clear();
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      g.fillStyle(GAME_CONFIG.COLOR_FIRE, 0.03 + t * 0.05);
      const m = (8 - i) * 20;
      g.fillRect(0, 0, w, m);
      g.fillRect(0, h - m, w, m);
      g.fillRect(0, 0, m, h);
      g.fillRect(w - m, 0, m, h);
    }
  }

  // ------------------------------------------------------------------ input
  _bindInput() {
    this.isDragging = false;
    this.lastPointerX = 0;
    this.input.removeAllListeners();
    this.input.on('pointerdown', (p) => { if (this._dead) return; this.isDragging = true; this.lastPointerX = p.x; });
    this.input.on('pointermove', (p) => {
      if (!this.isDragging || this._dead) return;
      this.tower.rotate((p.x - this.lastPointerX) * GAME_CONFIG.ROTATION_SENSITIVITY);
      this.lastPointerX = p.x;
    });
    // Release from every path a drag can end — the tower stops instantly (no inertia).
    const release = () => { this.isDragging = false; };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', release);
    this._releaseHandler = release;
    window.addEventListener('blur', release);
    if (this.game.canvas) this.game.canvas.addEventListener('touchcancel', release);
    // tidy the DOM listeners when the scene ends
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', release);
      if (this.game.canvas) this.game.canvas.removeEventListener('touchcancel', release);
    });
  }

  // ------------------------------------------------------------------ update
  update(time, delta) {
    if (this._dead) { this._render(); return; }
    const dt = Math.min(delta / 1000, 0.033);

    this.cat.update(dt);

    // Camera pins the cat at exactly CAT_SCREEN_Y_RATIO (both directions, so the
    // cat holds 30% even on bounces). screenY = worldY - camY.
    this.camY = this.cat.y - this.catScreenY;
    this.tower._camY = this.camY;                 // keep burst placement in sync

    this.tower.update(dt, this.cat.y);

    // collisions only while descending (platforms block from above only)
    if (this.cat.velocityY > 0 && !this._dead) this.checkCollision();

    // levels the cat has dropped below shatter and vanish immediately
    this.tower.shatterPassedLevels(this.cat.y);

    // pose: falling while descending, idle while rising (fire pose managed by Cat)
    if (!this.cat.isFireMode) this.cat.setState(this.cat.velocityY > 0 ? 'falling' : 'idle');

    this._render();
    this._updateHUD();
  }

  // Resolve one level plane per frame as the cat descends past it. Gaps chain
  // combos; safe/bounce rebound; danger ends the run (unless in fire mode, which
  // smashes everything). One collision per depth via lastCollisionDepth.
  checkCollision() {
    const currentDepth = Math.floor(this.cat.y / GAME_CONFIG.LEVEL_HEIGHT);
    if (currentDepth <= this.lastCollisionDepth) return;
    this.lastCollisionDepth = currentDepth;

    const hit = this.tower.getSegmentAt(this.cat.y);
    if (!hit) return;
    const { segment, level } = hit;

    if (segment.type === SEGMENT_TYPE.GAP) { this._passGap(level); return; }

    if (this.cat.isFireMode) {                    // fire: smash through, keep diving
      this.tower.destroySegment(level, segment);
      this.score += GAME_CONFIG.SCORE_PER_DESTROY;
      this.depth = Math.max(this.depth, level.depth);
      this._burst(this.smashTints(), 10);
      return;
    }

    if (segment.hasTreat) { this._collectTreat(level, segment); return; }  // fish treat

    if (segment.type === SEGMENT_TYPE.DANGER) { this.die(); return; }      // danger: over

    // safe / bounce
    this._bounce(level, segment);
    this.lastCollisionDepth = currentDepth - 1;   // permit a re-bounce on this plane
    this.cameras.main.shake(60, 0.003);
  }

  _passGap(level) {
    this.cat.onGapPassed();
    const mult = this.cat.comboMultiplier();
    this.score += Math.round(GAME_CONFIG.SCORE_PER_GAP * mult);
    this.depth = Math.max(this.depth, level.depth);

    const fire = this.cat.isFireMode;
    this.fx.pop.setParticleTint(fire ? this.smashTints() : [0xEAD9BE, 0xffc9de, 0xffffff]);
    this.fx.pop.explode(fire ? 14 : 8, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
    if (fire) this.cameras.main.shake(60, 0.004);
  }

  _bounce(level, seg) {
    const boosted = seg.type === SEGMENT_TYPE.BOUNCE || level.isBounceLevel;
    this.cat.y = level.y;
    this.cat.bounce(boosted);
    this.depth = Math.max(this.depth, level.depth);

    if (boosted) this.fx.star.explode(9, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
    else this.fx.smoke.explode(5, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
  }

  _collectTreat(level, seg) {
    this.tower.collectTreat(level, seg);       // clears the treat + rebuilds visuals
    this.score += GAME_CONFIG.SCORE_PER_TREAT;
    this.cat.onGapPassed();                     // counts toward combo, keeps diving
    for (let d = level.depth + 1; d <= level.depth + GAME_CONFIG.TREAT_CLEAR_LEVELS; d++) {
      this.tower.clearLevel(d);                 // smash the next few levels below
    }
    this.depth = Math.max(this.depth, level.depth);
    this.fx.star.setParticleTint([GAME_CONFIG.COLOR_TREAT, 0xffffff, 0xff9ec0]);
    this.fx.star.explode(16, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
    this.cameras.main.shake(120, 0.006);
  }

  smashTints() { return [0xff7a3d, 0xffd24a, 0xffffff]; }

  // ------------------------------------------------------------------ render
  _render() {
    if (this.bg) this.bg.tilePositionY = (this.camY * 0.3) / this.bgScale; // parallax
    this.tower.render(this.camY, this.cat.y);   // Tower draws the rings (no central post)
    this.cat.setScreenPos(GAME_CONFIG.TOWER_CENTER_X, this.cat.y - this.camY);
  }

  // ------------------------------------------------------------------ fx
  _makeFx() {
    this.fx = {};
    // gap-pass pop: prefer the sparkle sheet (clean 128x129 grid), else a dot
    const popTex = texKey(this, 'vfxSparkle', TEX.P_DOT);
    const popCfg = {
      speed: { min: 70, max: 220 }, scale: { start: 0.6, end: 0 }, lifespan: 460,
      tint: [0xEAD9BE, 0xffc9de, 0xffffff], emitting: false,
    };
    if (popTex === 'vfxSparkle') { popCfg.frame = [0, 1, 2]; popCfg.scale = { start: 0.5, end: 0 }; }
    this.fx.pop = this.add.particles(0, 0, popTex, popCfg).setDepth(60);

    this.fx.smoke = this.add.particles(0, 0, TEX.P_SMOKE, {
      speed: { min: 20, max: 70 }, scale: { start: 0.4, end: 1.1 }, alpha: { start: 0.5, end: 0 },
      lifespan: 460, tint: 0xe6d3c0, emitting: false,
    }).setDepth(55);

    this.fx.star = this.add.particles(0, 0, TEX.P_STAR, {
      speed: { min: 60, max: 200 }, scale: { start: 0.8, end: 0 }, lifespan: 560,
      rotate: { start: 0, end: 180 }, tint: [0x9fe6c0, 0xffd24a, 0xffffff], emitting: false,
    }).setDepth(70);
  }

  _burst(tints, n) {
    this.fx.pop.setParticleTint(tints);
    this.fx.pop.explode(n, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
  }

  // ------------------------------------------------------------------ HUD
  //  Laid out for the fixed 540x960 canvas.
  _buildHUD() {
    // score (top-right, right-aligned) + coin icon just to its left
    this.coinPrefix = '';
    this.scoreText = addStyledText(this, 500, 24, '0',
      FONT_STYLES.scoreNumber, { origin: { x: 1, y: 0 }, depth: 180 });
    if (hasTex(this, 'coin')) {
      this.coinIcon = this.add.image(0, 0, 'coin').setOrigin(1, 0.5).setDepth(180);
      this.coinIcon.setScale(38 / this.coinIcon.height);
    } else {
      this.coinPrefix = '🪙 ';
      this.scoreText.setText(this.coinPrefix + '0');
    }

    // depth / stage (top-left) — coin icon + number
    this.stagePrefix = '';
    if (hasTex(this, 'stageIcon')) {
      this.stageIcon = this.add.image(28, 40, 'stageIcon').setOrigin(0, 0.5).setDepth(180);
      this.stageIcon.setScale(40 / this.stageIcon.height);
      this.depthText = addStyledText(this, 28 + this.stageIcon.displayWidth + 8, 40, '0', FONT_STYLES.hudCounter, {
        origin: { x: 0, y: 0.5 }, depth: 180, style: { stroke: '#ffffff', strokeThickness: 4 },
      });
    } else {
      this.stagePrefix = '🏔️ ';
      this.depthText = addStyledText(this, 40, 30, '🏔️ 0', FONT_STYLES.hudCounter, {
        origin: { x: 0, y: 0 }, depth: 180, style: { stroke: '#ffffff', strokeThickness: 4 },
      });
    }

    // combo meter (top-center, x=270) with a "콤보" caption above it
    this.comboG = this.add.graphics().setDepth(180);
    this.comboCaption = addStyledText(this, 270, 50, TXT.COMBO, FONT_STYLES.captionKo, { depth: 181 });
    this.comboLabel = addStyledText(this, 270, 84, '', FONT_STYLES.hintKo, {
      depth: 182, style: { color: '#FF6B35', stroke: '#ffffff', strokeThickness: 4 },
    }).setVisible(false);
    this._positionCoin();
  }

  _positionCoin() {
    if (!this.coinIcon) return;
    // sit the coin's right edge just left of the score number, vertically centred
    const left = this.scoreText.x - this.scoreText.width;
    this.coinIcon.setPosition(left - 8, this.scoreText.y + this.scoreText.height / 2);
  }

  _updateHUD() {
    if (this.score !== this._lastScore) {
      this.scoreText.setText(this.coinPrefix + this.score);
      this._positionCoin();
      this._punchScore();
      this._lastScore = this.score;
    }
    if (this.depth !== this._lastDepth) {
      this.depthText.setText(this.stagePrefix + this.depth);
      this._lastDepth = this.depth;
    }
    this._drawComboMeter();
  }

  // quick scale punch on every score change (1.0 -> 1.3 -> 1.0)
  _punchScore() {
    if (this._lastScore < 0) return;          // skip the initial set
    this.tweens.killTweensOf(this.scoreText);
    this.scoreText.setScale(1);
    this.tweens.add({ targets: this.scoreText, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true, ease: 'Quad.out' });
  }

  _drawComboMeter() {
    const g = this.comboG;
    const cx = 270;
    g.clear();

    if (this.cat.isFireMode) {
      // fire-mode countdown RING with 🔥 in the centre (pulse from fireModeStart)
      const frac = Phaser.Math.Clamp(this.cat.fireModeTimer / GAME_CONFIG.FIRE_MODE_DURATION, 0, 1);
      const ry = 84, r = 26;
      g.lineStyle(7, 0x000000, 0.15); g.strokeCircle(cx, ry, r);
      g.lineStyle(7, GAME_CONFIG.COLOR_FIRE, 1);
      g.beginPath();
      g.arc(cx, ry, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      g.strokePath();
      this.comboCaption.setVisible(false);
      this.comboLabel.setText('🔥').setVisible(true);
      return;
    }

    // normal 4-segment combo bar
    this.comboLabel.setVisible(false);
    this.comboCaption.setVisible(true);
    const cells = GAME_CONFIG.COMBO_FOR_FIRE_MODE;
    const cw = 44, gap = 6, hgt = 18, y = 68;
    const totalW = cells * cw + (cells - 1) * gap;
    const x0 = cx - totalW / 2;
    const filled = Math.min(this.cat.combo, cells);
    for (let i = 0; i < cells; i++) {
      const x = x0 + i * (cw + gap);
      g.fillStyle(0x000000, 0.10); g.fillRoundedRect(x, y, cw, hgt, 6);
      if (i < filled) {
        g.fillStyle(i === cells - 1 ? GAME_CONFIG.COLOR_FIRE : 0xff9ec0, 1);
        g.fillRoundedRect(x, y, cw, hgt, 6);
      }
    }
  }

  // ------------------------------------------------------------------ over
  die() {
    if (this._dead) return;
    this._dead = true;
    // Clear the fire-mode screen FX. update() early-returns once dead, so if the
    // cat died IN fire mode the vignette + 🔥 pulse would otherwise keep running
    // through the whole death animation. Tidy them up here.
    this.tweens.killTweensOf(this.fireVignette);
    this.fireVignette.setVisible(false).setAlpha(0);
    this.tweens.killTweensOf(this.comboLabel);
    this.comboLabel.setScale(1).setVisible(false);
    this.cat.die();
    this.cameras.main.shake(240, 0.02);
    if (navigator.vibrate) navigator.vibrate([40, 40, 90]);
    this.fx.smoke.explode(16, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
    this.tweens.add({ targets: this.cat.sprite, angle: 20, alpha: 0.85, duration: 480, ease: 'Quad.in' });

    const best = +(localStorage.getItem(GAME_CONFIG.BEST_KEY) || 0);
    const isRecord = this.score > best;
    if (isRecord) localStorage.setItem(GAME_CONFIG.BEST_KEY, this.score);

    this.time.delayedCall(720, () => {
      this.cameras.main.fadeOut(230, 60, 44, 30);
      this.time.delayedCall(240, () => this.scene.start('GameOver', {
        score: this.score, best: Math.max(best, this.score), isRecord, depth: this.depth,
      }));
    });
  }
}
