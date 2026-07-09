/* =========================================================================
 *  Cat Café Tower — constants  (canonical Helix-Jump rebuild)
 *  Classic script: every top-level const is a global shared across <script>s.
 *
 *  All tunables live in GAME_CONFIG.  Segment kinds live in SEGMENT_TYPE.
 *  Korean player-facing copy lives in TXT, fonts in FONT.
 * ========================================================================= */

const GAME_CONFIG = {
  // --- World / layout -----------------------------------------------------
  TOWER_RADIUS: 178,        // outer radius of a level ring (px)
  TOWER_CENTER_X: 0,        // set to width/2 at runtime (see GameScene)
  POST_RADIUS: 46,          // inner hole radius (no post now — smaller hole = fuller ring)
  RIM_OFFSET: 92,           // ring centre sits this far ABOVE the cat contact line
  LEVEL_HEIGHT: 155,        // world Y distance between levels
  LEVELS_AHEAD: 12,         // levels pre-generated below the cat
  LEVELS_BEHIND: 3,         // levels kept above the cat before recycling
  FRONT_ANGLE: Math.PI / 2, // the "under the cat" angle (points down on screen)

  // --- Cat physics --------------------------------------------------------
  GRAVITY: 1800,            // px / s^2
  BOUNCE_FORCE: 900,        // upward velocity on a safe bounce
  BOUNCE_BOOST_MULT: 1.5,   // mint cushion / bounce-booster multiplier
  MAX_FALL_SPEED: 1200,     // terminal downward velocity
  FIRE_MODE_SPEED: 1400,    // constant fall speed while in fire mode
  CAT_SCREEN_Y_RATIO: 0.30, // cat stays at 30% from the top of the screen
  CAT_RADIUS: 26,           // cat display radius (px)

  // --- Fire mode (power jump) --------------------------------------------
  COMBO_FOR_FIRE_MODE: 4,   // canonical Helix Jump threshold
  FIRE_MODE_DURATION: 3.0,  // seconds

  // --- Input --------------------------------------------------------------
  ROTATION_SENSITIVITY: 0.005, // radians of tower spin per px dragged
  ROTATION_FRICTION: 0.9,      // rotationSpeed *= this each idle frame (inertia)

  // --- Scoring ------------------------------------------------------------
  SCORE_PER_GAP: 20,
  SCORE_PER_DESTROY: 50,
  SCORE_PER_TREAT: 100,

  // --- Difficulty (tiers indexed by depth) --------------------------------
  DIFFICULTY_TIERS: [
    { minDepth:  0, dangerCount: [0, 1], gapWidth: 120 },
    { minDepth: 10, dangerCount: [1, 2], gapWidth:  90 },
    { minDepth: 30, dangerCount: [2, 3], gapWidth:  60 },
    { minDepth: 50, dangerCount: [3, 4], gapWidth:  45 },
  ],
  // solid wedges that fill the non-gap arc.  Must be >= (max dangerCount)+1 so
  // the "keep >=1 landable wedge" clamp still lets the top tier reach 4 danger.
  SOLID_SEGMENTS: 5,

  BOUNCE_BOOSTER_CHANCE: 0.10, // 10% at depth >= 20
  BOUNCE_BOOSTER_MIN_DEPTH: 20,
  FISH_TREAT_CHANCE: 0.05,     // 5% at depth >= 30
  FISH_TREAT_MIN_DEPTH: 30,
  TREAT_CLEAR_LEVELS: 5,       // levels a fish treat clears below itself

  SAFE_INTRO_LEVELS: 2,     // first N levels are guaranteed danger-free

  // --- Colours (kawaii pastel palette) ------------------------------------
  COLOR_BG_TOP:            0xFFE5EC,
  COLOR_BG_BOTTOM:         0xFFF5E1,
  COLOR_PLATFORM_SAFE:     0xFFC9DE,
  COLOR_PLATFORM_SAFE_ALT: 0xFFB3D1, // alternating shade for readability
  COLOR_PLATFORM_DANGER:   0xC53030,
  COLOR_PLATFORM_BOUNCE:   0xC9E4CA,
  COLOR_CAT:               0xFFFFFF,
  COLOR_FIRE:              0xFF6B35,
  COLOR_POST:              0xD4A373, // scratching post
  COLOR_TREAT:            0xFFD166,  // fish treat
  COLOR_EDGE:             0x00000022,

  BEST_KEY: 'catCafeTower_bestScore',
};

// Segment kinds -------------------------------------------------------------
const SEGMENT_TYPE = {
  SAFE:   'safe',
  DANGER: 'danger',
  GAP:    'gap',
  BOUNCE: 'bounce',
};

// Korean-friendly cute fonts, graceful fallback to system Hangul offline.
const FONT = {
  TITLE: '"Fredoka", "Jua", "Do Hyeon", "Malgun Gothic", sans-serif',
  BODY:  '"Jua", "Do Hyeon", "Malgun Gothic", sans-serif',
  NUM:   '"Fredoka", "Jua", "Malgun Gothic", sans-serif',
};

// All player-facing copy (한국어)
const TXT = {
  LOADING:    '불러오는 중...',
  TITLE:      'Cat Café Tower',
  SUBTITLE:   '캣 카페 타워',
  TAP_START:  '탭하여 시작 · Tap to start',
  HOW_TO:     '① 드래그로 탑을 빙글 돌려요',
  HOW_TO_2:   '② 빈틈으로 냥이를 쏙 떨어뜨려요',
  HOW_TO_3:   '③ 빨간 곳은 피해요! 연속 통과하면 🔥',
  BEST:       '최고 점수',
  SCORE:      '점수',
  DEPTH:      '깊이',
  FLOOR_UNIT: '단',
  FIRE:       '파이어 모드! 🔥',
  COMBO:      '콤보',
  GAME_OVER:  '게임 오버',
  NEW_RECORD: '신기록! 🎉',
  REPLAY:     '다시 하기 · Retry',
  HOME:       '메뉴 · Menu',
};
