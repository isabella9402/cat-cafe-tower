/* =========================================================================
 *  BootScene — load the real PNG/JPG assets (with a pink progress bar and a
 *  non-fatal loaderror handler), generate fallback particle textures, gate on
 *  the Korean web-fonts, then hand off to the Menu.
 *
 *  Missing assets never crash the game: loaderror is caught and logged, and
 *  every consumer checks hasTex(...) before using a sprite (Graphics fallback).
 * ========================================================================= */

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setBackgroundColor('#FFE5EC');

    // --- loading bar -----------------------------------------------------
    const barW = 260, barH = 22;
    const bx = w / 2 - barW / 2, by = h / 2;
    this.add.rectangle(w / 2, by, barW, barH, 0xffffff, 0.6).setStrokeStyle(2, 0xff9ec0);
    const bar = this.add.rectangle(bx + 4, by, 2, barH - 8, 0xff6b9d).setOrigin(0, 0.5);
    this.add.text(w / 2, by - 40, TXT.LOADING, {
      fontFamily: FONT.BODY, fontSize: '22px', color: '#5b3a29',
    }).setOrigin(0.5);
    this.load.on('progress', (v) => { bar.width = Math.max(2, (barW - 8) * v); });

    // --- non-fatal error handling ---------------------------------------
    this._missing = [];
    this.load.on('loaderror', (file) => {
      this._missing.push(file.key);
      console.warn('[Cat Café Tower] Missing asset (using fallback):', file.key, file.src);
    });

    // --- queue images + sprite sheets from the asset map ----------------
    const imgs = ASSET_MAP.images || {};
    Object.keys(imgs).forEach((key) => this.load.image(key, imgs[key]));

    const sheets = ASSET_MAP.spritesheets || {};
    Object.keys(sheets).forEach((key) => {
      const s = sheets[key];
      this.load.spritesheet(key, s.path, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    });
  }

  create() {
    // Generated fallback textures — always present so emitters/entities that
    // fall back never reference a missing key.
    this._makeParticleTextures();
    this._makePlaceholderCat();
    this._makeAuraTexture();

    const loaded = this.textures.getTextureKeys()
      .filter((k) => k !== '__DEFAULT' && k !== '__MISSING' && k !== '__WHITE');
    console.log('[Cat Café Tower] 로드된 텍스처(' + loaded.length + '):', loaded.join(', '));
    if (this._missing.length) console.warn('[Cat Café Tower] 누락(fallback):', this._missing.join(', '));

    // Advance to the Menu once the kawaii fonts have loaded — but NEVER hang.
    // Two independent triggers, guarded so they can't double-fire:
    //   1) the font-load promise (nice: no fallback-glyph flash)
    //   2) a Phaser game-clock timer (guaranteed: fires as soon as the render
    //      loop runs, even if a font promise stalls or document.fonts is odd)
    this._advanced = false;
    const go = () => {
      if (this._advanced) return;
      this._advanced = true;
      const overlay = document.getElementById('loading');
      if (overlay) overlay.style.display = 'none';
      this.scene.start('Menu');   // scene key is 'Menu' (NOT 'MenuScene')
    };

    try {
      const fontLoads = [
        document.fonts.load('400 32px "Black Han Sans"'),
        document.fonts.load('400 32px "Do Hyeon"'),
        document.fonts.load('700 32px "Gaegu"'),
        document.fonts.load('400 32px "Gaegu"'),
        document.fonts.load('400 32px "Jua"'),
        document.fonts.load('400 32px "Poor Story"'),
        document.fonts.load('700 32px "Fredoka"'),
      ].map((p) => (p && p.catch ? p.catch(() => {}) : Promise.resolve()));
      Promise.allSettled(fontLoads).then(() => document.fonts.ready).catch(() => {}).finally(go);
    } catch (e) {
      console.warn('[Cat Café Tower] font preload skipped:', e);
    }

    // Guaranteed fallback on the Phaser clock (runs with the render loop).
    this.time.delayedCall(1500, go);
  }

  // Placeholder cat (white circle + face) generated under a distinct key so
  // Cat.js can fall back to it if catIdle failed to load.
  _makePlaceholderCat() {
    if (this.textures.exists('catPlaceholder')) return;
    const R = 40, size = R * 2 + 8, cx = size / 2, cy = size / 2;
    const g = this.make.graphics({ add: false });
    // ears
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(cx - R * 0.7, cy - R * 0.5, cx - R * 0.15, cy - R * 0.95, cx - R * 0.15, cy - R * 0.35);
    g.fillTriangle(cx + R * 0.7, cy - R * 0.5, cx + R * 0.15, cy - R * 0.95, cx + R * 0.15, cy - R * 0.35);
    g.fillStyle(0xffffff, 1); g.fillCircle(cx, cy, R * 0.82);
    g.fillStyle(0xffb3c6, 0.8);
    g.fillCircle(cx - R * 0.42, cy + R * 0.18, R * 0.15);
    g.fillCircle(cx + R * 0.42, cy + R * 0.18, R * 0.15);
    g.fillStyle(0x3a2a20, 1);
    g.fillCircle(cx - R * 0.3, cy - R * 0.08, R * 0.11);
    g.fillCircle(cx + R * 0.3, cy - R * 0.08, R * 0.11);
    g.fillStyle(0xff8fab, 1);
    g.fillTriangle(cx - 4, cy + R * 0.1, cx + 4, cy + R * 0.1, cx, cy + R * 0.18);
    g.generateTexture('catPlaceholder', size, size);
    g.destroy();
  }

  // A notched orange "magic-circle" ring — asymmetric so slow rotation reads.
  // Sits behind the cat in fire mode (complements cat_fire's baked aura).
  _makeAuraTexture() {
    if (this.textures.exists('auraRing')) return;
    const S = 160, c = S / 2;
    const g = this.make.graphics({ add: false });
    g.lineStyle(6, GAME_CONFIG.COLOR_FIRE, 0.55);
    g.strokeCircle(c, c, c - 12);
    g.lineStyle(3, 0xFFD166, 0.5);
    g.strokeCircle(c, c, c - 24);
    // radial ticks (the asymmetry that makes rotation visible)
    g.lineStyle(5, GAME_CONFIG.COLOR_FIRE, 0.6);
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI / 6) * i;
      const r0 = c - 10, r1 = c - (i % 2 ? 20 : 30);
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
      g.strokePath();
    }
    g.generateTexture('auraRing', S, S);
    g.destroy();
  }

  _makeParticleTextures() {
    let g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
    g.generateTexture(TEX.P_DOT, 16, 16); g.destroy();

    g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    const cx = 12, cy = 12, R = 12, r = 3.2;
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? R : r;
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fillPath();
    g.generateTexture(TEX.P_STAR, 24, 24); g.destroy();

    g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 10, 14);
    g.generateTexture(TEX.P_CONF, 10, 14); g.destroy();

    g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1); g.fillCircle(16, 16, 16);
    g.generateTexture(TEX.P_SMOKE, 32, 32); g.destroy();
  }
}
