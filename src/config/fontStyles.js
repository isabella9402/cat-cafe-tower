/* =========================================================================
 *  fontStyles — reusable Phaser text style objects (classic script global).
 *
 *  Kawaii Korean typography for the pastel cat-café theme:
 *    Black Han Sans → bold impact titles      Do Hyeon → rounded headings/HUD
 *    Gaegu          → handwritten hints        Poor Story → casual captions
 *    Jua            → body text                Fredoka   → English / numbers
 *
 *  NOTE: Phaser's TextStyle ignores `alpha` (apply with setAlpha) and reads
 *  `lineSpacing` only in 3.60+ (we also call setLineSpacing to be safe).
 *  Passing a FONT_STYLES object straight to scene.add.text() is fine — Phaser
 *  copies it and never mutates the shared object.
 * ========================================================================= */

const FONT_STYLES = {
  // Big impact title (game name)
  titleEn: {
    fontFamily: 'Fredoka', fontSize: '56px', fontStyle: '700',
    color: '#FF6B9D', stroke: '#FFFFFF', strokeThickness: 6,
    shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true, alpha: 0.15 },
  },
  titleKo: {
    fontFamily: '"Black Han Sans", sans-serif', fontSize: '36px',
    color: '#FFB6C1', stroke: '#FFFFFF', strokeThickness: 3,
  },

  // Section headers
  headingKo: {
    fontFamily: '"Do Hyeon", sans-serif', fontSize: '28px', color: '#5b3a29',
  },

  // Body text
  bodyKo: {
    fontFamily: '"Jua", sans-serif', fontSize: '20px', color: '#5b3a29',
  },

  // Hint / instruction (playful handwritten feel)
  hintKo: {
    fontFamily: '"Gaegu", cursive', fontSize: '22px', fontStyle: '700', color: '#8B5A3C',
  },

  // Small captions
  captionKo: {
    fontFamily: '"Poor Story", cursive', fontSize: '16px', color: '#8B5A3C', alpha: 0.8,
  },

  // Score number (big, punchy)
  scoreNumber: {
    fontFamily: 'Fredoka', fontSize: '48px', fontStyle: '700',
    color: '#FF6B9D', stroke: '#FFFFFF', strokeThickness: 4,
  },

  // Best score display
  bestScore: {
    fontFamily: '"Do Hyeon", sans-serif', fontSize: '24px', color: '#FF8FA3',
  },

  // Depth / HUD counter
  hudCounter: {
    fontFamily: '"Do Hyeon", sans-serif', fontSize: '22px', color: '#5b3a29',
  },

  // Button text
  buttonKo: {
    fontFamily: '"Do Hyeon", sans-serif', fontSize: '26px',
    color: '#FFFFFF', stroke: '#FF6B9D', strokeThickness: 2,
  },
};

// Small helper: add a text object from a FONT_STYLES entry, applying the parts
// Phaser's TextStyle doesn't (alpha, lineSpacing) and any per-call overrides.
//   opts: { origin, alpha, lineSpacing, depth, ...styleOverrides }
function addStyledText(scene, x, y, text, style, opts = {}) {
  const merged = Object.assign({}, style, opts.style || {});
  const t = scene.add.text(x, y, text, merged);
  const o = opts.origin;
  if (o == null) t.setOrigin(0.5);
  else if (typeof o === 'object') t.setOrigin(o.x, o.y);
  else t.setOrigin(o);
  const alpha = opts.alpha != null ? opts.alpha : style.alpha;
  if (alpha != null) t.setAlpha(alpha);
  if (opts.lineSpacing != null) t.setLineSpacing(opts.lineSpacing);
  if (opts.depth != null) t.setDepth(opts.depth);
  return t;
}

if (typeof window !== 'undefined') {
  window.FONT_STYLES = FONT_STYLES;
  window.addStyledText = addStyledText;
}
