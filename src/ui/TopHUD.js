/* =========================================================================
 *  TopHUD — persistent top header band (classic script global).
 *
 *  A full-width strip pinned to the top of the screen, rendered ABOVE every
 *  other object in the scene (tower, platforms, cat, clouds, particles, FX).
 *  Holds three live stats: FLOOR (left), SCORE (centre, hero), COMBO (right).
 *
 *  The cat sprite lives at depth 100000 (see Cat.js), so the band must sit
 *  above that — HUD_DEPTH is set well beyond it. The band background is baked
 *  into a canvas texture (gradient + rounded bottom corners + accent line +
 *  soft drop shadow + faint cloud/paw decorations); stats are Text/Image
 *  objects in a screen-pinned Container that never scrolls with the world.
 *
 *  Icons use real textures (never emoji glyphs, which render as tofu here):
 *  stageIcon → floor, coin → score, the generated p_star → combo.
 * ========================================================================= */

const HUD_DEPTH = 1000000;   // above the cat (100000), aura, vignette — everything
const HUD_BAND_KEY = 'topHUDBand';

class TopHUD {
  constructor(scene) {
    this.scene = scene;

    this._floor = 0;
    this._score = 0;
    this._combo = 0;

    // screen-pinned container that owns every HUD child
    this.container = scene.add.container(0, 0)
      .setDepth(HUD_DEPTH)
      .setScrollFactor(0);

    // band background (canvas texture, built in _layout)
    this.band = scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0);
    this.container.add(this.band);

    // FLOOR slot (left): icon + label + value
    this.floorSlot = scene.add.container(0, 0);
    this.floorIcon = this._mkIcon('stageIcon');
    this.floorLabel = this._mkLabel('FLOOR');
    this.floorValue = this._mkNumber('#C44569');
    this._addAll(this.floorSlot, [this.floorIcon, this.floorLabel, this.floorValue]);

    // SCORE slot (centre, hero): paw-coin icon + value (no text label)
    this.scoreSlot = scene.add.container(0, 0);
    this.scoreIcon = this._mkIcon('coin') || this._mkIcon('p_star');
    this.scoreValue = this._mkNumber('#E84A7F');
    this._addAll(this.scoreSlot, [this.scoreIcon, this.scoreValue]);

    // COMBO slot (right): sparkle icon + label + value
    this.comboSlot = scene.add.container(0, 0);
    this.comboIcon = this._mkIcon('p_star');
    if (this.comboIcon) this.comboIcon.setTint(0xFF8C42);
    this.comboLabel = this._mkLabel('COMBO');
    this.comboValue = this._mkNumber('#FF8C42');
    this._addAll(this.comboSlot, [this.comboIcon, this.comboLabel, this.comboValue]);

    this.container.add([this.floorSlot, this.scoreSlot, this.comboSlot]);

