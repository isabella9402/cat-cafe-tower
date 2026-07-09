# 🐱☕ Cat Café Tower — Game Design Document

> **Pitch 1 câu:** Điều khiển mèo mochi nhảy lên đỉnh tháp bánh pancake khổng lồ, xoay tháp và canh timing để né bánh cháy, bốc lửa combo để phun laser xuyên phá — casual game viral-ready cho TikTok.

---

## 1. Tổng Quan

| Mục | Chi tiết |
|---|---|
| **Thể loại** | Hyper-casual / Arcade / Skill-based |
| **Nền tảng** | Mobile-first (iOS + Android), Web (H5) |
| **Đối tượng** | 13–35 tuổi, fan mèo/anime/đồ ăn, người chơi casual |
| **Session** | 30 giây – 2 phút mỗi run |
| **Monetization** | Rewarded ads + interstitial + IAP skin mèo |
| **USP** | Kết hợp Helix Jump (đã proven) + cơ chế nhảy lên (mới lạ) + theme mèo café (viral) |

---

## 2. Core Gameplay

### Điều khiển (mobile)
- **Kéo ngang** trên màn hình → xoay tháp trái/phải
- **Tap** → mèo nhảy lên (chỉ tap được khi mèo đang chạm platform)
- **Giữ tap** → slow-mo 1 giây (giới hạn 3 lần/run, hồi bằng combo)

### Core Loop
1. Mèo mochi đứng trên platform pancake ở đáy tháp
2. Player tap → mèo bật nhảy lên
3. Player kéo xoay tháp sao cho **khe hở của platform phía trên** nằm đúng đường bay của mèo
4. Nhảy sạch qua khe = **+1 Combo**, chạm rìa pancake = **reset combo**, rơi ngược xuống 1 tầng
5. Combo ≥ 3 → **Fire Mode 🔥** kích hoạt trong 3 giây: mèo phun laser mắt, xuyên phá mọi platform (kể cả bánh cháy đỏ)
6. Chạm bánh cháy đỏ khi KHÔNG có Fire Mode = **Game Over**
7. Mỗi 10 tầng leo lên = **checkpoint** + đổi màu theme background (sáng → hoàng hôn → đêm sao → bình minh)

### Chi tiết cơ chế
- **Trọng lực**: mèo nhảy lên rồi rơi xuống theo parabol, nếu không tap tiếp thì rơi về platform ban đầu
- **Tap timing**: tap ngay khi chạm platform = nhảy cao nhất (perfect jump = +2 combo thay vì +1)
- **Fire Mode**: 3 giây, hiển thị vòng lửa quanh mèo + hiệu ứng laser mắt, xuyên phá tất cả
- **Bounce pad xanh** (10% xuất hiện): nhảy trúng = bật cao gấp đôi, tự động qua 2 tầng
- **Score**: `Độ cao × 10 + Combo cao nhất × 50 + Perfect jump × 20`

---

## 3. Progression & Meta Game

### Endless Mode (mode chính)
- Tháp vô tận, độ khó tăng dần: khe hở nhỏ dần, bánh cháy nhiều dần, tháp xoay tự động chậm
- Best score lưu local + sync leaderboard

### Daily Tower 🗓️
- Mỗi ngày 1 seed tháp cố định (mọi người chơi chung 1 tháp)
- Leaderboard reset hàng ngày → tạo lý do quay lại

### Cat Collection 🐱
- 20 skin mèo mở khóa qua: milestone điểm, daily reward, IAP
- Mỗi skin có Fire Mode VFX riêng (mèo tam thể = lửa cam, mèo đen = lửa tím, mèo trắng = lửa xanh...)
- Skin **KHÔNG** ảnh hưởng gameplay (fair-play)

### Achievement
- "Latte Art" — combo 10
- "Burnt to Perfection" — sống sót 5s trong Fire Mode
- "Mochi Master" — leo 100 tầng trong 1 run
- ~20 achievement để có thứ khoe

---

## 4. Art Direction

### Style
- **2D top-down** nhìn từ trên xuống tháp (như Helix Jump gốc)
- **Chibi kawaii + soft pastel + food art**
- Tham khảo: *Neko Atsume*, *Cats & Soup*, *Suika Game*, *Alto's Odyssey* (mood)

