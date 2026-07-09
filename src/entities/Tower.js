/* =========================================================================
 *  Tower — the rotating stack of level rings for the top-down Helix descent.
 *
 *  A "level" is a full 360° ring at worldY = depth * LEVEL_HEIGHT, divided into
 *  segments (arcs).  One arc is the GAP (drawn as nothing — the cat falls
 *  through); the rest are solid wedges of type SAFE / DANGER / BOUNCE.  The
 *  wedges of a level always tile the circle exactly: gap + N equal solid wedges
 *  sum to 2π, with no overlaps and no angular holes (see generateLevel).
 *
 *  RENDERING: every wedge of every level is drawn programmatically as a solid
 *  annular sector (donut arc) on a single Graphics layer, so every wedge of a
 *  level shares the exact same inner/outer radius and the ring reads as one
 *  clean donut with a single visible gap.  (An earlier build composited three
 *  separate full-disc PNGs per level via geometry masks; because the PNGs had
 *  different internal ring/hole radii, a level's danger wedges bulged past its
 *  safe ring and looked like detached slices — hence the flat-fill rewrite.)
 *  The tower_*.png discs are intentionally no longer used for the ring; add
 *  texture/pattern back later once the geometry is confirmed correct.
 *
 *  Collision (getSegmentAt) is geometry-only and unchanged by rendering.
 * ========================================================================= */

class Tower {
  constructor(scene) {
    this.scene = scene;
    this.levels = {};        // depth -> level
    this.rotation = 0;       // radians
    this.rotationSpeed = 0;

    // We draw the ring with Graphics, not platform textures. GameScene reads
    // this flag to decide whether to draw the central post itself (it must).
    this.hasPlatformTex = false;

    // dedicated render layers (Tower owns them)
    this.ringG = scene.add.graphics().setDepth(5);       // solid wedge fills
    this.treatG = scene.add.graphics().setDepth(20000);  // fish treats (above rings)

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  reset() {
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
      if (d < lo - 1 || d > hi + 1) delete this.levels[d];
    }
    for (let d = lo; d <= hi; d++) {
      if (!this.levels[d]) this.levels[d] = this.generateLevel(d);
    }
  }

  // --- level generation --------------------------------------------------
  //  Builds a COMPLETE ring: one gap arc + SOLID_SEGMENTS equal wedges that
  //  together cover exactly 2π. Danger wedges are placed at random slots; the
  //  gap always occupies real angular space, it is simply never drawn.
  generateLevel(depth) {
    const tier = getDifficultyTier(depth);
    const gapSpan = Phaser.Math.DegToRad(tier.gapWidth);
    const gapCenter = Math.random() * TWO_PI;
    const gapEnd = gapCenter + gapSpan / 2;   // solid wedges start here, sweep round

    const n = GAME_CONFIG.SOLID_SEGMENTS;
    const solidSpan = TWO_PI - gapSpan;
    const each = solidSpan / n;

    let dangerCount = randomInt(tier.dangerCount[0], tier.dangerCount[1]);
    if (depth < GAME_CONFIG.SAFE_INTRO_LEVELS) dangerCount = 0;
    dangerCount = Math.min(dangerCount, n - 1);   // keep >=1 landable wedge
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

    return { depth, y: depth * GAME_CONFIG.LEVEL_HEIGHT, segments, isBounceLevel };
  }

  // ---- collision (geometry only) ----------------------------------------
  //  The cat is fixed at world angle FRONT_ANGLE; the tower spins under it, so
  //  the cat's angle in the tower's LOCAL frame is (FRONT_ANGLE - rotation).
  getSegmentAt(depth) {
    const level = this.levels[depth];
    if (!level) return null;
    const frontLocal = normalizeAngle(GAME_CONFIG.FRONT_ANGLE - this.rotation);
    for (const seg of level.segments) {
      if (seg.broken) continue;
      if (angleInArc(frontLocal, seg.startAngle, seg.endAngle)) return seg;
    }
    return null; // gap (or all wedges broken) — fall through
  }

  destroySegment(segment) { if (segment) segment.broken = true; }

  clearLevel(depth) {
    const level = this.levels[depth];
    if (level) level.segments.forEach((s) => { s.broken = true; });
  }

  destroy() {
    this.levels = {};
    if (this.ringG) { this.ringG.destroy(); this.ringG = null; }
    if (this.treatG) { this.treatG.destroy(); this.treatG = null; }
  }

  // ---- render ------------------------------------------------------------
  //  Each level is a complete donut ring: draw every non-broken, non-gap wedge
  //  as a solid annular sector. Pseudo-3D: levels below the cat shrink and fade
  //  slightly for a "looking down the tube" feel. Deepest first so nearer rings
  //  paint over farther ones.
  render(camY, ballY) {
    if (!this.ringG) return;
    const g = this.ringG;
    g.clear();
    this.treatG.clear();

    const cx = GAME_CONFIG.TOWER_CENTER_X;
    const H = this.scene.scale.height;
    const R = GAME_CONFIG.TOWER_RADIUS;
    const rIn = GAME_CONFIG.POST_RADIUS;
    const span = GAME_CONFIG.LEVELS_AHEAD * GAME_CONFIG.LEVEL_HEIGHT;

    const depths = Object.keys(this.levels).map(Number).sort((a, b) => b - a);

    for (const depth of depths) {
      const level = this.levels[depth];
      const cy = (level.y - camY) - GAME_CONFIG.RIM_OFFSET;
      if (cy < -R * 1.9 || cy > H + R * 1.9) continue;   // offscreen

      const rel = (level.y - ballY) / span;
      const scale = Phaser.Math.Clamp(1 - rel * 0.55, 0.4, 1.12);
      const alpha = Phaser.Math.Clamp(1 - Math.max(rel, 0) * 0.85, 0.14, 1);
      const rOut = R * scale;
      const rInner = rIn * scale;

      for (const seg of level.segments) {
        if (seg.broken || seg.type === SEGMENT_TYPE.GAP) continue;  // gap = draw nothing

        let color = SEGMENT_COLOR[seg.type];
        if (seg.type === SEGMENT_TYPE.SAFE && depth % 2 === 1) {
          color = GAME_CONFIG.COLOR_PLATFORM_SAFE_ALT;  // alternate shade for readability
        }
        const a0 = seg.startAngle + this.rotation;
        const a1 = seg.endAngle + this.rotation;

        // filled wedge
        g.fillStyle(color, alpha);
        fillArcRing(g, cx, cy, rInner, rOut, a0, a1);

        // soft light rim so adjacent wedges / stacked rings stay legible
        g.lineStyle(2, 0xffffff, 0.5 * alpha);
        g.beginPath();
        g.arc(cx, cy, rOut, a0, a1, false);
        g.arc(cx, cy, rInner, a1, a0, true);
        g.closePath();
        g.strokePath();
      }

      this._drawTreats(level, cx, cy, rInner, rOut, alpha);
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
}