    // first layout + keep it laid out across resizes / orientation changes
    this._layout();
    this._onResize = () => this._layout();
    scene.scale.on('resize', this._onResize);
    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());

    this.setFloor(0);
    this.setScore(0);
    this.setCombo(0);
  }

  _addAll(container, items) { container.add(items.filter(Boolean)); }

  // --- element factories ------------------------------------------------
  _mkNumber(color) {
    return this.scene.add.text(0, 0, '0', {
      fontFamily: '"Kkukkukk", "Black Han Sans", "Jua", sans-serif',
      color, stroke: '#FFFFFF', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  _mkLabel(text) {
    const t = this.scene.add.text(0, 0, text, {
      fontFamily: '"Kkukkukk", "Do Hyeon", "Jua", sans-serif', color: '#B5677B',
    }).setOrigin(0, 0.5);
    if (t.setLetterSpacing) t.setLetterSpacing(1);
    return t;
  }

  _mkIcon(key) {
    if (!hasTex(this.scene, key)) return null;
    return this.scene.add.image(0, 0, key).setOrigin(0.5);
  }

  // --- layout (called on construct + every resize) ----------------------
  _layout() {
    const scene = this.scene;
    this.width = scene.scale.width;
    this.height = scene.scale.height;
    this.bandH = Math.round(this.height * 0.12);   // ~12% of screen height

    this._buildBandTexture();
    this.band.setTexture(HUD_BAND_KEY).setPosition(0, 0);

    const bandH = this.bandH;
    const topY = Math.round(bandH * 0.30);   // icon + label row
    const valY = Math.round(bandH * 0.66);   // number row
    const scoreSize = Math.round(bandH * 0.55);
    const sideSize = Math.round(bandH * 0.45);
    const labelSize = Math.max(10, Math.round(bandH * 0.18));
    const iconH = Math.round(bandH * 0.22);

    // FLOOR (~15% from left) — icon + label pair on top, value below
    this.floorSlot.setPosition(Math.round(this.width * 0.15), 0);
    this.floorValue.setFontSize(sideSize).setPosition(0, valY);
    this.floorLabel.setFontSize(labelSize);
    this._pairIconLabel(this.floorIcon, this.floorLabel, iconH, topY);

    // SCORE (centred, hero) — big paw-coin icon on top, biggest value below
    this.scoreSlot.setPosition(Math.round(this.width * 0.5), 0);
    this.scoreValue.setFontSize(scoreSize).setPosition(0, valY);
    if (this.scoreIcon) {
      const h = this.scoreIcon.height || 1;
      this.scoreIcon.setScale((bandH * 0.30) / h).setPosition(0, topY);
    }

    // COMBO (~15% from right) — icon + label pair on top, value below
    this.comboSlot.setPosition(Math.round(this.width * 0.85), 0);
    this.comboValue.setFontSize(sideSize).setPosition(0, valY);
    this.comboLabel.setFontSize(labelSize);
    this._pairIconLabel(this.comboIcon, this.comboLabel, iconH, topY);
  }

  // Centre an [icon][label] pair horizontally around x=0 at row `y`.
  _pairIconLabel(icon, label, iconH, y) {
    const gap = 5;
    let iw = 0;
    if (icon) { icon.setScale(iconH / (icon.height || 1)); iw = icon.displayWidth; }
    const lw = label.width;
    const total = iw + (icon ? gap : 0) + lw;
    const startX = -total / 2;
    if (icon) icon.setPosition(startX + iw / 2, y);
    label.setPosition(startX + iw + (icon ? gap : 0), y);   // label origin is (0, .5)
  }

  // Bake the band background into a canvas texture: peach→rose gradient, rounded
  // bottom corners, a rose accent line, a soft drop shadow, and faint decorations.
  _buildBandTexture() {
    const scene = this.scene;
    const w = this.width, h = this.bandH, r = 18, shadowPad = 14;
    const th = h + shadowPad;

    if (scene.textures.exists(HUD_BAND_KEY)) scene.textures.remove(HUD_BAND_KEY);
    const cv = scene.textures.createCanvas(HUD_BAND_KEY, w, th);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, th);

    // band path: square top corners, rounded bottom corners
    const bandPath = (dy) => {
      ctx.beginPath();
      ctx.moveTo(0, dy);
      ctx.lineTo(w, dy);
      ctx.lineTo(w, h - r + dy);
      ctx.quadraticCurveTo(w, h + dy, w - r, h + dy);
      ctx.lineTo(r, h + dy);
      ctx.quadraticCurveTo(0, h + dy, 0, h - r + dy);
      ctx.closePath();
    };

    // soft drop shadow (band shifted down, blurred)
    ctx.save();
    if ('filter' in ctx) ctx.filter = 'blur(6px)';
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    bandPath(5);
    ctx.fill();
    ctx.restore();

    // band gradient (clip to the rounded shape)
    ctx.save();
    bandPath(0);
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#FFE4D6');    // creamy peach (top)
    grad.addColorStop(1, '#FFC9D9');    // warm rose (bottom)
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // faint decorations (cloud puffs + a paw print) at low alpha
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#FFFFFF';
    this._cloud(ctx, w * 0.30, h * 0.36, h * 0.15);
    this._cloud(ctx, w * 0.63, h * 0.62, h * 0.12);
    this._paw(ctx, w * 0.40, h * 0.66, h * 0.09);
    ctx.globalAlpha = 1;
    ctx.restore();

    // bottom rose accent line (follows the rounded bottom edge)
    ctx.save();
    ctx.strokeStyle = '#F5A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, h - r);
    ctx.quadraticCurveTo(0, h, r, h);
    ctx.lineTo(w - r, h);
    ctx.quadraticCurveTo(w, h, w, h - r);
    ctx.stroke();
    ctx.restore();

    cv.refresh();
  }

  _cloud(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x - r, y, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x, y - r * 0.4, r, 0, Math.PI * 2);
    ctx.arc(x + r, y, r * 0.85, 0, Math.PI * 2);
    ctx.rect(x - r * 1.8, y, r * 3.6, r);
    ctx.fill();
  }

  _paw(ctx, x, y, r) {
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r, r * 0.85, 0, 0, Math.PI * 2);   // main pad
    ctx.fill();
    for (const [dx, dy] of [[-r, -r * 0.5], [-r * 0.35, -r], [r * 0.35, -r], [r, -r * 0.5]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r * 0.42, 0, Math.PI * 2);           // toes
      ctx.fill();
    }
  }

  // --- public API -------------------------------------------------------
  setFloor(n) {
    this._floor = n;
    this.floorValue.setText('' + n);
  }

  setScore(n) {
    const grew = n > this._score;
    this._score = n;
    this.scoreValue.setText('' + n);
    if (grew) this._pulse(this.scoreValue, 1.18);   // hero stat reacts to gains
  }

  // pulses when the combo climbs; dims the whole slot at 0/1 (no active combo)
  setCombo(n) {
    const prev = this._combo;
    this._combo = n;
    this.comboValue.setText('×' + n);
    this.comboSlot.setAlpha(n <= 1 ? 0.5 : 1);
    if (n > prev && n > 1) this._pulse(this.comboValue, 1.15);
  }

  _pulse(obj, to) {
    this.scene.tweens.killTweensOf(obj);
    obj.setScale(1);
    this.scene.tweens.add({
      targets: obj, scaleX: to, scaleY: to, duration: 100, yoyo: true, ease: 'Quad.out',
    });
  }

  show() { this.container.setVisible(true); }
  hide() { this.container.setVisible(false); }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._onResize) this.scene.scale.off('resize', this._onResize);
    if (this.container) this.container.destroy(true);
    if (this.scene.textures.exists(HUD_BAND_KEY)) this.scene.textures.remove(HUD_BAND_KEY);
  }
}

if (typeof window !== 'undefined') {
  window.TopHUD = TopHUD;
  window.HUD_DEPTH = HUD_DEPTH;
}