### Color Palette
```
Pastel base:     #FFE5EC (hồng sữa), #FFF5E1 (kem), #C9E4CA (mint), #F7C59F (caramel)
Accent:          #FF6B9D (hồng đậm), #FFB627 (mật ong)
Danger (bánh cháy): #8B4513 → #3D1F0F gradient
Fire mode:       #FF4500 → #FFD700 gradient + white glow
Background sky:  chuyển từ #FFE5EC (sáng) → #4A3B6E (đêm) → #FFB627 (bình minh)
```

### UI
- Bo tròn cực mạnh (border-radius lớn), bóng mềm
- Font: **Mochiy Pop One** (JP) hoặc **Fredoka** cho tiêu đề, **Baloo 2** cho body
- Icon UI dùng emoji style: 🐱 🥞 ⭐ 🔥

---

## 5. Audio

### Music
- **Menu**: lo-fi jazz + tiếng cà phê rót nhẹ (ambient café)
- **Gameplay**: chill lo-fi hip-hop, tempo tăng nhẹ khi combo cao
- **Fire Mode**: nhạc dồn dập J-pop 3 giây, cắt về chill khi hết
- **Game Over**: "nyaa~" buồn + tiếng cốc rơi

### SFX cần thiết
- Mèo nhảy: "hop!" hoặc "nya!" ngắn
- Xuyên qua khe sạch: "pop!" satisfying
- Chạm rìa: "meh" nhẹ
- Perfect jump: "sparkle chime"
- Fire Mode kích hoạt: "whoosh + power up"
- Laser mắt: "pew pew" cute
- Combo milestone (5, 10, 20): fanfare tăng dần
- Game Over: cốc vỡ + mèo buồn

---

## 6. Monetization

| Loại | Chi tiết | Ước tính doanh thu |
|---|---|---|
| **Rewarded Ad** | Xem ad để hồi sinh 1 lần/run, hồi slow-mo, x2 điểm cuối run | Nguồn thu chính |
| **Interstitial** | Sau mỗi 3 run, hoặc sau game over | Cân bằng, không spam |
| **IAP: Remove Ads** | $2.99 | Whale hunter |
| **IAP: Cat Skin Pack** | $0.99 – $4.99 per pack | Cosmetic only |
| **IAP: Starter Pack** | Skin hiếm + 500 coin + no-ads 3 ngày, $1.99 | Onboarding |

**Nguyên tắc**: KHÔNG bán power-up ảnh hưởng gameplay. Chỉ bán cosmetic + tiện nghi.

---

## 7. Roadmap Phát Triển

### MVP (2–4 tuần, 1 dev + 1 designer)
- [x] Core loop: nhảy lên + xoay tháp + né bánh cháy
- [x] Combo + Fire Mode
- [x] 1 skin mèo mặc định, 1 background
- [x] Endless mode
- [x] Local best score
- [x] SFX cơ bản, 1 track nhạc

### v1.0 Release (thêm 3–4 tuần)
- [ ] 10 skin mèo
- [ ] Daily tower + leaderboard (Firebase/PlayFab)
- [ ] Achievement system
- [ ] Rewarded ads + IAP
- [ ] 3 background theme (sáng/hoàng hôn/đêm)
- [ ] Onboarding tutorial 30 giây

### Post-launch
- [ ] Seasonal event (Halloween mèo ma, Giáng sinh mèo tuyết, Tết mèo lì xì)
- [ ] Boss floor mỗi 50 tầng (bánh khổng lồ có mắt)
- [ ] Co-op async (share tháp cho bạn thử)

---

## 8. Tech Stack Đề Xuất

**Unity 2D** — nhiều asset store, dễ port mobile + web, cộng đồng lớn.

*Hoặc* **Godot 4** — free, nhẹ, hợp indie.

*Hoặc web-first:* **Phaser 3** hoặc **PixiJS + Matter.js** — deploy nhanh, share link chơi ngay (viral TikTok).

**Backend nhẹ**: Firebase (Auth + Firestore + Analytics) hoặc PlayFab. Không cần server riêng cho MVP.

---

# 🎨 AI ASSET GENERATION

