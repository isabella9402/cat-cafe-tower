/* =========================================================================
 *  Cat — the falling character (Helix "ball").
 *
 *  Uses the real cat_* PNG poses when loaded, with a generated placeholder
 *  (and finally a Graphics circle) as graceful fallbacks.  Moves only
 *  vertically; the player rotates the tower, never the cat.
 * ========================================================================= */

const CAT_DISPLAY_SIZE = 60;   // target on-screen height (px)

class Cat {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;                 // fixed at tower centre (screen)
    this.y = y;                 // WORLD y (grows downward)
    this.velocityY = 0;

    this.isFireMode = false;
    this.fireModeTimer = 0;
    this.combo = 0;
    this.state = 'idle';
    this.wobble = null;

    // rotating fire aura behind the cat (generated ring; cat_fire also has a
    // baked aura). Hidden until fire mode.
    this.aura = null;
    if (hasTex(scene, 'auraRing')) {
      this.aura = scene.add.image(x, y, 'auraRing').setDepth(99998).setVisible(false);
    }

    // main sprite: real pose -> placeholder -> Graphics circle
    if (hasTex(scene, CAT_TEX.idle) || hasTex(scene, 'catPlaceholder')) {
      const key = hasTex(scene, CAT_TEX.idle) ? CAT_TEX.idle : 'catPlaceholder';
      this.sprite = scene.add.image(x, y, key).setDepth(100000);
      this._usingGraphics = false;
      this._applyScale();
    } else {
      // last-resort Graphics circle
      this.sprite = scene.add.graphics().setDepth(100000);
      this.sprite.fillStyle(GAME_CONFIG.COLOR_CAT, 1);
      this.sprite.fillCircle(0, 0, GAME_CONFIG.CAT_RADIUS);
      this.sprite.x = x; this.sprite.y = y;
      this._usingGraphics = true;
    }
  }

  // scale an image sprite so its height ≈ CAT_DISPLAY_SIZE
  _applyScale() {
    if (this._usingGraphics || !this.sprite.height) return;
    this.baseScale = CAT_DISPLAY_SIZE / this.sprite.height;
    this.sprite.setScale(this.baseScale);
  }

  // Swap pose: 'idle' | 'falling' | 'fire' | 'gameover'
  setState(state) {
    if (this.state === state) return;
    this.state = state;
    if (!this._usingGraphics) {
      const key = CAT_TEX[state];
      if (hasTex(this.scene, key)) {
        this.sprite.setTexture(key);
        this._applyScale();
      }
    }
    // wobble only while falling
    if (state === 'falling') this._startWobble();
    else this._stopWobble();
  }

  _startWobble() {
    if (this.wobble || this._usingGraphics) return;
    this.sprite.setAngle(-5);
    this.wobble = this.scene.tweens.add({
      targets: this.sprite, angle: 5, duration: 200,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  _stopWobble() {
    if (this.wobble) { this.wobble.stop(); this.wobble = null; }
    if (!this._usingGraphics) this.sprite.setAngle(0);
  }

  // Per-frame physics + fire-mode timer.  dt in seconds.
  update(dt) {
    if (this.isFireMode) {
      this.fireModeTimer -= dt;
      this.velocityY = GAME_CONFIG.FIRE_MODE_SPEED;   // constant fast dive
      if (this.fireModeTimer <= 0) this.exitFireMode();
    } else {
      this.velocityY = Math.min(
        this.velocityY + GAME_CONFIG.GRAVITY * dt,
        GAME_CONFIG.MAX_FALL_SPEED
      );
    }
    this.y += this.velocityY * dt;
    if (this.aura && this.aura.visible) this.aura.rotation += dt * 1.2; // slow spin
  }

  // Bounce up off a safe/booster platform.  Resets the combo (canonical).
  bounce(force) {
    this.velocityY = -force;
    this.combo = 0;
    this.squash();
  }

  // A gap was cleared: build combo, arm fire mode at the threshold.
  onGapPassed() {
    this.combo++;
    if (this.combo >= GAME_CONFIG.COMBO_FOR_FIRE_MODE && !this.isFireMode) {
      this.enterFireMode();
    }
  }

  enterFireMode() {
    this.isFireMode = true;
    this.fireModeTimer = GAME_CONFIG.FIRE_MODE_DURATION;
    this.setState('fire');
    if (this.aura) this.aura.setVisible(true).setAlpha(0.9);
  }

  exitFireMode() {
    this.isFireMode = false;
    this.fireModeTimer = 0;
    this.combo = 0;                 // combo resets when fire ends
    this.setState(this.velocityY > 0 ? 'falling' : 'idle');
    if (this.aura) this.aura.setVisible(false);
  }

  // Combo score multiplier (applied to gap score).
  comboMultiplier() {
    const c = this.combo;
    if (c >= 10) return 3.0;
    if (c >= 7)  return 2.0;
    if (c >= 4)  return 1.5;
    return 1.0;
  }

  squash() {
    if (this._usingGraphics) return;
    const s = this.baseScale || 1;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: s * 1.2, scaleY: s * 0.78,
      duration: 90, yoyo: true, ease: 'Quad.out',
    });
  }

  die() {
    this.isFireMode = false;
    this.fireModeTimer = 0;
    this._stopWobble();
    this.scene.tweens.killTweensOf(this.sprite);
    if (this.aura) this.aura.setVisible(false);
    if (!this._usingGraphics) {
      this.state = 'gameover';
      if (hasTex(this.scene, CAT_TEX.gameover)) this.sprite.setTexture(CAT_TEX.gameover);
      this._applyScale();
    }
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.velocityY = 0;
    this.combo = 0;
    this.isFireMode = false;
    this.fireModeTimer = 0;
    this._stopWobble();
    this.state = 'idle';
    if (this.aura) this.aura.setVisible(false).setRotation(0);
    if (!this._usingGraphics) {
      if (hasTex(this.scene, CAT_TEX.idle)) this.sprite.setTexture(CAT_TEX.idle);
      this._applyScale();
      this.sprite.setAngle(0).setAlpha(1);
    }
  }

  // Place the sprite (and aura) on screen (screenY = world y - camera y).
  setScreenPos(x, screenY) {
    if (this._usingGraphics) { this.sprite.x = x; this.sprite.y = screenY; }
    else { this.sprite.x = x; this.sprite.y = screenY; }
    if (this.aura) { this.aura.x = x; this.aura.y = screenY; }
  }
}
