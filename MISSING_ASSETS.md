# MISSING / UNUSED ASSETS

MVP 빌드 기준으로 부족하거나 아직 연결하지 않은 에셋 목록입니다.

## ❌ 없음 (완전히 부족)
- **오디오 전체** — 원본 폴더에 `audio/` 나 사운드 파일이 없습니다.
  - 필요: `jump / pop / meh / sparkle / whoosh / laser / fanfare / gameover`
  - 현재: 코드에 사운드 훅 미삽입. 파일이 생기면 `BootScene` 에 `this.load.audio(...)` 추가 후
    각 이벤트(`doJump`, 성공, `onFail`, `showPerfect`, `activateFire`, `comboMilestone`, `doGameOver`)에 연결하면 됩니다.
- **앱 아이콘 / 파비콘** (512·1024) — 스토어/PWA용. 현재 없음.

## 🟡 있지만 아직 미사용 (원하면 연결 가능)
전처리는 완료되어 `assets/` 에 존재하지만 MVP 게임플레이에는 아직 안 씁니다.
- `assets/skin_black.png`, `skin_calico.png`, `skin_grey.png`, `skin_panda.png`, `skin_strawberry.png`
  → **고양이 스킨/상점** 기능용 (GDD Cat Collection). MVP엔 상점 미구현.
- `assets/ui_coin.png` → 코인/재화 UI용. 재화 시스템 미구현.
- `assets/vfx_confetti.png` → 콤보 마일스톤 연출. 현재는 코드 생성 색종이 파티클 사용.

## 🟢 대체 처리한 항목 (의도된 결정)
- **파이어 오라 / 레이저 눈** — 별도 스프라이트시트(`Fire Aura Ring`, `Laser Eye Beam`) 대신
  **`cat_fire` 스프라이트에 이미 불꽃 링 + 핑크 레이저가 포함**되어 있어 그걸 그대로 사용합니다.
  (원본 `Fire Aura Ring.jpg` 는 4×2 애니메이션 시트라 프레임 분할이 필요 → MVP에서는 생략)
- **스파클 / 연기 파티클** — 원본 스프라이트시트 대신 `BootScene` 에서 `generateTexture` 로 만든
  가벼운 파티클(별/원/사각형)을 사용합니다. 초록 배경 프린징 리스크 없이 안정적입니다.
- **빈틈(gap) 표현** — 팬케이크 원본은 '빈틈 없는 통짜 원반'이라, Phaser 지오메트리 마스크로
  파이 조각을 잘라내 빈틈을 렌더링합니다 (`Tower.draw`).

## 📌 원본 → 처리본 매핑
전처리 스크립트: 스크래치패드의 `process_assets.py` (원본 아트 교체 시 재실행).
매핑 정의는 그 스크립트의 `MAP` 딕셔너리를 참고하세요.