## Danh Sách Asset Cần Tạo

### A. Character (mèo mochi) — 1–5 asset
1. Mèo mochi trắng cơ bản (idle, jumping, falling, fire mode, game over)
2. 5–10 skin variation (tam thể, đen, xám, cam, panda cat...)

### B. Platform (pancake) — 6–8 asset
3. Pancake vàng bình thường (nhiều size khe hở khác nhau)
4. Pancake cháy đỏ (danger)
5. Pancake xanh mint (bounce pad)
6. Pancake vàng có nhiều topping (blueberry, dâu, socola)

### C. Background — 4 asset
7. Bầu trời sáng (buổi sáng café)
8. Hoàng hôn cam hồng
9. Đêm sao xanh tím
10. Bình minh vàng

### D. VFX (particle/effect) — 5 asset
11. Vòng lửa quanh mèo (Fire Mode aura)
12. Laser mắt mèo (2 tia hồng/vàng)
13. Sparkle particle (perfect jump)
14. Smoke puff (chạm rìa)
15. Confetti (milestone combo)

### E. UI — 8 asset
16. Logo game
17. Button set (play, pause, replay, settings, shop, no-ad)
18. Panel background (bo tròn pastel)
19. Coin icon
20. Combo counter bar (empty + full trạng thái)
21. Cat skin card frame
22. Achievement badge (nhiều rank)
23. App icon (512x512, cho store)

---

## Prompt AI Tạo Asset

> **Lưu ý**: Prompt bằng tiếng Anh cho kết quả tốt nhất. Recommended tools:
> - **Midjourney v6** hoặc **Niji 6** (tốt nhất cho anime/chibi)
> - **DALL-E 3** (dễ dùng, hiểu prompt tự nhiên)
> - **Stable Diffusion + LoRA** (miễn phí, cần setup, control tốt nhất — dùng LoRA `chibi`, `flat vector`, `kawaii`)
> - **Leonardo.ai** (freemium, có preset "Kawaii" phù hợp)

### 🐱 A. Character Prompts

**A1. Mèo mochi trắng cơ bản (idle)**
```
Cute chibi white mochi cat character, round marshmallow body shape, 
tiny paws and ears, big sparkling eyes, tiny pink cheeks, 
soft blush, top-down view, transparent background, 
kawaii anime style, pastel colors, flat vector illustration, 
game asset, 512x512, high contrast against transparent bg 
--niji 6 --style cute
```

**A2. Mèo mochi jumping (motion)**
```
Same white mochi cat character, jumping upward pose, 
paws stretched up excitedly, mouth open in happy "nya" expression, 
motion lines around body, small dust puff below, 
top-down slight tilt angle, transparent background, 
kawaii chibi style, consistent character design
--niji 6
```

**A3. Mèo Fire Mode**
```
White mochi cat character surrounded by cute cartoon fire aura, 
determined heroic expression, glowing pink laser beams shooting 
from eyes, orange-yellow flame ring around body, sparkles, 
top-down view, transparent background, magical girl transformation 
vibe, kawaii anime style, vibrant colors --niji 6
```

**A4. Skin variations (lặp lại prompt A1, đổi màu)**
```
[A1 prompt] + variant: calico cat with orange, white and black patches
[A1 prompt] + variant: black cat with yellow eyes and tiny bowtie
[A1 prompt] + variant: grey tabby cat with stripes
[A1 prompt] + variant: panda cat, black and white markings like a panda
[A1 prompt] + variant: pink strawberry cat, pink fur with tiny leaf on head
```

💡 **Tip consistency**: dùng Midjourney `--cref [URL_ảnh_A1]` để giữ character reference giống nhau qua các skin.

---

### 🥞 B. Platform Prompts

**B1. Pancake vàng bình thường**
```
Top-down view of a fluffy round pancake with golden brown edges, 
dripping honey and butter on top, food photography style but 
illustrated, kawaii cute food art, warm colors, transparent 
background, game asset, isolated object, soft shadow underneath
--niji 6 --style expressive
```

**B2. Pancake cháy đỏ (danger)**
```
Top-down view of a burnt charred pancake, dark brown to black 
edges with red glowing cracks, small smoke wisps, dangerous 
appearance but still cute cartoon style, kawaii warning vibe, 
transparent background, game asset, isolated object 
--niji 6
```

