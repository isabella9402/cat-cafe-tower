## 🎯 Nhiệm Vụ

Build một game **hyper-casual web** tên **Cat Café Tower** bằng **Phaser 3** (JavaScript, no build step nếu được — chỉ HTML + JS + Phaser CDN, để deploy chỉ cần upload static files).

**Pitch:** Điều khiển mèo mochi nhảy lên đỉnh tháp bánh pancake, xoay tháp và canh timing để né bánh cháy. Combo cao kích hoạt Fire Mode phun laser xuyên phá platform.

**Mục tiêu MVP:** Playable prototype chơi được trong browser, mobile-friendly (touch controls), 1 file `index.html` deploy được ngay lên GitHub Pages/Netlify.

---

## 📁 Setup Project

**Thư mục làm việc:** `C:\Users\isabe\Downloads\Cat Cafe`

**Assets có sẵn** trong thư mục này. Đầu tiên hãy `ls` để xem cấu trúc asset thực tế, rồi tạo mapping vào code. Đừng giả định tên file — đọc thực tế từ ổ đĩa.

**Cấu trúc project cần tạo:**
```
Cat Cafe/
├── index.html              # Entry point, load Phaser từ CDN
├── src/
│   ├── main.js             # Phaser config + scene registration
│   ├── scenes/
│   │   ├── BootScene.js    # Preload assets
│   │   ├── MenuScene.js    # Start screen
│   │   ├── GameScene.js    # Core gameplay
│   │   └── GameOverScene.js
│   ├── entities/
│   │   ├── Cat.js          # Player character logic
│   │   └── Tower.js        # Tower + platforms generation
│   └── config/
│       ├── constants.js    # Gravity, speeds, colors, scoring
│       └── assetMap.js     # Map tên file asset → key Phaser
├── assets/                 # Existing assets (đã có)
└── README.md
```

Dùng ES6 modules (`<script type="module">`). Không cần bundler cho MVP.

---

## 🎮 Core Gameplay Spec

### Điều khiển
- **Kéo ngang** (touch drag hoặc mouse drag) → xoay tháp trái/phải
- **Tap/click** → mèo nhảy lên (chỉ khi mèo đang chạm platform)
- **Giữ tap ≥ 300ms** → slow-mo 1 giây (timeScale = 0.4), giới hạn 3 lần/run, hồi 1 charge mỗi 5 combo

### Camera & View
- **2D top-down** nhìn từ trên xuống tháp
- Camera cố định ở tâm màn hình, tháp xoay quanh trục Y (thực chất là rotate group container)
- Mèo luôn ở vị trí cố định trên màn hình (center-ish), tháp scroll xuống khi mèo "leo lên"

### Core Loop (chi tiết)
1. Mèo mochi spawn ở platform đáy tháp (platform 0)
2. Player tap → mèo bật nhảy lên theo parabol (velocity Y âm, gravity kéo xuống)
3. Player kéo xoay tháp để **khe hở của platform kế tiếp** nằm đúng đường bay của mèo
4. Nhảy qua khe sạch = **+1 combo**, `score += 10 + heightBonus`
5. **Perfect jump** (tap trong 100ms sau khi chạm platform) = **+2 combo**, `score += 30`
6. Chạm rìa pancake (không phải khe) = **combo reset về 0**, mèo rơi ngược xuống 1 tầng
7. **Combo ≥ 3** → **Fire Mode 🔥** kích hoạt 3 giây:
   - Mèo phun laser (hitbox mở rộng)
   - Xuyên phá **mọi** platform kể cả bánh cháy đỏ
   - Vòng lửa aura quanh mèo (particle effect)
8. Chạm **bánh cháy đỏ** khi KHÔNG Fire Mode = **Game Over**
9. Bounce pad xanh mint (10% spawn rate) = nhảy trúng bật cao gấp 2, tự động qua 2 tầng
10. Mỗi **10 tầng leo lên** = **checkpoint**, đổi background theme

### Scoring Formula
```javascript
score = (currentHeight * 10) + (maxCombo * 50) + (perfectJumpCount * 20)
```

### Difficulty Scaling (endless)
- Height 0–20: khe hở 90° arc, 0% bánh cháy
- Height 20–50: khe hở 70°, 15% bánh cháy
- Height 50–100: khe hở 55°, 25% bánh cháy, tháp tự xoay chậm 5°/s
- Height 100+: khe hở 45°, 35% bánh cháy, auto-rotate 10°/s

### Constants đề xuất
```javascript
// src/config/constants.js
export const GAME = {
  WIDTH: 400,
  HEIGHT: 700,
  GRAVITY: 900,
  JUMP_VELOCITY: -600,
  PERFECT_JUMP_WINDOW_MS: 100,
  SLOW_MO_SCALE: 0.4,
  SLOW_MO_DURATION_MS: 1000,
  FIRE_MODE_DURATION_MS: 3000,
  FIRE_MODE_COMBO_THRESHOLD: 3,
  BOUNCE_PAD_SPAWN_RATE: 0.10,
  PLATFORM_GAP_Y: 120,      // khoảng cách giữa platform
  PLATFORM_RADIUS: 160,     // bán kính vòng tròn pancake
};

export const COLORS = {
  BG_MORNING: 0xFFE5EC,
  BG_SUNSET:  0xF7C59F,
  BG_NIGHT:   0x4A3B6E,
  BG_DAWN:    0xFFB627,
  PANCAKE:    0xFFB627,
  BURNT:      0x8B4513,
  BOUNCE:     0xC9E4CA,
  FIRE:       0xFF4500,
};
```

