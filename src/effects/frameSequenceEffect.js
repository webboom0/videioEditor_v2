// 프레임 시퀀스 이펙트
export class FrameSequenceEffect {
  constructor(folderPath = "/files/video_frames", fps = 30) {
    this.folderPath = folderPath;
    this.fps = fps;
    this.frameDuration = 1 / fps;
    this.frames = [];
    this.frameCache = {};
    this.isLoaded = false;
    this.maxFrame = 515;
  }

  // 프레임 파일 목록 생성 (frame_00001.webp ~ frame_00257.webp)
  generateFrameList() {
    const frames = [];
    // frame_00001.webp부터 frame_00257.webp까지
    for (let i = 1; i <= this.maxFrame; i++) {
      const frameNumber = i.toString().padStart(5, "0");
      frames.push(`frame_${frameNumber}.webp`);
    }
    return frames;
  }

  // 프레임 이미지 미리 로드
  async preloadFrames() {
    if (this.isLoaded) return;

    const frameList = this.generateFrameList();
    const loadPromises = frameList.map((frameName, index) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.frameCache[index] = img;
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`Failed to load frame: ${frameName}`);
          resolve(null);
        };
        img.src = `${this.folderPath}/${frameName}`;
      });
    });

    await Promise.all(loadPromises);
    this.frames = frameList;
    this.isLoaded = true;
    console.log(`Loaded ${Object.keys(this.frameCache).length} frames`);
  }

  // 현재 시간에 해당하는 프레임 인덱스 계산
  getFrameIndex(currentTime, startTime, duration, layer) {
    const elapsedTime = currentTime - startTime;
    if (elapsedTime < 0 || elapsedTime >= duration) return -1;

    const fps = layer.fps || this.fps;
    const startFrame = layer.startFrame || 1;
    const endFrame = layer.endFrame || this.frames.length;
    const totalFrames = endFrame - startFrame + 1;

    let frameIndex = Math.floor(elapsedTime * fps);

    // 반복 처리
    if (layer.loop === "loop") {
      frameIndex = frameIndex % totalFrames;
    } else if (layer.loop === "pingpong") {
      const cycle = Math.floor(frameIndex / totalFrames);
      const cycleFrame = frameIndex % totalFrames;
      if (cycle % 2 === 1) {
        frameIndex = totalFrames - 1 - cycleFrame;
      }
    } else {
      // once - 한 번만 재생
      if (frameIndex >= totalFrames) return -1;
    }

    // 범위 내로 조정
    frameIndex = Math.max(0, Math.min(totalFrames - 1, frameIndex));
    return startFrame - 1 + frameIndex; // 실제 프레임 인덱스로 변환
  }

  // 프레임 시퀀스 렌더링
  render(ctx, layer, currentTime, canvas) {
    if (!this.isLoaded) {
      this.preloadFrames();
      return;
    }

    const frameIndex = this.getFrameIndex(
      currentTime,
      layer.start,
      layer.duration,
      layer
    );
    if (frameIndex < 0 || frameIndex >= this.frames.length) return;

    const frame = this.frameCache[frameIndex];
    if (!frame) return;

    // 레이어 속성 적용
    const x = layer.x ?? 0;
    const y = layer.y ?? 0;
    const scale = layer.scale ?? 1;
    const opacity = layer.opacity ?? 1;

    // 애니메이션 처리
    let animOffsetX = 0,
      animOffsetY = 0,
      animScale = 1,
      animOpacity = 1;
    if (Array.isArray(layer.animation) && layer.animation.length > 1) {
      const relTime = currentTime - layer.start;
      let prev = layer.animation[0];
      let next = layer.animation[layer.animation.length - 1];

      if (relTime <= prev.time) {
        animOffsetX = prev.x ?? 0;
        animOffsetY = prev.y ?? 0;
        animScale = prev.scale ?? 1;
        animOpacity = prev.opacity ?? opacity;
      } else if (relTime >= next.time) {
        animOffsetX = next.x ?? 0;
        animOffsetY = next.y ?? 0;
        animScale = next.scale ?? 1;
        animOpacity = next.opacity ?? opacity;
      } else {
        for (let i = 1; i < layer.animation.length; i++) {
          if (layer.animation[i].time > relTime) {
            next = layer.animation[i];
            prev = layer.animation[i - 1];
            break;
          }
        }
        // 키프레임 간의 실제 시간 차이로 보간
        const t = (relTime - prev.time) / (next.time - prev.time);
        animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
        animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
        animScale =
          (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
        const prevOpacity = prev.opacity ?? opacity;
        const nextOpacity = next.opacity ?? opacity;
        animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
      }
    }

    // 정렬 처리
    let anchorX = x + animOffsetX;
    let anchorY = y + animOffsetY;

    if (layer.align === "center") anchorX = canvas.width / 2 + animOffsetX;
    else if (layer.align === "right") anchorX = canvas.width + animOffsetX;

    if (layer.verticalAlign === "middle")
      anchorY = canvas.height / 2 + animOffsetY;
    else if (layer.verticalAlign === "bottom")
      anchorY = canvas.height + animOffsetY;

    // 스케일 모드 처리
    let renderScale = scale * animScale;
    if (layer.scaleMode === "fit") {
      const scaleToFit = Math.min(
        canvas.width / frame.naturalWidth,
        canvas.height / frame.naturalHeight
      );
      renderScale *= scaleToFit;
    } else if (layer.scaleMode === "cover") {
      const scaleToCover = Math.max(
        canvas.width / frame.naturalWidth,
        canvas.height / frame.naturalHeight
      );
      renderScale *= scaleToCover;
    }

    // 그리기 위치 계산
    let drawX = 0,
      drawY = 0;
    if (layer.align === "center") drawX = -frame.naturalWidth / 2;
    else if (layer.align === "right") drawX = -frame.naturalWidth;

    if (layer.verticalAlign === "middle") drawY = -frame.naturalHeight / 2;
    else if (layer.verticalAlign === "bottom") drawY = -frame.naturalHeight;

    // 프레임 렌더링
    ctx.save();
    ctx.globalAlpha = animOpacity;
    ctx.translate(anchorX, anchorY);
    ctx.scale(renderScale, renderScale);
    ctx.drawImage(frame, drawX, drawY, frame.naturalWidth, frame.naturalHeight);
    ctx.restore();
  }
}

// 전역 인스턴스 생성
export const frameSequenceEffect = new FrameSequenceEffect();

// 이펙트 맵에 추가
export const renderFrameSequence = (ctx, layer, currentTime, canvas) => {
  frameSequenceEffect.render(ctx, layer, currentTime, canvas);
};
