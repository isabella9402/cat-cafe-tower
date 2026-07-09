/* =========================================================================
 *  Tower — the rotating stack of level rings for the top-down Helix descent.
 *
 *  A "level" is a full circle at worldY = depth * LEVEL_HEIGHT, divided into
 *  segments (arcs).  One arc is the GAP; the rest are solid wedges of type
 *  SAFE / DANGER / BOUNCE.
 *
 *  RENDERING: the platform art (tower_normal / tower_danger / tower_cushion) are
 *  full top-down disc PNGs.  For each level we draw, per type, ONE disc sprite
 *  masked (geometry mask) to the union of that type's non-broken wedges — so a
 *  mixed level composites into a single seamless disc with coloured slices, and
 *  the gap is simply where no wedge is drawn.  When a texture is missing we fall
 *  back to the original Graphics annular-sector fill.  Collision logic is
 *  texture-independent, so gameplay is identical either way.
 * ========================================================================= */

class Tower {
  constructor(scene) {
    this.scene = scene;
    this.levels = {};        // depth -> level
    this.rotation = 0;       // radians
    this.rotationSpeed = 0;

    // which platform types have real textures
    this.useTex = {
      [SEGMENT_TYPE.SAFE]:   hasTex(scene, PLATFORM_TEX[SEGMENT_TYPE.SAFE]),
      [SEGMENT_TYPE.DANGER]: hasTex(scene, PLATFORM_TEX[SEGMENT_TYPE.DANGER]),
      [SEGMENT_TYPE.BOUNCE]: hasTex(scene, PLATFORM_TEX[SEGMENT_TYPE.BOUNCE]),
    };
    this.hasPlatformTex = this.useTex.safe || this.useTex.danger || this.useTex.bounce;

    // dedicated render layers (Tower owns them)
    this.fallbackG = scene.add.graphics().setDepth(5);      // arc fallback fills
    this.treatG = scene.add.graphics().setDepth(20000);     // fish treats (above discs)
    this._masks = new Set();                                // track for cleanup

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  reset() {
    Object.values(this.levels).forEach((lvl) => this._disposeLevel(lvl));
    this.levels = {};
    this.rotation = 0;
    this.rotationSpeed = 0;
  }

  rotate(deltaRadians) {
    this.rotation += deltaRadians;
    this.rotationSpeed = deltaRadians;
  }

  update(dt, catY, dragging) {
    if (!dragging) {
      this.rotation += this.rotationSpeed;
      this.rotationSpeed *= GAME_CONFIG.ROTATION_FRICTION;
      if (Math.abs(this.rotationSpeed) < 1e-4) this.rotationSpeed = 0;
    }

    const centerDepth = Math.round(catY / GAME_CONFIG.LEVEL_HEIGHT);
    const lo = Math.max(1, centerDepth - GAME_CONFIG.LEVELS_BEHIND);
    const hi = centerDepth + GAME_CONFIG.LEVELS_AHEAD;

    for (const key of Object.keys(this.levels)) {
      const d = +key;
      if (d < lo - 1 || d > hi + 1) { this._disposeLevel(this.levels[d]); delete this.levels[d]; }
    }
    for (let d = lo; d <= hi; d++) {
      if (!this.levels[d]) this.levels[d] = this.generateLevel(d);
    }
  }

  generateLevel(depth) {
    const tier = getDifficultyTier(depth);
    const gapSpan = Phaser.Math.DegToRad(tier.gapWidth);
    const gapCenter = Math.random() * TWO_PI;
    const gapEnd = gapCenter + gapSpan / 2;

    const n = GAME_CONFIG.SOLID_SEGMENTS;
    const solidSpan = TWO_PI - gapSpan;
    const each = solidSpan / n;

    let dangerCount = randomInt(tier.dangerCount[0], tier.dangerCount[1]);
    if (depth < GAME_CONFIG.SAFE_INTRO_LEVELS) dangerCount = 0;
    dangerCount = Math.min(dangerCount, n - 1);
    const dangerSet = pickDistinct(n, dangerCount);

    const isBounceLevel =
      depth >= GAME_CONFIG.BOUNCE_BOOSTER_MIN_DEPTH &&
      Math.random() < GAME_CONFIG.BOUNCE_BOOSTER_CHANCE;

    const segments = [];
    for (let k = 0; k < n; k++) {
      const startAngle = gapEnd + k * each;
      const endAngle = startAngle + each;
      let type;
      if (dangerSet.has(k)) type = SEGMENT_TYPE.DANGER;
      else type = isBounceLevel ? SEGMENT_TYPE.BOUNCE : SEGMENT_TYPE.SAFE;
      segments.push({
        startAngle: normalizeAngle(startAngle),
        endAngle: normalizeAngle(endAngle),
        type, hasTreat: false, broken: false,
      });
    }

    if (depth >= GAME_CONFIG.FISH_TREAT_MIN_DEPTH &&
        Math.random() < GAME_CONFIG.FISH_TREAT_CHANCE) {
      const safeSegs = segments.filter((s) => s.type !== SEGMENT_TYPE.DANGER);
      if (safeSegs.length) safeSegs[randomInt(0, safeSegs.length - 1)].hasTreat = true;
    }

    return { depth, y: depth * GAME_CONFIG.LEVEL_HEIGHT, segments, isBounceLevel, pieces: {} };
  }

  // ---- collision (texture-independent) ----------------------------------
  getSegmentAt(depth) {
    const level = this.levels[depth];
    if (!level) return null;
    const frontLocal = normalizeAngle(GAME_CONFIG.FRONT_ANGLE - this.rotation);
    for (const seg of level.segments) {
      if (seg.broken) continue;
      if (angleInArc(frontLocal, seg.startAngle, seg.endAngle)) return seg;
    }
    return null; // gap
  }

  destroySegment(segment) { if (segment) segment.broken = true; }

  clearLevel(depth) {
    const level = this.levels[depth];
    if (level) level.segments.forEach((s) => { s.broken = true; });
  }

  // ---- piece / mask lifecycle -------------------------------------------
  _ensurePiece(level, type) {
    let piece = level.pieces[type];
    if (piece) return piece;
    const sprite = this.scene.add.image(0, 0, PLATFORM_TEX[type]);
    const maskG = this.scene.make.graphics({ add: false });
    sprite.setMask(maskG.createGeometryMask());
    piece = { sprite, maskG };
    level.pieces[type] = piece;
    this._masks.add(maskG);
    return piece;
  }

  _disposeLevel(level) {
    if (!level || !level.pieces) return;
    for (const type of Object.keys(level.pieces)) {
      const p = level.pieces[type];
      if (p.sprite) p.sprite.destroy();
      if (p.maskG) { this._masks.delete(p.maskG); p.maskG.destroy(); }
    }
    level.pieces = {};
  }

  destroy() {
    Object.values(this.levels).forEach((lvl) => this._disposeLevel(lvl));
    this.levels = {};
    this._masks.forEach((m) => m.destroy());
    this._masks.clear();
    if (this.fallbackG) { this.fallbackG.destroy(); this.fallbackG = null; }
    if (this.treatG) { this.treatG.destroy(); this.treatG = null; }
  }

  // ---- render ------------------------------------------------------------
  render(camY, ballY) {
    if (!this.fallbackG) return;
    this.fallbackG.clear();
    this.treatG.clear();

    const cx = GAME_CONFIG.TOWER_CENTER_X;
    const H = this.scene.scale.height;
    const R = GAME_CONFIG.TOWER_RADIUS;
    const rIn = GAME_CONFIG.POST_RADIUS;
    const span = GAME_CONFIG.LEVELS_AHEAD * GAME_CONFIG.LEVEL_HEIGHT;
    const TYPES = [SEGMENT_TYPE.SAFE, SEGMENT_TYPE.BOUNCE, SEGMENT_TYPE.DANGER];

    // deepest first so nearer levels (set via depth) still composite correctly
    const depths = Object.keys(this.levels).map(Number).sort((a, b) => b - a);

    for (const depth of depths) {
      const level = this.levels[depth];
      const cy = (level.y - camY) - GAME_CONFIG.RIM_OFFSET;
      const offscreen = cy < -R * 1.9 || cy > H + R * 1.9;

      if (offscreen) { this._hideLevel(level); continue; }

      const rel = (level.y - ballY) / span;
      const scale = Phaser.Math.Clamp(1 - rel * 0.55, 0.4, 1.12);
      const alpha = Phaser.Math.Clamp(1 - Math.max(rel, 0) * 0.85, 0.14, 1);
      const rOut = R * scale;

      for (const type of TYPES) {
        const wedges = level.segments.filter((s) => s.type === type && !s.broken);
        if (!wedges.length) { this._hidePiece(level, type); continue; }

        if (this.useTex[type]) {
          this._drawTexturedWedges(level, type, wedges, cx, cy, rOut, alpha);
        } else {
          this._drawFallbackWedges(type, wedges, cx, cy, rIn * scale, rOut, alpha, depth);
        }
      }

      // fish treats (Graphics — no transparent fish sprite available)
      this._drawTreats(level, cx, cy, rIn * scale, rOut, alpha);
    }
  }

  _drawTexturedWedges(level, type, wedges, cx, cy, rOut, alpha) {
    const piece = this._ensurePiece(level, type);
    const sp = piece.sprite;
    const s = (rOut * 2) / sp.width;          // scale disc so its diameter ≈ 2*rOut
    sp.setVisible(true).setPosition(cx, cy).setScale(s)
      .setRotation(this.rotation).setAlpha(alpha)
      .setDepth(10000 - level.depth);         // nearer (smaller depth) on top

    const g = piece.maskG;
    g.clear();
    g.fillStyle(0xffffff, 1);
    const maskR = rOut * 1.18;                 // a bit beyond the rim (extra is transparent)
    for (const w of wedges) {
      g.slice(cx, cy, maskR, w.startAngle + this.rotation, w.endAngle + this.rotation, false);
      g.fillPath();
    }
  }

  _drawFallbackWedges(type, wedges, cx, cy, rInner, rOut, alpha, depth) {
    const g = this.fallbackG;
    let color = SEGMENT_COLOR[type];
    if (type === SEGMENT_TYPE.SAFE && depth % 2 === 1) color = GAME_CONFIG.COLOR_PLATFORM_SAFE_ALT;
    for (const w of wedges) {
      const a0 = w.startAngle + this.rotation;
      const a1 = w.endAngle + this.rotation;
      g.fillStyle(color, alpha);
      fillArcRing(g, cx, cy, rInner, rOut, a0, a1);
      g.lineStyle(2, 0x000000, 0.06 * alpha);
      fillArcRing(g, cx, cy, rInner, rOut, a0, a1);
      g.strokePath();
    }
  }

  _drawTreats(level, cx, cy, rInner, rOut, alpha) {
    const g = this.treatG;
    const scale = rOut / GAME_CONFIG.TOWER_RADIUS;
    for (const seg of level.segments) {
      if (seg.broken || !seg.hasTreat) continue;
      const mid = (seg.startAngle + seg.endAngle) / 2 + this.rotation;
      const rr = (rInner + rOut) / 2;
      const tx = cx + Math.cos(mid) * rr;
      const ty = cy + Math.sin(mid) * rr;
      g.fillStyle(GAME_CONFIG.COLOR_TREAT, alpha);
      g.fillCircle(tx, ty, 9 * scale);
      g.fillTriangle(
        tx - 9 * scale, ty,
        tx - 16 * scale, ty - 7 * scale,
        tx - 16 * scale, ty + 7 * scale
      );
    }
  }

  _hidePiece(level, type) {
    const p = level.pieces && level.pieces[type];
    if (p && p.sprite) p.sprite.setVisible(false);
  }

  _hideLevel(level) {
    if (!level.pieces) return;
    for (const type of Object.keys(level.pieces)) {
      const p = level.pieces[type];
      if (p.sprite) p.sprite.setVisible(false);
    }
  }
}
