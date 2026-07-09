/* =========================================================================
 *  Tower — the rotating stack of level rings for the top-down Helix descent.
 *
 *  A "level" is a full 360° ring at worldY = depth * LEVEL_HEIGHT, divided into
 *  segments that tile the circle exactly (applyCut guarantees 2π coverage with
 *  no overlaps or holes). One or more arcs are the GAP (type 'gap' — real
 *  angular space that is simply never drawn); the rest are SAFE / DANGER /
 *  BOUNCE wedges.
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

    // central scratching post (behind the rings; shows through the holes/gaps)
    this.postGraphics = scene.add.graphics().setDepth(-150);

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

  // Recycle passed levels, extend the tower ahead of the cat.
  update(dt, catY) {
    const cull = catY - GAME_CONFIG.LEVELS_BEHIND * GAME_CONFIG.LEVEL_HEIGHT;
    this.levels = this.levels.filter((l) => {
      if (l.y < cull) { this._disposeLevel(l); return false; }
      return true;
    });

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

  // --- level generation: guaranteed full-circle coverage -----------------
  generateLevel(depth) {
    const tier = getDifficultyTier(depth);
    const gapWidthRad = Phaser.Math.DegToRad(tier.gapWidth);
    let dangerCount = randomInt(tier.dangerCount[0], tier.dangerCount[1]);
    if (depth < GAME_CONFIG.SAFE_INTRO_LEVELS) dangerCount = 0;   // fair intro
    const dangerWidthRad = Phaser.Math.DegToRad(30);

    // start as a single full-circle safe segment, then cut pieces out of it
    let segments = [{ startAngle: 0, endAngle: TWO_PI, type: SEGMENT_TYPE.SAFE }];

    const gapStart = Math.random() * TWO_PI;
    segments = this.applyCut(segments, gapStart, gapStart + gapWidthRad, SEGMENT_TYPE.GAP);

    for (let i = 0; i < dangerCount; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const dStart = Math.random() * TWO_PI;
        const dEnd = dStart + dangerWidthRad;
        if (this.isAllType(segments, dStart, dEnd, SEGMENT_TYPE.SAFE)) {
          segments = this.applyCut(segments, dStart, dEnd, SEGMENT_TYPE.DANGER);
          break;
        }
      }
    }

    const isBounceLevel =
      depth >= GAME_CONFIG.BOUNCE_BOOSTER_MIN_DEPTH &&
      Math.random() < GAME_CONFIG.BOUNCE_BOOSTER_CHANCE;
    if (isBounceLevel) {
      segments.forEach((s) => { if (s.type === SEGMENT_TYPE.SAFE) s.type = SEGMENT_TYPE.BOUNCE; });
    }

    if (depth >= GAME_CONFIG.FISH_TREAT_MIN_DEPTH &&
        Math.random() < GAME_CONFIG.FISH_TREAT_CHANCE) {
      const safes = segments.filter((s) => s.type === SEGMENT_TYPE.SAFE || s.type === SEGMENT_TYPE.BOUNCE);
      if (safes.length) safes[randomInt(0, safes.length - 1)].hasTreat = true;
    }

    const level = {
      depth, y: depth * GAME_CONFIG.LEVEL_HEIGHT,
      segments, isBounceLevel,
      container: null, masks: [], treatSprites: [],
    };
    this.buildLevelVisuals(level);
    return level;
  }

  // Replace the type of the arc [cutStart, cutEnd] wherever it overlaps
  // existing segments, splitting them as needed. Handles the 0/2π seam by
  // recursing on the two halves.
  applyCut(segments, cutStart, cutEnd, newType) {
    cutStart = normalizeAngle(cutStart);
    cutEnd = normalizeAngle(cutEnd);
    // A wrapped cut (crosses the 0/2π seam) becomes two non-wrapping cuts.
    // NOTE: normalizeAngle(2π) === 0, so we must NOT re-run applyCut with 2π as
    // an argument (it would wrap again forever) — cut the raw ranges directly.
    if (cutStart > cutEnd) {
      const r = this._cutRange(segments, cutStart, TWO_PI, newType);
      return this._cutRange(r, 0, cutEnd, newType);
    }
    return this._cutRange(segments, cutStart, cutEnd, newType);
  }

  // Cut a single non-wrapping range [cutStart, cutEnd] (0 <= start <= end <= 2π).
  _cutRange(segments, cutStart, cutEnd, newType) {
    if (cutEnd - cutStart < 1e-9) return segments;
    const result = [];
    for (const seg of segments) {
      if (seg.endAngle <= cutStart || seg.startAngle >= cutEnd) { result.push(seg); continue; }
      if (seg.startAngle >= cutStart && seg.endAngle <= cutEnd) {
        result.push({ startAngle: seg.startAngle, endAngle: seg.endAngle, type: newType, hasTreat: seg.hasTreat });
        continue;
      }
      if (seg.startAngle < cutStart) {
        result.push({ startAngle: seg.startAngle, endAngle: cutStart, type: seg.type, hasTreat: seg.hasTreat });
      }
      result.push({
        startAngle: Math.max(seg.startAngle, cutStart),
        endAngle: Math.min(seg.endAngle, cutEnd),
        type: newType,
      });
      if (seg.endAngle > cutEnd) {
        result.push({ startAngle: cutEnd, endAngle: seg.endAngle, type: seg.type, hasTreat: seg.hasTreat });
      }
    }
    return result;
  }

  // True if the whole arc [testStart, testEnd] lies within segments of the
  // required type (used to avoid dropping a danger on top of the gap).
  isAllType(segments, testStart, testEnd, requiredType) {
    testStart = normalizeAngle(testStart);
    testEnd = normalizeAngle(testEnd);
    if (testStart > testEnd) return false;   // skip seam-crossing candidates
    for (const seg of segments) {
      if (seg.endAngle <= testStart || seg.startAngle >= testEnd) continue;
      if (seg.type !== requiredType) return false;
    }
    return true;
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
      const key = PLATFORM_TEX[type];

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

  // Fire-mode smash: burst of chunks, turn the wedge into a gap, rebuild.
  destroySegment(level, segment) {
    const midA = (segment.startAngle + segment.endAngle) / 2 + this.rotation;
    const r = (this.outerRadius + this.innerRadius) / 2;
    const screenY = (level.y - this._camY) - GAME_CONFIG.RIM_OFFSET;
    const burstX = this.centerX + Math.cos(midA) * r;
    const burstY = screenY + Math.sin(midA) * r;

    let color = GAME_CONFIG.COLOR_PLATFORM_SAFE;
    if (segment.type === SEGMENT_TYPE.DANGER) color = GAME_CONFIG.COLOR_PLATFORM_DANGER;
    else if (segment.type === SEGMENT_TYPE.BOUNCE) color = GAME_CONFIG.COLOR_PLATFORM_BOUNCE;

    const pieces = randomInt(8, 12);
    for (let i = 0; i < pieces; i++) {
      const angle = Math.random() * TWO_PI;
      const dist = randomInRange(80, 150);
      const size = randomInRange(10, 20);
      const chunk = this.scene.add.graphics().setDepth(60);
      chunk.fillStyle(color, 1);
      chunk.fillCircle(0, 0, size);
      chunk.setPosition(burstX, burstY);
      this.scene.tweens.add({
        targets: chunk,
        x: burstX + Math.cos(angle) * dist,
        y: burstY + Math.sin(angle) * dist + 100,
        alpha: 0, scale: 0.2, duration: 600, ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }

    segment.type = SEGMENT_TYPE.GAP;
    segment.hasTreat = false;
    this._disposeLevelVisuals(level);
    this.buildLevelVisuals(level);
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

    this._drawPost(camY, H);
  }

  // Continuous scratching-post spine with scrolling sisal bands.
  _drawPost(camY, H) {
    const g = this.postGraphics;
    const x = this.centerX, W = 30;
    g.clear();
    g.fillStyle(GAME_CONFIG.COLOR_POST, 1);
    g.fillRoundedRect(x - W / 2, -10, W, H + 20, 8);
    const BAND = 46, bandH = 15;
    for (let k = Math.floor(camY / BAND) - 1; k * BAND - camY < H + BAND; k++) {
      const y = k * BAND - camY;
      g.fillStyle(0xF3ECDD, 0.85);
      g.fillRoundedRect(x - W / 2, y, W, bandH, 5);
    }
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
