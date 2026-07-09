/* =========================================================================
 *  assetMap — central mapping of logical keys -> real PNG/JPG files.
 *
 *  Only keys whose files ACTUALLY exist in /assets are listed; missing ones are
 *  left commented with "TODO: add later" and the code falls back to Graphics /
 *  generated textures (see BootScene + the `hasTex` guard used everywhere).
 *
 *  The /assets PNGs are the chroma-keyed output of scripts/process_assets.py
 *  (transparent RGBA).  The B-series and F-series .jpg files are raw concept art
 *  (opaque) and are intentionally NOT loaded.
 * ========================================================================= */

const ASSET_MAP = {
  images: {
    // --- cat character poses ---
    catIdle:     'assets/cat_idle.png',
    catFalling:  'assets/cat_falling.png', // falling pose (file was renamed cat_fall -> cat_falling)
    catFire:     'assets/cat_fire.png',    // aura + laser eyes baked in
    catGameover: 'assets/cat_over.png',    // (file is cat_over.png)
    catBall:     'assets/cat_ball.png',    // rolled-up bounce pose (menu/extra)

    // --- platform tiers (full top-down DONUT discs, masked to arcs at runtime) ---
    //  Safe rings pick a random variant per level for variety ("xen kẽ"). All the
    //  platform_safe_v* are centre-holed donuts, de-hazed + scaled offline so
    //  their outer radius matches the danger/bounce discs (no bulge, no halo).
    platformSafe:   'assets/tower_normal.png',
    platformSafe2:  'assets/platform_safe_v2.png',
    platformSafe3:  'assets/platform_safe_v3.png',
    platformSafe4:  'assets/platform_safe_v4.png',
    platformSafe5:  'assets/platform_safe_v5.png',
    platformSafe6:  'assets/platform_safe_v6.png',
    platformSafe7:  'assets/platform_safe_v7.png',
    platformSafe8:  'assets/platform_safe_v8.png',
    platformSafe9:  'assets/platform_safe_v9.png',
    platformSafe10: 'assets/platform_safe_v10.png',
    platformSafe11: 'assets/platform_safe_v11.png',
    platformSafe12: 'assets/platform_safe_v12.png',
    platformDanger: 'assets/tower_danger.png',
    platformBounce: 'assets/tower_cushion.png',

    // --- items / UI ---
    coin:  'assets/ui_coin.png',   // pancake-coin, used as the score icon
    stageIcon: 'assets/coin.png',  // pink swirl candy — used as the depth/stage icon
    logo:  'assets/logov2.png',    // "Cat Tower" wordmark
    play:  'assets/ui_play.png',   // pink play button
    fishTreat: 'assets/fish_treat.png',  // golden fish treat (dark matte removed offline -> transparent)
    // panel:     'assets/panel.png',       // TODO: add later (-> Graphics rounded panel)
    // button:    'assets/button.png',      // TODO: add later (-> Graphics button)

    // --- background (processed JPGs; morning is the default) ---
    bgMorning: 'assets/bg_morning.jpg',
    bgDawn:    'assets/bg_dawn.jpg',
    bgSunset:  'assets/bg_sunset.jpg',
    bgNight:   'assets/bg_night.jpg',
  },

  // Sprite sheets (grid of frames).  vfx_sparkle is a clean 4x2 / 128x129 grid.
  spritesheets: {
    vfxSparkle: { path: 'assets/sparkle.png', frameWidth: 128, frameHeight: 129 }, // renamed from vfx_sparkle.png (512x258 = 4x2 grid)
    // vfx_fire_aura / vfx_smoke / vfx_confetti / vfx_laser are also sheets but on
    // irregular grids — kept as generated particle textures for now.
    // TODO: slice vfx_fire_aura (rotating ring), vfx_confetti, vfx_laser later.
  },
};

// logical cat state -> loaded texture key
const CAT_TEX = {
  idle:     'catIdle',
  falling:  'catFalling',
  fire:     'catFire',
  gameover: 'catGameover',
};

// segment type -> platform disc texture key
const PLATFORM_TEX = {
  [SEGMENT_TYPE.SAFE]:   'platformSafe',
  [SEGMENT_TYPE.DANGER]: 'platformDanger',
  [SEGMENT_TYPE.BOUNCE]: 'platformBounce',
};

// segment type -> fallback fill colour (used when the texture is missing)
const SEGMENT_COLOR = {
  [SEGMENT_TYPE.SAFE]:   GAME_CONFIG.COLOR_PLATFORM_SAFE,
  [SEGMENT_TYPE.DANGER]: GAME_CONFIG.COLOR_PLATFORM_DANGER,
  [SEGMENT_TYPE.BOUNCE]: GAME_CONFIG.COLOR_PLATFORM_BOUNCE,
};

// generated fallback particle texture keys (always created in BootScene)
const TEX = {
  P_DOT:   'p_dot',
  P_STAR:  'p_star',
  P_CONF:  'p_conf',
  P_SMOKE: 'p_smoke',
};
