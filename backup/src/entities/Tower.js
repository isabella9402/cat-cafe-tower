/* =========================================================================
 *  Tower — the rotating stack of level rings for the top-down Helix descent.
 *
 *  A "level" is a full 360° ring at worldY = depth * LEVEL_HEIGHT: one GAP arc
 *  (type 'gap' — real angular space that is simply never drawn) followed by
 *  SOLID_SEGMENTS equal wedges, each SAFE / DANGER / BOUNCE. Danger wedges are
 *  spread out among the safe ones so the ring reads as alternating slices
 *  ("xen kẽ"). gap + wedges tile 2π exactly (no overlaps/holes).
 *
 *  As the cat drops below a level, that level shatters into a burst of chunks
 *  and is removed immediately (shatterPassedLevels) — so the space above the
 *  cat stays clean, like canonical Helix Jump.
 *
 *  RENDERING (canonical Helix look): each level owns a Phaser container. Per
 *  platform type we add ONE full-ring PNG (tower_normal / tower_danger /
 *  tower_cushion) clipped by a geometry mask built from the union of that
 *  type's wedges. The mask is an annular sector at exactly innerRadius..
 *  outerRadius, so all three textures are clipped to the SAME ring and align
 *  (an earlier build masked beyond the rim, which let the danger disc bulge
 *  past the safe ring). When a texture is missing we fall back to a solid
 *  Graphics fill of the same annular sector. Collision is geometry-only.
 * ========================================================================= */

