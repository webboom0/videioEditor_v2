import React, { useRef, useEffect } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";

// 이미지 캐싱 및 로딩 함수
const imageCache = {};
function getImage(src) {
  if (!src) return null;
  if (imageCache[src]) return imageCache[src];
  const img = new window.Image();
  img.src = src;
  imageCache[src] = img;
  return img;
}

function CanvasPreview({
  layers,
  currentTime,
  width = 1280,
  height = Math.round((width * 9) / 16),
  selectedLayerIndex,
  onSelectLayer,
}) {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});

  // 각 레이어의 위치와 크기 저장
  const layerRects = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    layerRects.current = [];

    // 1. 이미지 캐싱 및 미리 로드
    layers.forEach((layer) => {
      if (layer.type === "image" && !imageCache[layer.src]) {
        const img = new window.Image();
        img.src = layer.src;
        imageCache[layer.src] = img;
      }
    });

    // 2. 레이어 그리기
    layers.forEach((layer, idx) => {
      if (layer.type === "text") return; // 텍스트는 건너뜀
      if (
        currentTime < layer.start ||
        currentTime > layer.start + layer.duration
      )
        return;

      // === 공통 위치/스케일 계산 ===
      let x = layer.x ?? 0;
      let y = layer.y ?? 0;
      let scale = layer.scale ?? 1;

      // 키프레임 애니메이션 처리
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
          animOpacity = prev.opacity ?? layer.opacity ?? 1;
        } else if (relTime >= next.time) {
          animOffsetX = next.x ?? 0;
          animOffsetY = next.y ?? 0;
          animScale = next.scale ?? 1;
          animOpacity = next.opacity ?? layer.opacity ?? 1;
        } else {
          for (let i = 1; i < layer.animation.length; i++) {
            if (layer.animation[i].time > relTime) {
              next = layer.animation[i];
              prev = layer.animation[i - 1];
              break;
            }
          }
          const t = (relTime - prev.time) / (next.time - prev.time);
          animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
          animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
          animScale =
            (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

      layerRects.current.push({
        x,
        y,
        w: layer.width || 160,
        h: layer.height || 90,
        index: idx,
      });

      // 선택된 레이어면 테두리
      // if (selectedLayerIndex === idx) {
      //   ctx.save();
      //   ctx.strokeStyle = "#FFD600";
      //   ctx.lineWidth = 3;
      //   ctx.strokeRect(
      //     x - 2,
      //     y - 2,
      //     layer.width || 160 + 4,
      //     layer.height || 90 + 4
      //   );
      //   ctx.restore();
      // }

      // === 타입별 렌더링 ===
      if (layer.type === "image") {
        const img = getImage(layer.src);
        if (img && img.complete) {
          const canvasElem = canvasRef?.current;
          if (!canvasElem) return;
          const scaleToFit = Math.min(
            canvasElem.width / img.naturalWidth,
            canvasElem.height / img.naturalHeight
          );
          const imgW = layer.width || img.naturalWidth;
          const imgH = layer.height || img.naturalHeight;

          // 1. 정렬 기준점(anchorX, anchorY)
          let anchorX = layer.x ?? 0;
          let anchorY = layer.y ?? 0;
          if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
          else if (anchorX === 0 && layer.align === "right") anchorX = width;
          if (anchorY === 0 && layer.verticalAlign === "middle")
            anchorY = height / 2;
          else if (anchorY === 0 && layer.verticalAlign === "bottom")
            anchorY = height;

          // 2. 애니메이션 상대값
          let animOffsetX = 0,
            animOffsetY = 0,
            animScale = 1;
          if (Array.isArray(layer.animation) && layer.animation.length > 1) {
            // 보간 코드 (기존과 동일)
            const relTime = currentTime - layer.start;
            let prev = layer.animation[0];
            let next = layer.animation[layer.animation.length - 1];
            for (let i = 1; i < layer.animation.length; i++) {
              if (layer.animation[i].time > relTime) {
                next = layer.animation[i];
                prev = layer.animation[i - 1];
                break;
              }
            }
            const t = (relTime - prev.time) / (next.time - prev.time);
            animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t;
            animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t;
            animScale =
              (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          }

          // 3. 최종 위치
          const finalX = anchorX + animOffsetX;
          const finalY = anchorY + animOffsetY;
          let renderScale = (layer.scale ?? 1) * animScale;
          if (layer.scaleMode === "fit") renderScale *= scaleToFit;

          // 4. transform-origin 보정
          let drawX = 0,
            drawY = 0;
          if (layer.align === "center") drawX = -imgW / 2;
          else if (layer.align === "right") drawX = -imgW;
          if (layer.verticalAlign === "middle") drawY = -imgH / 2;
          else if (layer.verticalAlign === "bottom") drawY = -imgH;

          ctx.save();
          ctx.globalAlpha = animOpacity;
          ctx.translate(finalX, finalY);
          ctx.scale(renderScale, renderScale);
          ctx.drawImage(img, drawX, drawY, imgW, imgH);
          ctx.restore();
        }
      } else if (layer.type === "video") {
        // 비디오는 미리 생성된 video 엘리먼트 사용
        let video = videoRefs.current[layer.src];
        if (!video) {
          video = document.createElement("video");
          video.src = layer.src;
          video.crossOrigin = "anonymous";
          videoRefs.current[layer.src] = video;
        }
        video.currentTime = Math.max(0, currentTime - layer.start);
        video.oncanplay = () => {
          const drawW = video.videoWidth * scale;
          const drawH = video.videoHeight * scale;
          ctx.drawImage(video, x, y, drawW, drawH);
        };
      } else if (layer.type === "text") {
        const fontSize = layer.fontSize || 30;
        const fontFamily = layer.fontFamily || "Arial";
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = layer.color || "#fff";
        ctx.fillText(layer.text, layer.x, layer.y);
      } else if (layer.type === "effect") {
        const effectFunc = EFFECT_MAP[layer.effectType];
        if (effectFunc) {
          effectFunc(ctx, layer, currentTime, canvas);
        }
      }
    });

    // 2. 텍스트 레이어는 항상 맨 위에 그림
    layers.forEach((layer, idx) => {
      if (layer.type !== "text") return;
      if (
        currentTime < layer.start ||
        currentTime > layer.start + layer.duration
      )
        return;

      let x = layer.x ?? 0;
      let y = layer.y ?? 0;
      let scale = layer.scale ?? 1;
      let animOpacity = 1;

      // 키프레임 애니메이션 처리 (수정)
      if (Array.isArray(layer.animation) && layer.animation.length > 1) {
        const relTime = currentTime - layer.start;
        const anim = layer.animation;
        if (relTime <= anim[0].time) {
          x = anim[0].x ?? x;
          y = anim[0].y ?? y;
          scale = anim[0].scale ?? scale;
          animOpacity = anim[0].opacity ?? layer.opacity ?? 1;
        } else if (relTime >= anim[anim.length - 1].time) {
          x = anim[anim.length - 1].x ?? x;
          y = anim[anim.length - 1].y ?? y;
          scale = anim[anim.length - 1].scale ?? scale;
          animOpacity = anim[anim.length - 1].opacity ?? layer.opacity ?? 1;
        } else {
          let prev = anim[0];
          let next = anim[anim.length - 1];
          for (let i = 1; i < anim.length; i++) {
            if (anim[i].time > relTime) {
              next = anim[i];
              prev = anim[i - 1];
              break;
            }
          }
          const t = (relTime - prev.time) / (next.time - prev.time);
          x = (prev.x ?? x) + ((next.x ?? prev.x ?? x) - (prev.x ?? x)) * t;
          y = (prev.y ?? y) + ((next.y ?? prev.y ?? y) - (prev.y ?? y)) * t;
          scale =
            (prev.scale ?? scale) +
            ((next.scale ?? prev.scale ?? scale) - (prev.scale ?? scale)) * t;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * t;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

      layerRects.current.push({
        x,
        y,
        w: layer.width || 160,
        h: layer.height || 90,
        index: idx,
      });

      // if (selectedLayerIndex === idx) {
      //   ctx.save();
      //   ctx.strokeStyle = "#FFD600";
      //   ctx.lineWidth = 3;
      //   ctx.strokeRect(
      //     x - 2,
      //     y - 2,
      //     layer.width || 160 + 4,
      //     layer.height || 90 + 4
      //   );
      //   ctx.restore();
      // }

      ctx.save();
      ctx.globalAlpha = animOpacity;
      ctx.font = `${layer.fontSize ? layer.fontSize * scale : 32 * scale}px ${
        layer.fontFamily || "sans-serif"
      }`;
      ctx.fillStyle = layer.color || "#fff";

      // 가로 정렬
      let drawX = x;
      if (layer.align === "center") {
        ctx.textAlign = "center";
        drawX = width / 2;
      } else if (layer.align === "right") {
        ctx.textAlign = "right";
        drawX = width - (layer.marginRight || 0);
      } else {
        ctx.textAlign = "left";
        drawX = x;
      }

      // 세로 정렬
      let drawY = y;
      if (layer.verticalAlign === "middle") {
        ctx.textBaseline = "middle";
        drawY = height / 2;
      } else if (layer.verticalAlign === "bottom") {
        ctx.textBaseline = "bottom";
        drawY = height - (layer.marginBottom || 0);
      } else {
        ctx.textBaseline = "top";
        drawY = y;
      }

      ctx.fillText(layer.text || "", drawX, drawY);
      ctx.restore();
    });
  }, [layers, currentTime, width, height, selectedLayerIndex]);

  // 클릭 시 실제 layers의 인덱스를 넘김
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = layerRects.current.length - 1; i >= 0; i--) {
      const { x: lx, y: ly, w, h, index } = layerRects.current[i];
      if (x >= lx && x <= lx + w && y >= ly && y <= ly + h) {
        onSelectLayer && onSelectLayer(index);
        return;
      }
    }
    onSelectLayer && onSelectLayer(null);
  };

  return <canvas ref={canvasRef} onClick={handleCanvasClick} />;
}

export default CanvasPreview;
