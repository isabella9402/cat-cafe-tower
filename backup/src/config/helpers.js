/* =========================================================================
 *  helpers — shared math + UI helpers (global, classic script)
 * ========================================================================= */

const TWO_PI = Math.PI * 2;

// Keep an angle in [0, 2π).
function normalizeAngle(a) {
  a = a % TWO_PI;
  return a < 0 ? a + TWO_PI : a;
}

// Is `angle` inside the arc [startAngle, endAngle]?  Handles wrap-around.
function angleInArc(angle, startAngle, endAngle) {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e; // arc crosses the 0 seam
}

// Return the difficulty tier object whose minDepth is the largest <= depth.
function getDifficultyTier(depth) {
  const tiers = GAME_CONFIG.DIFFICULTY_TIERS;
  let chosen = tiers[0];
  for (let i = 0; i < tiers.length; i++) {
    if (depth >= tiers[i].minDepth) chosen = tiers[i];
  }
  return chosen;
}

// Random float in [min, max).
function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

// Random integer in [min, max] (inclusive).
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Pick `count` distinct indices out of [0, n).  Returns a Set.
function pickDistinct(n, count) {
  const pool = [];
  for (let i = 0; i < n; i++) pool.push(i);
  const out = new Set();
  count = Math.min(count, n);
  for (let k = 0; k < count; k++) {
    const j = randomInt(0, pool.length - 1);
    out.add(pool[j]);
    pool.splice(j, 1);
  }
  return out;
}

// Interpolate two 0xRRGGBB colours; t in [0,1].  Returns an int.
function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

// Fill an annular sector (ring wedge) on a Phaser Graphics object.
//   g       : Phaser.GameObjects.Graphics (fillStyle already set by caller)
//   cx, cy  : centre
//   rIn/rOut: inner / outer radius
//   a0, a1  : start / end angle (radians, a0 < a1 sweep clockwise on screen)
function fillArcRing(g, cx, cy, rIn, rOut, a0, a1) {
  g.beginPath();
  g.arc(cx, cy, rOut, a0, a1, false);
  g.arc(cx, cy, rIn, a1, a0, true);
  g.closePath();
  g.fillPath();
}

// True if a loaded texture with this key exists (and isn't the __MISSING stub).
function hasTex(scene, key) {
  return !!key && scene.textures.exists(key);
}

// Return `preferred` if that texture exists, else `fallback` (for graceful VFX).
function texKey(scene, preferred, fallback) {
  return hasTex(scene, preferred) ? preferred : fallback;
}

// Soft cream / pastel gradient background (matches the kawaii café theme).
function addPastelBackground(scene, depth = -100) {
  const w = scene.scale.width, h = scene.scale.height;
  const g = scene.add.graphics().setDepth(depth);
  g.fillGradientStyle(
    GAME_CONFIG.COLOR_BG_TOP, GAME_CONFIG.COLOR_BG_TOP,
    GAME_CONFIG.COLOR_BG_BOTTOM, GAME_CONFIG.COLOR_BG_BOTTOM, 1
  );
  g.fillRect(0, 0, w, h);
  // faint floor shadow to ground the scene
  g.fillStyle(0x000000, 0.05);
  g.fillEllipse(w / 2, h - 40, w * 0.9, 90);
  return g;
}

// Puffy pastel rounded button with a label. Returns a container.
function makeButton(scene, x, y, label, opts = {}) {
  const wBtn = opts.width || 240;
  const hBtn = opts.height || 64;
  const fill = opts.fill != null ? opts.fill : GAME_CONFIG.COLOR_FIRE;
  const g = scene.add.graphics();
  const draw = (color, oy) => {
    g.clear();
    g.fillStyle(0x000000, 0.12); g.fillRoundedRect(-wBtn / 2, -hBtn / 2 + 6, wBtn, hBtn, 22);
    g.fillStyle(0xffffff, 1);    g.fillRoundedRect(-wBtn / 2, -hBtn / 2 + oy, wBtn, hBtn, 22);
    g.fillStyle(color, 1);       g.fillRoundedRect(-wBtn / 2 + 5, -hBtn / 2 + 5 + oy, wBtn - 10, hBtn - 10, 18);
  };
  draw(fill, 0);
  // label uses the shared buttonKo kawaii style (Do Hyeon), size overridable
  const bs = (typeof FONT_STYLES !== 'undefined') ? FONT_STYLES.buttonKo : null;
  const txt = scene.add.text(0, 0, label, {
    fontFamily: bs ? bs.fontFamily : FONT.TITLE,
    fontSize: (opts.fontSize || (bs ? parseInt(bs.fontSize, 10) : 24)) + 'px',
    color: bs ? bs.color : '#ffffff',
    stroke: bs ? bs.stroke : '#00000022',
    strokeThickness: bs ? bs.strokeThickness : 2,
  }).setOrigin(0.5);

  const c = scene.add.container(x, y, [g, txt]).setSize(wBtn, hBtn);
  c.setInteractive(new Phaser.Geom.Rectangle(-wBtn / 2, -hBtn / 2, wBtn, hBtn), Phaser.Geom.Rectangle.Contains);
  c.on('pointerover', () => draw(fill, -2));
  c.on('pointerout', () => draw(fill, 0));
  c.on('pointerdown', () => { draw(fill, 3); if (opts.onClick) opts.onClick(); });
  return c;
}