**B3. Pancake xanh mint (bounce)**
```
Top-down view of a fluffy round pancake, mint green pastel color, 
sparkling matcha powder on top, tiny stars floating above, 
magical bouncy appearance, kawaii cute food art, transparent 
background, game asset --niji 6
```

**B4. Pancake với topping**
```
Top-down view of fluffy pancake with [blueberries / strawberries / 
chocolate chips / whipped cream] on top, kawaii cute food art, 
warm golden base, transparent background, game asset
```

---

### 🌅 C. Background Prompts

**C1. Sáng sớm café**
```
Soft pastel morning sky background, fluffy pink and cream clouds, 
tiny sparkles, dreamy kawaii aesthetic, seamless vertical tile, 
no characters, gradient from light pink at top to cream at bottom, 
Studio Ghibli inspired, calm peaceful mood, 1080x1920 vertical
--niji 6 --ar 9:16
```

**C2. Hoàng hôn**
```
Sunset sky background, gradient from orange to pink to purple, 
soft cotton candy clouds, tiny birds silhouettes, kawaii dreamy 
aesthetic, seamless vertical, no characters, warm nostalgic mood 
--niji 6 --ar 9:16
```

**C3. Đêm sao**
```
Night sky background, deep purple to navy gradient, twinkling 
stars, crescent moon, tiny sparkle particles, kawaii magical 
aesthetic, seamless vertical, no characters, calm magical mood 
--niji 6 --ar 9:16
```

**C4. Bình minh**
```
Dawn sky background, soft yellow to peach gradient, morning mist, 
tiny sun rays, kawaii peaceful aesthetic, seamless vertical, no 
characters, hopeful fresh mood --niji 6 --ar 9:16
```

---

### ✨ D. VFX Prompts

**D1. Fire aura (dạng sprite sheet)**
```
Cute cartoon fire flame ring, orange to yellow gradient, 
white glow inner core, 8-frame animation loop, kawaii style, 
transparent background, game VFX asset, sprite sheet layout 
--niji 6
```

**D2. Laser eye beam**
```
Two pink and yellow laser beams shooting from eyes, cute cartoon 
style, glowing energy effect, sparkles at tip, transparent 
background, game VFX asset, horizontal beam --niji 6
```

**D3. Sparkle particle**
```
Set of 8 kawaii sparkle shapes, star sparkles, plus-shaped 
sparkles, various sizes, white and pink and yellow, transparent 
background, game particle asset, sprite sheet --niji 6
```

**D4. Smoke puff**
```
Cute cartoon smoke puff cloud, white and grey, round fluffy 
shape, 4-frame animation, kawaii style, transparent background, 
game VFX --niji 6
```

**D5. Confetti**
```
Kawaii confetti particles, pink hearts, yellow stars, white 
sparkles, mint circles, falling motion, transparent background, 
game celebration VFX, sprite sheet --niji 6
```

---

### 🎛️ E. UI Prompts

**E1. Logo game**
```
Game logo "Cat Café Tower", bubbly rounded typography, cream and 
pink pastel colors, tiny mochi cat sitting on the letter O, 
stack of pancakes as decoration, kawaii chibi style, 3D bubble 
letters with soft shadow, transparent background, playful mobile 
game logo --niji 6
```

**E2. Button set**
```
Kawaii mobile game UI button, rounded rectangle, pastel pink 
gradient, soft drop shadow, cream inner glow, [play triangle / 
pause / replay / gear / cart] icon in center, 3D puffy style, 
transparent background, game UI asset --niji 6
```

**E3. Panel background**
```
Kawaii mobile game UI panel, rounded rectangle, cream color with 
pink border, tiny paw prints and star decorations at corners, 
soft shadow, 3D puffy pillow style, transparent background, 
empty center for content, 9-slice ready --niji 6
```

**E4. Coin icon**
```
Kawaii game coin icon, golden pancake shape with cat paw print 
embossed in center, shiny highlight, cute chibi style, 
transparent background, isolated, game currency icon --niji 6
```

