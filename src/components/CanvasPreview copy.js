import React, { useRef, useEffect } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";

const imageCache = {}; // 컴포넌트 바깥에 캐시 선언

function CanvasPreview({
  layers,
  currentTime,
  width = 640,
  height = 360,
  selectedLayerIndex,
  onSelectLayer,
}) {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});

  // 각 레이어의 위치와 크기 저장
  const layerRects = useRef([]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
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

      // 기본 위치/크기
      let x = layer.x;
      let y = layer.y;
      let w = layer.width || 160;
      let h = layer.height || 90;

      // 애니메이션 적용
      if (layer.animation) {
        const t = Math.max(
          0,
          Math.min(1, (currentTime - layer.start) / layer.duration)
        );
        if (layer.animation.type === "move-scale") {
          x = layer.x + (layer.animation.endX - layer.x) * t;
          y = layer.y + (layer.animation.endY - layer.y) * t;

          // 비율로 처리
          if (layer.animation.endWidthRatio && layer.animation.endHeightRatio) {
            w = w * (1 + (layer.animation.endWidthRatio - 1) * t);
            h = h * (1 + (layer.animation.endHeightRatio - 1) * t);
          }
          // (기존 endWidth, endHeight 절대값 지원도 병행 가능)
          else if (layer.animation.endWidth && layer.animation.endHeight) {
            w = w + (layer.animation.endWidth - w) * t;
            h = h + (layer.animation.endHeight - h) * t;
          }
        } else if (layer.animation.type === "move") {
          x = layer.x + (layer.animation.endX - layer.x) * t;
          y = layer.y + (layer.animation.endY - layer.y) * t;
        }
        // 추가 애니메이션 타입 구현 가능
      }

      layerRects.current.push({ x, y, w, h, index: idx });

      // 선택된 레이어면 테두리
      if (selectedLayerIndex === idx) {
        ctx.save();
        ctx.strokeStyle = "#FFD600";
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.restore();
      }

      // === 여기에 effect 타입 분기 추가 ===
      if (layer.type === "effect") {
        const effectFunc = EFFECT_MAP[layer.effectType];
        if (effectFunc) {
          effectFunc(ctx, layer, currentTime);
        }
        return; // effect는 여기서 끝
      }

      // 실제 미디어/텍스트 그리기
      if (layer.type === "image") {
        const img = imageCache[layer.src];
        if (img && img.complete) {
          ctx.drawImage(img, x, y, w, h);
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
          ctx.drawImage(video, x, y, w, h);
        };
      } else if (layer.type === "text") {
        ctx.font = layer.font || "20px sans-serif";
        ctx.fillStyle = layer.color || "#fff";
        ctx.fillText(layer.text, x + 10, y + 30);
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

      let x = layer.x,
        y = layer.y,
        w = layer.width || 160,
        h = layer.height || 90;
      if (layer.animation) {
        const t = Math.max(
          0,
          Math.min(1, (currentTime - layer.start) / layer.duration)
        );
        if (layer.animation.type === "move-scale") {
          x = layer.x + (layer.animation.endX - layer.x) * t;
          y = layer.y + (layer.animation.endY - layer.y) * t;
          if (layer.animation.endWidth && layer.animation.endHeight) {
            w = w + (layer.animation.endWidth - w) * t;
            h = h + (layer.animation.endHeight - h) * t;
          }
        } else if (layer.animation.type === "move") {
          x = layer.x + (layer.animation.endX - layer.x) * t;
          y = layer.y + (layer.animation.endY - layer.y) * t;
        }
      }

      layerRects.current.push({ x, y, w, h, index: idx });

      if (selectedLayerIndex === idx) {
        ctx.save();
        ctx.strokeStyle = "#FFD600";
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        ctx.restore();
      }

      ctx.font = layer.font || "20px sans-serif";
      ctx.fillStyle = layer.color || "#fff";
      ctx.fillText(layer.text, x + 10, y + 30);
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