class Tower {
  constructor(scene) {
    this.scene = scene;
    this.levels = [];                 // array of level objects
    this.rotation = 0;                // radians
    this._camY = 0;                   // last camY passed to render (for burst placement)

    this.centerX = GAME_CONFIG.TOWER_CENTER_X;
    this.outerRadius = GAME_CONFIG.TOWER_RADIUS;
    this.innerRadius = GAME_CONFIG.POST_RADIUS;

    // coded central post (smooth cylinder, drawn behind the rings; shows through
    // the small ring holes + gaps, like the Helix column)
    this.postGraphics = scene.add.graphics().setDepth(5).setAlpha(0.7);
    this._postW = 0;

    // Each level randomly picks one of these safe-ring designs for variety
    // ("xen kẽ random"). Excludes platformSafe (tower_normal) & platformSafe12 —
    // their art has a scratching-post nub in the centre that would clash with
    // the coded post; the rest are clean centre-holed donuts.
    this.safeTexPool = ['platformSafe2', 'platformSafe3', 'platformSafe4',
      'platformSafe5', 'platformSafe6', 'platformSafe7', 'platformSafe8', 'platformSafe9',
      'platformSafe10', 'platformSafe11'].filter((k) => hasTex(scene, k));
    if (!this.safeTexPool.length) this.safeTexPool = [PLATFORM_TEX[SEGMENT_TYPE.SAFE]];

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  reset() {
    this.levels.forEach((l) => this._disposeLevel(l));
    this.levels = [];
    this.rotation = 0;
  }

  // Instant, inertia-free rotation (canonical Helix: stops the moment the drag
  // ends). Keep the angle wrapped to [0, 2π).
  rotate(deltaRadians) {
    this.rotation = ((this.rotation + deltaRadians) % TWO_PI + TWO_PI) % TWO_PI;
  }

  // Extend the tower ahead of the cat. Passed levels are removed by
  // shatterPassedLevels() (called after collision), not culled here.
  update(dt, catY) {
    const targetY = catY + GAME_CONFIG.LEVELS_AHEAD * GAME_CONFIG.LEVEL_HEIGHT;
    let nextDepth = this.levels.length ? Math.max(...this.levels.map((l) => l.depth)) + 1 : 1;
    let deepestY = this.levels.length ? Math.max(...this.levels.map((l) => l.y)) : -Infinity;
    while (deepestY < targetY) {
      const lvl = this.generateLevel(nextDepth);
      this.levels.push(lvl);
      deepestY = lvl.y;
      nextDepth++;
    }
  }

  // --- level generation: gap + evenly-spaced wedges, danger interleaved ---
  //  The non-gap arc is split into SOLID_SEGMENTS equal wedges; danger wedges
  //  are spread out among them so each ring reads as alternating safe/danger
  //  slices (the canonical Helix "xen kẽ" look). gap + wedges tile 2π exactly.
  generateLevel(depth) {
    const tier = getDifficultyTier(depth);
    const gapSpan = Phaser.Math.DegToRad(tier.gapWidth);
    const gapStart = Math.random() * TWO_PI;
    const gapEnd = gapStart + gapSpan;             // wedges begin here, sweep round

    const n = GAME_CONFIG.SOLID_SEGMENTS;
    const each = (TWO_PI - gapSpan) / n;

    let dangerCount = randomInt(tier.dangerCount[0], tier.dangerCount[1]);
    if (depth < GAME_CONFIG.SAFE_INTRO_LEVELS) dangerCount = 0;   // fair intro
    dangerCount = Math.min(dangerCount, n - 1);                   // keep >=1 landable wedge
    const dangerSlots = this._dangerSlots(n, dangerCount);        // spread out for alternation

    const isBounceLevel =
      depth >= GAME_CONFIG.BOUNCE_BOOSTER_MIN_DEPTH &&
      Math.random() < GAME_CONFIG.BOUNCE_BOOSTER_CHANCE;

    const segments = [{
      startAngle: normalizeAngle(gapStart), endAngle: normalizeAngle(gapEnd),
      type: SEGMENT_TYPE.GAP, hasTreat: false,
    }];
    for (let k = 0; k < n; k++) {
      const a0 = gapEnd + k * each;
      let type;
      if (dangerSlots.has(k)) type = SEGMENT_TYPE.DANGER;
      else type = isBounceLevel ? SEGMENT_TYPE.BOUNCE : SEGMENT_TYPE.SAFE;
      segments.push({
        startAngle: normalizeAngle(a0), endAngle: normalizeAngle(a0 + each),
        type, hasTreat: false,
      });
    }

    if (depth >= GAME_CONFIG.FISH_TREAT_MIN_DEPTH &&
        Math.random() < GAME_CONFIG.FISH_TREAT_CHANCE) {
      const safes = segments.filter((s) => s.type === SEGMENT_TYPE.SAFE || s.type === SEGMENT_TYPE.BOUNCE);
      if (safes.length) safes[randomInt(0, safes.length - 1)].hasTreat = true;
    }

    const level = {
      depth, y: depth * GAME_CONFIG.LEVEL_HEIGHT,
      segments, isBounceLevel,
      safeTex: this.safeTexPool[randomInt(0, this.safeTexPool.length - 1)],  // per-level variety
      container: null, masks: [], treatSprites: [], shattered: false,
    };
    this.buildLevelVisuals(level);
    return level;
  }

  // Choose `count` wedge indices out of `n`, spread evenly (with a random phase)
  // so danger wedges alternate with safe ones instead of clumping.
  _dangerSlots(n, count) {
    const set = new Set();
    if (count <= 0) return set;
    const step = n / count;
    let pos = Math.random() * n;
    for (let i = 0; i < count; i++) { set.add(Math.floor(pos) % n); pos += step; }
    while (set.size < count) set.add(randomInt(0, n - 1));   // fill if rounding collided
    return set;
  }

  // --- visuals: one container per level, sprite+mask per type ------------
  buildLevelVisuals(level) {
    const scene = this.scene;
    const container = scene.add.container(0, 0);
    level.masks = [];
    level.treatSprites = [];

    const byType = {};
    for (const seg of level.segments) {
      if (seg.type === SEGMENT_TYPE.GAP) continue;
      (byType[seg.type] || (byType[seg.type] = [])).push(seg);
    }

    for (const type of Object.keys(byType)) {
      const segs = byType[type];
      // safe wedges use this level's chosen variant; danger/bounce are fixed
      const key = (type === SEGMENT_TYPE.SAFE && level.safeTex) ? level.safeTex : PLATFORM_TEX[type];

      if (hasTex(scene, key)) {
        const sprite = scene.add.image(0, 0, key);
        sprite.setDisplaySize(this.outerRadius * 2.3, this.outerRadius * 2.3);
        const mask = scene.add.graphics();
        mask.fillStyle(0xffffff, 1);
        for (const s of segs) this._fillRingArc(mask, s.startAngle, s.endAngle);
        mask.setVisible(false);
        sprite.setMask(mask.createGeometryMask());
        container.add(sprite);
        level.masks.push(mask);
      } else {
        const g = scene.add.graphics();
        let color = SEGMENT_COLOR[type];
        if (type === SEGMENT_TYPE.SAFE && level.depth % 2 === 1) color = GAME_CONFIG.COLOR_PLATFORM_SAFE_ALT;
        g.fillStyle(color, 1);
        for (const s of segs) this._fillRingArc(g, s.startAngle, s.endAngle);
        container.add(g);
      }
    }

    // treats (fish) — bob gently; ride the container's rotation/scale
    for (const seg of level.segments) {
      if (!seg.hasTreat) continue;
      const midA = (seg.startAngle + seg.endAngle) / 2;
      const r = (this.outerRadius + this.innerRadius) / 2;
      const tx = Math.cos(midA) * r, ty = Math.sin(midA) * r;
      let treat;
      if (hasTex(scene, 'fishTreat')) {
        treat = scene.add.image(tx, ty, 'fishTreat').setDisplaySize(38, 38);
      } else {
        treat = scene.add.graphics();
        treat.fillStyle(GAME_CONFIG.COLOR_TREAT, 1);
        treat.fillCircle(0, 0, 11);
        treat.fillTriangle(-11, 0, -20, -8, -20, 8);
        treat.setPosition(tx, ty);
      }
      scene.tweens.add({ targets: treat, y: ty - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      container.add(treat);
      level.treatSprites.push({ obj: treat, baseX: tx, baseY: ty });
    }

    level.container = container;
  }

  // fill one annular-sector wedge (outer arc CW, inner arc CCW, closed)
  _fillRingArc(g, a0, a1) {
    g.beginPath();
    g.arc(0, 0, this.outerRadius, a0, a1, false);
    g.arc(0, 0, this.innerRadius, a1, a0, true);
    g.closePath();
    g.fillPath();
  }

  // ---- collision (geometry only) ----------------------------------------
  //  The cat is fixed at world angle FRONT_ANGLE; the tower spins under it, so
  //  the cat's angle in the tower's LOCAL frame is (FRONT_ANGLE - rotation).
  getSegmentAt(worldY) {
    let level = null;
    for (const l of this.levels) {
      if (Math.abs(l.y - worldY) < GAME_CONFIG.LEVEL_HEIGHT / 2) { level = l; break; }
    }
    if (!level) return null;
    const frontLocal = normalizeAngle(GAME_CONFIG.FRONT_ANGLE - this.rotation);
    for (const seg of level.segments) {
      if (angleInArc(frontLocal, seg.startAngle, seg.endAngle)) return { level, segment: seg };
    }
    return null;
  }

  // Spray a burst of coloured chunks outward from one wedge (the signature
  // Helix "break apart"). Positions are screen-space (camera is at scrollY 0).
  _wedgeBurst(level, segment, pieces) {
    const midA = (segment.startAngle + segment.endAngle) / 2 + this.rotation;
    const r = (this.outerRadius + this.innerRadius) / 2;
    const screenY = (level.y - this._camY) - GAME_CONFIG.RIM_OFFSET;
    const burstX = this.centerX + Math.cos(midA) * r;
    const burstY = screenY + Math.sin(midA) * r;

    let color = GAME_CONFIG.COLOR_PLATFORM_SAFE;
    if (segment.type === SEGMENT_TYPE.DANGER) color = GAME_CONFIG.COLOR_PLATFORM_DANGER;
    else if (segment.type === SEGMENT_TYPE.BOUNCE) color = GAME_CONFIG.COLOR_PLATFORM_BOUNCE;

    for (let i = 0; i < pieces; i++) {
      const angle = Math.random() * TWO_PI;
      const dist = randomInRange(60, 140);
      const size = randomInRange(6, 15);
      const chunk = this.scene.add.graphics().setDepth(60);
      chunk.fillStyle(color, 1);
      chunk.fillCircle(0, 0, size);
      chunk.setPosition(burstX, burstY);
      this.scene.tweens.add({
        targets: chunk,
        x: burstX + Math.cos(angle) * dist,
        y: burstY + Math.sin(angle) * dist + 100,
        alpha: 0, scale: 0.2, duration: 520, ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }

  // Fire-mode smash: burst one wedge into chunks, turn it into a gap, rebuild.
  destroySegment(level, segment) {
    this._wedgeBurst(level, segment, randomInt(8, 12));
    segment.type = SEGMENT_TYPE.GAP;
    segment.hasTreat = false;
    this._disposeLevelVisuals(level);
    this.buildLevelVisuals(level);
  }

  // The cat has dropped past these levels: shatter each remaining wedge into a
  // spray of chunks and remove the level immediately (canonical Helix — the
  // ring above the ball breaks apart and vanishes the moment you fall below it).
  shatterPassedLevels(catY) {
    const remaining = [];
    for (const lvl of this.levels) {
      if (!lvl.shattered && catY - lvl.y > 2) {
        for (const seg of lvl.segments) {
          if (seg.type !== SEGMENT_TYPE.GAP) this._wedgeBurst(lvl, seg, randomInt(3, 5));
        }
        lvl.shattered = true;
        this._disposeLevelVisuals(lvl);   // ring disappears; chunks live on their own tweens
      } else {
        remaining.push(lvl);
      }
    }
    this.levels = remaining;
  }

  // Smash every wedge of a level (fish-treat clear). Rebuild once.
  clearLevel(depth) {
    const level = this.levels.find((l) => l.depth === depth);
    if (!level) return;
    level.segments.forEach((s) => { s.type = SEGMENT_TYPE.GAP; s.hasTreat = false; });
    this._disposeLevelVisuals(level);
    this.buildLevelVisuals(level);
  }

  // Remove a collected treat and refresh that level's visuals.
  collectTreat(level, segment) {
    segment.hasTreat = false;
    this._disposeLevelVisuals(level);
    this.buildLevelVisuals(level);
  }

  getLevel(depth) { return this.levels.find((l) => l.depth === depth) || null; }

  // ---- render ------------------------------------------------------------
  render(camY, ballY) {
    this._camY = camY;
    this.centerX = GAME_CONFIG.TOWER_CENTER_X;
    const scene = this.scene;
    const H = scene.scale.height;
    const R = this.outerRadius;
    const catScreenY = H * GAME_CONFIG.CAT_SCREEN_Y_RATIO;

    const minDepth = this.levels.length ? Math.min(...this.levels.map((l) => l.depth)) : 0;

    for (const level of this.levels) {
      if (!level.container) continue;
      const screenY = level.y - camY;
      const cy = screenY - GAME_CONFIG.RIM_OFFSET;

      if (cy < -R * 2 || cy > H + R * 2) { level.container.setVisible(false); continue; }
      level.container.setVisible(true);

      // pseudo-3D: levels below the cat shrink + fade; above just fade
      const dist = screenY - catScreenY;
      let scale = 1.0, alpha = 1.0;
      if (dist > 0) {
        const t = Math.min(1, dist / (H * 0.8));
        scale = 1.0 - t * 0.35;
        alpha = 1.0 - t * 0.4;
      } else {
        const t = Math.min(1, Math.abs(dist) / (H * 0.3));
        alpha = 1.0 - t * 0.8;
      }

      const c = level.container;
      c.setPosition(this.centerX, cy).setRotation(this.rotation).setScale(scale).setAlpha(alpha);
      c.setDepth(40 - (level.depth - minDepth));   // nearer levels paint on top, always below HUD/fx

      for (const mask of level.masks) {
        mask.setPosition(this.centerX, cy).setRotation(this.rotation).setScale(scale);
      }
    }

    this._drawPost(H);
  }

  // Central "sisal post" like the Helix column: a solid tan cylinder that fills
  // the ring holes, wrapped in lighter rounded segment-bands that SCROLL with the
  // world (this._camY) so the post reads as moving vertically past the falling cat
  // (like the reference). A left-of-centre highlight -> darker right edge fakes the
  // round 3D tube. Redraws every frame because the bands depend on _camY.
  _drawPost(H) {
    const W = 30;   // thin sisal post — fixed width (decoupled from the ring-hole radius)
    const g = this.postGraphics;
    g.clear();
    const x = this.centerX;
    const left = x - W / 2;
    const camY = this._camY;

    // 1) solid dark backing — guarantees the ring hole is always covered (grooves)
    g.fillStyle(0xB0824A, 1);
    g.fillRect(left, -20, W, H + 40);

    // 2) stacked rounded segment-bands, scrolling with the world (the "vertebrae")
    const SEG = 52, gap = 7, segH = SEG - gap;
    for (let k = Math.floor(camY / SEG) - 1; k * SEG - camY < H + SEG; k++) {
      const y = k * SEG - camY;
      g.fillStyle(0xC79A5E, 1); g.fillRoundedRect(left, y, W, segH, 9);                          // edge shadow
      g.fillStyle(0xE7C489, 1); g.fillRoundedRect(left + W * 0.08, y + 1, W * 0.84, segH - 2, 8); // mid body
      g.fillStyle(0xF6ECD6, 1); g.fillRoundedRect(left + W * 0.20, y + 1, W * 0.34, segH - 2, 7); // left highlight
    }

    // 3) soft off-centre sheen for the rounded-tube look
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(x - W * 0.22, -20, W * 0.12, H + 40);
  }

  // ---- lifecycle ---------------------------------------------------------
  _disposeLevelVisuals(level) {
    if (level.treatSprites) level.treatSprites.forEach((t) => this.scene.tweens.killTweensOf(t.obj));
    if (level.container) { level.container.destroy(true); level.container = null; }
    if (level.masks) level.masks.forEach((m) => m.destroy());
    level.masks = [];
    level.treatSprites = [];
  }

  _disposeLevel(level) { this._disposeLevelVisuals(level); }

  destroy() {
    this.levels.forEach((l) => this._disposeLevel(l));
    this.levels = [];
    if (this.postGraphics) { this.postGraphics.destroy(); this.postGraphics = null; }
  }
}