**E5. Combo meter bar**
```
Kawaii game UI progress bar, rounded pill shape, gradient from 
mint to hot pink to fire orange, tiny flame icon at right end, 
sparkles, 3D puffy style, transparent background, mobile game HUD 
--niji 6
```

**E6. App icon (quan trọng nhất cho store!)**
```
Mobile game app icon, close-up of cute chibi white mochi cat face 
peeking over a stack of pancakes, big sparkling eyes, tiny 
flame in one eye reflecting Fire Mode, pastel pink gradient 
background, kawaii style, high contrast, readable at small size, 
1024x1024, no text, iOS app icon style --niji 6 --ar 1:1
```

---

## 🎯 Tips Để Asset Nhất Quán

1. **Character reference**: Dùng Midjourney `--cref [URL]` hoặc `--sref [style URL]` để lock style/character qua nhiều prompt.

2. **Seed lock (Stable Diffusion)**: Ghi lại seed number của ảnh đầu tiên đẹp, dùng lại cho các biến thể để giữ style.

3. **Post-processing bắt buộc**:
   - **Remove.bg** hoặc **Photoshop Select Subject** → tách nền trong suốt
   - **TinyPNG** → nén file cho mobile
   - **Aseprite** hoặc **Photoshop** → điều chỉnh pixel-perfect, cắt sprite sheet
   - **SVG conversion** (nếu style flat) → dùng **Vector Magic** hoặc **Illustrator Image Trace** để lấy vector, scale không mờ

4. **Đánh giá asset trước khi dùng**:
   - Đọc rõ ở size 64x64 (icon size trên mobile)?
   - Contrast đủ mạnh với background game?
   - Silhouette nhận diện được ngay?
   - Style thống nhất với các asset khác?

5. **Legal**: 
   - Midjourney/DALL-E/Leonardo: được dùng thương mại (đọc lại ToS hiện tại trước khi ship)
   - **Tránh** prompt tên nhân vật có bản quyền (Pokémon, Sanrio, Studio Ghibli tên riêng...) — chỉ dùng làm mood reference trong prompt như "Ghibli-inspired mood", không copy trực tiếp
   - Lưu file `AI_PROMPTS.txt` ghi lại toàn bộ prompt đã dùng để CYA sau này

---

## 🎬 Marketing Hooks (TikTok/Reels)

Đây là lý do chọn theme mèo café — content viral tự nhiên:

1. **"Watch my mochi cat go feral"** — clip Fire Mode phá bánh cháy điên cuồng
2. **"Rating my daily tower attempts"** — daily leaderboard content
3. **"POV: you unlocked the panda cat skin"** — skin reveal trend
4. **"Perfect run no touch"** — skill flex
5. **"Cat café aesthetic gameplay + lo-fi"** — mood/study content
6. **ASMR clip**: SFX pop pop pop qua platform sạch — clip 15s tự lặp

**Hashtag chiến lược**: #catgame #kawaiigame #mochicat #cozygames #indiegame + trending sound theo tuần

---

## 📋 Checklist MVP (in ra dán bàn)

```
Week 1: Core mechanic
[ ] Prototype nhảy lên + xoay tháp
[ ] Collision detection khe hở vs rìa
[ ] Camera follow + tháp infinite generation

Week 2: Feel + polish
[ ] Combo counter + Fire Mode
[ ] Bánh cháy đỏ + Fire Mode xuyên phá
[ ] Juice: screen shake, particle, sound, hit stop

Week 3: Content + meta
[ ] 3–5 skin mèo
[ ] Score system + local best
[ ] UI menu + game over screen
[ ] 3 background theme

Week 4: Ship-ready
[ ] Ads integration (AdMob/Unity Ads)
[ ] IAP setup (test skin pack)
[ ] Analytics (Firebase)
[ ] Icon + screenshot store
[ ] Beta test 10 người → iterate
```

---

**Bước tiếp theo mình có thể giúp:**
1. Dựng **playable HTML prototype** chơi ngay trong chat (test cảm giác trước khi làm serious)
2. Viết **script code** cho Unity/Godot/Phaser cho core mechanic
3. Chi tiết hóa **UI wireframe** từng màn hình
4. Viết **App Store description + ASO keywords**
