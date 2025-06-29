# Video Editor v2

비디오 에디터 프로젝트입니다.

## 🆕 새로 추가된 기능

### Canvas 기반 이미지 크롭 기능

이제 이미지를 다양한 방식으로 크롭할 수 있습니다. 레터박스 없이 이미지를 지정된 크기에 맞게 조정할 수 있습니다.

#### 크롭 모드

1. **Fit 모드**: 이미지가 전체 영역에 맞도록 조정 (레터박스 허용)
2. **Cover 모드**: 이미지가 전체 영역을 덮도록 조정 (크롭 발생)
3. **Crop 모드**: 고급 크롭 옵션 제공

#### 크롭 위치 옵션

- **중앙 (center)**: 기본값, 이미지 중앙을 기준으로 크롭
- **좌상단 (top-left)**: 이미지 좌상단을 기준으로 크롭
- **우상단 (top-right)**: 이미지 우상단을 기준으로 크롭
- **좌하단 (bottom-left)**: 이미지 좌하단을 기준으로 크롭
- **우하단 (bottom-right)**: 이미지 우하단을 기준으로 크롭
- **스마트 (smart)**: AI 기반 스마트 크롭 (약간의 랜덤성 포함)

#### 고급 크롭 옵션

- **크롭 오프셋**: X, Y 축으로 -1.0 ~ 1.0 범위에서 크롭 위치 미세 조정
- **크롭 줌**: 1.0 ~ 3.0 범위에서 줌 레벨 조정
- **타겟 크기**: 절대 크기(px) 기준으로 크롭할 목표 크기 설정

#### JSON 설정 예시

```json
{
  "type": "image",
  "src": "/files/photo/photo_03.jpg",
  "scaleMode": "crop",
  "cropMode": "center",
  "targetSize": {
    "width": 1920,
    "height": 1080
  },
  "cropOffset": {
    "x": 0.1,
    "y": -0.2
  },
  "cropZoom": 1.2
}
```

#### 사용법

1. 이미지 레이어를 선택합니다
2. PropertyBox에서 "이미지 크롭 설정" 섹션을 찾습니다
3. 크롭 모드를 선택합니다 (Fit/Cover/Crop)
4. Crop 모드 선택 시 추가 옵션들이 나타납니다:
   - 크롭 위치 선택
   - 타겟 크기 설정
   - 크롭 오프셋 조정 (슬라이더)
   - 크롭 줌 조정 (슬라이더)
5. 실시간 미리보기로 결과를 확인할 수 있습니다

## 기존 기능

- 텍스트 레이어
- 이미지 레이어
- 비디오 레이어
- 오디오 레이어
- 다양한 효과 (하트, 사랑비, 필름 효과 등)
- 키프레임 애니메이션
- 타임라인 편집

## 설치 및 실행

```bash
npm install
npm start
```

## 기술 스택

- React
- Canvas API
- Web Audio API
- HTML5 Video API
