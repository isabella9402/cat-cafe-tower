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
    this._lastCombo = -1;
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
    this.topHUD = new TopHUD(this);   // persistent top band (floor / score / combo)
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
    });
    this.events.on('fireModeEnd', () => {
      this.tweens.add({
        targets: this.fireVignette, alpha: 0, duration: 300,
        onComplete: () => this.fireVignette.setVisible(false),
      });
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
    this._comboFeedback(this.cat.combo, this.cat.sprite.y);
  }

  _bounce(level, seg) {
    const boosted = seg.type === SEGMENT_TYPE.BOUNCE || level.isBounceLevel;
    this.cat.y = level.y;
    this.cat.bounce(boosted);
    this.depth = Math.max(this.depth, level.depth);

    if (boosted) this.fx.star.explode(9, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
    else this.fx.smoke.explode(5, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);

    // impact juice: expanding shockwave ring + a paw-splat stamped on the ring
    const col = boosted ? GAME_CONFIG.COLOR_PLATFORM_BOUNCE : 0xFFB6C1;
    this._shockwave(GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y, col);
    this._stampSplat(level);
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
    this._comboFeedback(this.cat.combo, this.cat.sprite.y);
  }

  smashTints() { return [0xff7a3d, 0xffd24a, 0xffffff]; }

  // ------------------------------------------------------------------ render
  _render() {
    if (this.bg) this.bg.tilePositionY = (this.camY * 0.3) / this.bgScale; // parallax
    this.tower.render(this.camY, this.cat.y);   // Tower draws the rings (no central post)
    this.cat.setScreenPos(GAME_CONFIG.TOWER_CENTER_X, this.cat.y - this.camY);
    this._drawSpeedLines();
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

    // Juice overlays (screen-pinned): edge speed-lines while diving, and a
    // brief full-screen flash on combo milestones. Both below the cat (100000)
    // so it stays visible, and below the HUD band (HUD_DEPTH) so it stays on top.
    this.speedLines = this.add.graphics().setDepth(70000).setScrollFactor(0);
    this.flash = this.add.graphics().setDepth(500000).setScrollFactor(0).setVisible(false);
  }

  _burst(tints, n) {
    this.fx.pop.setParticleTint(tints);
    this.fx.pop.explode(n, GAME_CONFIG.TOWER_CENTER_X, this.cat.sprite.y);
  }

  // ---- Helix juice -------------------------------------------------------
  // Expanding impact ring at a landing point (screen space).
  _shockwave(x, y, color) {
    const ring = this.add.graphics().setDepth(72000);
    ring.lineStyle(5, color, 0.85);
    ring.strokeCircle(0, 0, 13);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring, scaleX: 3.3, scaleY: 3.3, alpha: 0,
      duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy(),
    });
  }

  // Stamp a fading paw-print onto the ring the cat just bounced off. Added as a
  // child of the level container so it rides the tower's spin/scale and scrolls
  // — like the paint splats a Helix ball leaves behind.
  _stampSplat(level) {
    if (!level || !level.container) return;
    const a = normalizeAngle(GAME_CONFIG.FRONT_ANGLE - this.tower.rotation);
    const r = (this.tower.innerRadius + this.tower.outerRadius) / 2;
    const g = this.scene ? this.add.graphics() : null;
    if (!g) return;
    g.fillStyle(0xFF9EC0, 0.5);
    g.fillEllipse(0, 6, 17, 14);                                  // pad
    [[-9, -3], [-3.5, -9], [3.5, -9], [9, -3]].forEach(([dx, dy]) => g.fillCircle(dx, dy, 4)); // toes
    g.setPosition(Math.cos(a) * r, Math.sin(a) * r).setRotation(a + Math.PI / 2);
    level.container.add(g);
    this.tweens.add({
      targets: g, alpha: 0, duration: 1500, delay: 500, ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  // Rising combo chip on every streak gap; big praise + flash + stars at milestones.
  _comboFeedback(combo, y) {
    if (combo < 2) return;
    const x = GAME_CONFIG.TOWER_CENTER_X;

    const chip = addStyledText(this, x + 42, y - 8, '×' + combo, {
      fontFamily: FONT.NUM, fontSize: '26px', color: '#FF8C42', stroke: '#ffffff', strokeThickness: 3,
    }, { depth: 200000 });
    this.tweens.add({ targets: chip, y: chip.y - 46, alpha: 0, duration: 620, ease: 'Quad.easeOut', onComplete: () => chip.destroy() });

    const praise = this._praiseFor(combo);
    if (!praise) return;
    const t = addStyledText(this, x, y - 74, praise, {
      fontFamily: FONT.TITLE, fontSize: '40px', color: '#E84A7F', stroke: '#ffffff', strokeThickness: 5,
    }, { depth: 200001 });
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1.1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: t.y - 32, alpha: 0, delay: 440, duration: 420, onComplete: () => t.destroy() });
    this._flash(0xffffff, 0.26);
    this.fx.star.setParticleTint([0xffd24a, 0xff9ec0, 0xffffff]);
    this.fx.star.explode(12, x, y);
  }

  _praiseFor(c) {
    const map = { 3: 'GOOD!', 5: 'GREAT!', 7: 'PERFECT!', 10: 'AMAZING!' };
    if (map[c]) return map[c];
    if (c >= 12 && c % 5 === 0) return 'UNREAL!';
    return null;
  }

  _flash(color, alpha) {
    const f = this.flash;
    f.clear();
    f.fillStyle(color, 1);
    f.fillRect(0, 0, this.scale.width, this.scale.height);
    f.setAlpha(alpha).setVisible(true);
    this.tweens.killTweensOf(f);
    this.tweens.add({ targets: f, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => f.setVisible(false) });
  }

  // Streaking vertical lines at the screen edges while diving fast / in fire mode.
  _drawSpeedLines() {
    const g = this.speedLines;
    if (!g) return;
    g.clear();
    const fire = this.cat.isFireMode;
    const t = fire ? 1 : Phaser.Math.Clamp((this.cat.velocityY - 650) / (GAME_CONFIG.MAX_FALL_SPEED - 650), 0, 1);
    if (t <= 0.03) return;
    const w = this.scale.width, h = this.scale.height;
    const col = fire ? GAME_CONFIG.COLOR_FIRE : 0xffffff;
    const baseA = (fire ? 0.22 : 0.15) * t;
    const scroll = this.camY * (fire ? 1.7 : 1.15);
    const lines = [[14, 90], [30, 60], [22, 120], [w - 16, 90], [w - 32, 60], [w - 24, 120]];
    for (let i = 0; i < lines.length; i++) {
      const x = lines[i][0], len = lines[i][1], span = h + len;
      const y = (((-scroll + i * 137) % span) + span) % span - len;   // stream upward
      g.fillStyle(col, baseA * (0.7 + 0.3 * ((i % 3) / 2)));
      g.fillRect(x, y, i % 2 ? 3 : 2, len);
    }
  }

  // ------------------------------------------------------------------ HUD
  //  All stats live in the persistent TopHUD band (see src/ui/TopHUD.js).
  //  Only push a setter when a value actually changes (caches below).
  _updateHUD() {
    if (this.score !== this._lastScore) { this.topHUD.setScore(this.score); this._lastScore = this.score; }
    if (this.depth !== this._lastDepth) { this.topHUD.setFloor(this.depth); this._lastDepth = this.depth; }
    if (this.cat.combo !== this._lastCombo) { this.topHUD.setCombo(this.cat.combo); this._lastCombo = this.cat.combo; }
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