---

## 🎨 Art Direction (cho code, không phải asset creation)

Assets đã có — code chỉ cần load đúng và apply đúng chỗ.

- **Background**: gradient sky 4 theme, chuyển mỗi 10 tầng
- **Platform (pancake)**: sprite tròn, có thể tint để tạo variation
- **Bánh cháy**: sprite riêng (đỏ/nâu đậm)
- **Bounce pad**: sprite riêng (mint xanh)
- **Cat**: idle / jumping / falling / fire mode (4 state minimum)
- **VFX**: fire aura (loop), laser eye, sparkle (perfect jump), smoke puff (chạm rìa), confetti (combo milestone)

**Font**: Fredoka hoặc Baloo 2 (Google Fonts) cho UI. Import qua CSS.

**UI style**: bo tròn mạnh, pastel, shadow mềm. Dùng Phaser Graphics hoặc rexUI plugin nếu cần.

---

## 🔊 Audio (nếu có SFX file)

Check thư mục assets có `audio/` không. Nếu có, wire theo mapping:
- `jump.mp3` → khi mèo nhảy
- `pop.mp3` → xuyên qua khe sạch
- `meh.mp3` → chạm rìa
- `sparkle.mp3` → perfect jump
- `whoosh.mp3` → Fire Mode activate
- `laser.mp3` → laser mắt loop
- `fanfare.mp3` → combo milestone (5, 10, 20)
- `gameover.mp3` → cốc vỡ

Nếu không có audio → skip, để TODO trong code.

---

## 📋 Implementation Phases

Làm theo thứ tự. **Chạy được ở cuối mỗi phase** trước khi qua phase tiếp.

### Phase 1: Setup + Preload
- [ ] Tạo `index.html` + Phaser CDN + main.js
- [ ] `BootScene` preload tất cả asset từ folder `assets/`
- [ ] Log ra console tên tất cả asset đã load thành công
- [ ] `MenuScene` đơn giản: title + nút "Play" → chuyển sang `GameScene`

### Phase 2: Core mechanic (không có bánh cháy)
- [ ] Sinh tháp: 10 platform pancake xếp dọc, xoay được bằng drag
- [ ] Mèo đứng trên platform 0, tap để nhảy lên theo parabol
- [ ] Collision detection: khe hở vs rìa (dùng angle-based, không cần physics phức tạp)
- [ ] Nhảy qua khe → mèo lên platform tiếp theo, camera scroll xuống
- [ ] Chạm rìa → mèo rơi xuống 1 tầng

### Phase 3: Feel + polish
- [ ] Combo counter (UI top-left)
- [ ] Perfect jump detection + particle sparkle
- [ ] Screen shake khi chạm rìa
- [ ] Hit stop 50ms khi perfect jump (freeze frame ngắn)
- [ ] Smoke puff particle khi chạm rìa

### Phase 4: Danger + Fire Mode
- [ ] Bánh cháy đỏ spawn ngẫu nhiên (dùng difficulty scaling)
- [ ] Chạm bánh cháy → Game Over → `GameOverScene`
- [ ] Combo ≥ 3 → Fire Mode 3s: vòng lửa + laser sprite active + xuyên phá
- [ ] Bounce pad xanh: 10% spawn rate, +2 tầng auto

### Phase 5: Meta
- [ ] Score tracking + best score lưu `localStorage`
- [ ] Background theme change mỗi 10 tầng
- [ ] Slow-mo giữ tap (timeScale trick)
- [ ] Difficulty scaling theo height
- [ ] Game Over screen: score, best, "Play Again"

### Phase 6: Mobile polish
- [ ] Responsive scale (Phaser Scale.FIT hoặc Scale.RESIZE)
- [ ] Touch controls hoạt động mượt
- [ ] Test trên Chrome DevTools mobile emulator
- [ ] Vibration API khi Game Over (nếu supported)

---

## ✅ Definition of Done (MVP)

- [ ] Mở `index.html` trong Chrome/Safari mobile → play được
- [ ] 1 run kéo dài ít nhất 30s không crash
- [ ] Fire Mode kích hoạt được ít nhất 1 lần trong test run
- [ ] Best score lưu qua session (reload trang vẫn còn)
- [ ] Đọc rõ UI trên viewport 380x700 (mobile portrait)
- [ ] Không có console error khi chạy

---

## ⚙️ Technical Notes

- **Không dùng Arcade Physics cho collision khe hở** — dùng angle math: check `Phaser.Math.Angle.Between(cat, platformCenter)` so với `platform.gapStartAngle` và `platform.gapEndAngle`.
- **Tower rotation**: dùng `Phaser.GameObjects.Container` chứa tất cả platform, xoay container thay vì từng platform.
- **Infinite tower**: object pool platform, recycle platform đã qua khi mèo lên đủ cao.
- **State machine cho Cat**: `idle | jumping | falling | fire_mode | dead`. Đừng nhét hết vào update() một cục.
- **Đừng optimize sớm**. Chạy được → feel tốt → mới optimize.

---

## 🚀 Bắt đầu

1. `cd "C:\Users\isabe\Downloads\Cat Cafe"`
2. `ls assets/` — xem có gì thực tế
3. Report lại cho user cấu trúc asset trước khi code
4. Bắt đầu Phase 1

Nếu asset nào thiếu so với spec, **note lại trong `MISSING_ASSETS.md`** và dùng Phaser Graphics vẽ placeholder (hình tròn/vuông màu) cho tới khi có asset thật — không được block.
