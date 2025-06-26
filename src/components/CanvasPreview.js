import React, { useRef, useEffect, useState } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";
import { drawCroppedImage } from "../utils/imageCropUtils";
import { getThumbnail } from '../utils/imageCacheUtils';

// Easing 함수들
function applyEasing(t, easingType) {
  switch (easingType) {
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t; // linear
  }
}

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
  containerRef,
  quality = 0.4,
  zoom = 1,
}) {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});
  const [displaySize, setDisplaySize] = useState({ width: 1280, height: 720 });

  // 각 레이어의 위치와 크기 저장
  const layerRects = useRef([]);

  // 썸네일 이미지 상태 관리
  const [thumbImages, setThumbImages] = useState({});

  // === 뷰포트 패닝(마우스 드래그) ===
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  function handleMouseMove(e) {
    if (!isPanning.current) return;
    const dx = (e.clientX - lastPos.current.x) / zoom;
    const dy = (e.clientY - lastPos.current.y) / zoom;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  function handleMouseUp() {
    isPanning.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // 이미지 레이어 src/quality 변경 시 썸네일 준비
  useEffect(() => {
    let isMounted = true;
    async function prepareThumbnails() {
      const newThumbs = {};
      const imageLayers = layers.filter(l => l.type === 'image');
      for (const layer of imageLayers) {
        if (layer.src) {
          newThumbs[layer.src] = await getThumbnail(layer.src, quality);
        }
      }
      if (isMounted) setThumbImages(newThumbs);
    }
    prepareThumbnails();
    return () => { isMounted = false; };
  }, [layers, quality]);

  // 반응형 크기 계산
  useEffect(() => {
    const updateDisplaySize = () => {
      if (!containerRef?.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // 여백 고려 (20px)
      const maxWidth = containerWidth - 40;
      const maxHeight = containerHeight - 40;
      
      // 원본 비율 유지하면서 컨테이너에 맞춤
      const aspectRatio = width / height;
      let displayWidth, displayHeight;
      
      if (maxWidth / aspectRatio <= maxHeight) {
        // 너비 기준으로 맞춤
        displayWidth = maxWidth;
        displayHeight = maxWidth / aspectRatio;
      } else {
        // 높이 기준으로 맞춤
        displayHeight = maxHeight;
        displayWidth = maxHeight * aspectRatio;
      }
      
      // 최소 크기 보장
      displayWidth = Math.max(displayWidth, 320);
      displayHeight = Math.max(displayHeight, 180);
      
      setDisplaySize({ width: displayWidth, height: displayHeight });
    };

    updateDisplaySize();
    
    // 리사이즈 이벤트 리스너
    const handleResize = () => {
      updateDisplaySize();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height, containerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // style.width/height를 zoom에 따라 조정
    canvas.style.width = `${width * zoom}px`;
    canvas.style.height = `${height * zoom}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    layerRects.current = [];

    // === 줌/뷰포트 적용 ===
    // (1) 뷰포트(x, y, w, h)에서 줌 배율만큼 확대해서 그리기
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.translate(-0, -0);
    ctx.scale(zoom, zoom);

    // 1. 이미지 캐싱 및 미리 로드
    layers.forEach((layer) => {
      if (layer.type === "image" && !imageCache[layer.src]) {
        const img = new window.Image();
        img.src = layer.src;
        imageCache[layer.src] = img;
      }
    });

    // 2. 레이어 그리기 (내부 좌표는 원본 크기 기준)
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
          // 키프레임 간의 실제 시간 차이로 보간
          const t = (relTime - prev.time) / (next.time - prev.time);
          
          // Easing 적용
          const easedT = applyEasing(t, prev.easing || 'linear');
          
          animOffsetX = (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * easedT;
          animOffsetY = (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * easedT;
          animScale =
            (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * easedT;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * easedT;
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

      // === 타입별 렌더링 ===
      if (layer.type === "image") {
        const img = thumbImages[layer.src] || getImage(layer.src);
        if (img && img.complete) {
          // 1. 정렬 기준점(anchorX, anchorY)
          let anchorX = layer.x ?? 0;
          let anchorY = layer.y ?? 0;
          if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
          else if (anchorX === 0 && layer.align === "right") anchorX = width;
          if (anchorY === 0 && layer.verticalAlign === "middle")
            anchorY = height / 2;
          else if (anchorY === 0 && layer.verticalAlign === "bottom")
            anchorY = height;

          // 2. 애니메이션 값은 위에서 계산된 값 사용
          // animOffsetX, animOffsetY, animScale, animOpacity는 이미 계산됨

          // 3. 최종 위치
          const finalX = anchorX + animOffsetX;
          const finalY = anchorY + animOffsetY;
          let renderScale = (layer.scale ?? 1) * animScale;

          // 4. 크롭 옵션 준비
          const cropOptions = {
            scaleMode: layer.scaleMode || 'fit',
            cropMode: layer.cropMode || 'center',
            targetSize: layer.targetSize || null,
            cropOffset: layer.cropOffset || { x: 0, y: 0 },
            cropZoom: layer.cropZoom || 1.0,
            x: finalX,
            y: finalY,
            scale: renderScale,
            opacity: animOpacity,
            align: layer.align || 'center',
            verticalAlign: layer.verticalAlign || 'middle'
          };

          // 5. 새로운 크롭 함수 사용
          if (layer.scaleMode === 'crop' || layer.cropMode) {
            // 크롭 모드 사용 - finalX, finalY는 크롭된 이미지의 중심점
            drawCroppedImage(ctx, img, cropOptions);
            
            // 크롭된 이미지의 중심점에 빨간 점 표시 (디버깅용)
            ctx.save();
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(finalX, finalY, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // 중심점 좌표 표시 (선택된 레이어일 때만)
            if (selectedLayerIndex === idx) {
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1;
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              const text = `(${Math.round(finalX)}, ${Math.round(finalY)})`;
              const textWidth = ctx.measureText(text).width;
              ctx.fillRect(finalX - textWidth/2 - 2, finalY + 10, textWidth + 4, 16);
              ctx.fillStyle = '#000000';
              ctx.fillText(text, finalX, finalY + 12);
            }
            ctx.restore();
          } else {
            // 기존 방식 (하위 호환성)
            const canvasElem = canvasRef?.current;
            if (!canvasElem) return;
            const scaleToFit = Math.min(
              canvasElem.width / img.naturalWidth,
              canvasElem.height / img.naturalHeight
            );
            const imgW = layer.width || img.naturalWidth;
            const imgH = layer.height || img.naturalHeight;

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
            
            // 기존 이미지의 중심점에 빨간 점 표시
            ctx.save();
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(finalX, finalY, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // 중심점 좌표 표시 (선택된 레이어일 때만)
            if (selectedLayerIndex === idx) {
              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1;
              ctx.font = '12px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              const text = `(${Math.round(finalX)}, ${Math.round(finalY)})`;
              const textWidth = ctx.measureText(text).width;
              ctx.fillRect(finalX - textWidth/2 - 2, finalY + 10, textWidth + 4, 16);
              ctx.fillStyle = '#000000';
              ctx.fillText(text, finalX, finalY + 12);
            }
            ctx.restore();
          }
        }
      } else if (layer.type === "video") {
        let video = videoRefs.current[layer.src];
        if (!video) {
          video = document.createElement("video");
          video.src = layer.src;
          video.crossOrigin = "anonymous";
          video.muted = true;
          video.playsInline = true;
          videoRefs.current[layer.src] = video;
        }
        video.currentTime = Math.max(0, currentTime - layer.start);

        // 비디오 메타데이터가 준비되지 않았으면 그리지 않음
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        if (!videoW || !videoH) return;

        let renderScale = layer.scale ?? 1;

        // scaleMode: fit/cover
        if (layer.scaleMode === "fit") {
          renderScale = Math.min(width / videoW, height / videoH);
        } else if (layer.scaleMode === "cover") {
          renderScale = Math.max(width / videoW, height / videoH);
        }

        // 정렬
        let anchorX = layer.x ?? 0;
        let anchorY = layer.y ?? 0;
        if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
        else if (anchorX === 0 && layer.align === "right") anchorX = width;
        if (anchorY === 0 && layer.verticalAlign === "middle")
          anchorY = height / 2;
        else if (anchorY === 0 && layer.verticalAlign === "bottom")
          anchorY = height;

        // 실제 그릴 위치 계산 (중앙 정렬 등)
        let drawX = 0,
          drawY = 0;
        if (layer.align === "center") drawX = -videoW / 2;
        else if (layer.align === "right") drawX = -videoW;
        if (layer.verticalAlign === "middle") drawY = -videoH / 2;
        else if (layer.verticalAlign === "bottom") drawY = -videoH;

        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        ctx.translate(anchorX, anchorY);
        ctx.scale(renderScale, renderScale);
        ctx.drawImage(video, drawX, drawY, videoW, videoH);
        ctx.restore();
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

      // 키프레임 애니메이션 처리
      if (Array.isArray(layer.animation) && layer.animation.length > 1) {
        const relTime = currentTime - layer.start;
        let prev = layer.animation[0];
        let next = layer.animation[layer.animation.length - 1];

        if (relTime <= prev.time) {
          x = prev.x ?? x;
          y = prev.y ?? y;
          scale = prev.scale ?? scale;
          animOpacity = prev.opacity ?? layer.opacity ?? 1;
        } else if (relTime >= next.time) {
          x = next.x ?? x;
          y = next.y ?? y;
          scale = next.scale ?? scale;
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
          
          // Easing 적용
          const easedT = applyEasing(t, prev.easing || 'linear');
          
          x = (prev.x ?? x) + ((next.x ?? x) - (prev.x ?? x)) * easedT;
          y = (prev.y ?? y) + ((next.y ?? y) - (prev.y ?? y)) * easedT;
          scale = (prev.scale ?? scale) + ((next.scale ?? scale) - (prev.scale ?? scale)) * easedT;
          const prevOpacity = prev.opacity ?? layer.opacity ?? 1;
          const nextOpacity = next.opacity ?? layer.opacity ?? 1;
          animOpacity = prevOpacity + (nextOpacity - prevOpacity) * easedT;
        }
      } else {
        animOpacity = layer.opacity ?? 1;
      }

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
    ctx.restore();
  }, [layers, currentTime, width, height, selectedLayerIndex, displaySize, thumbImages, zoom]);

  // 클릭 시 실제 layers의 인덱스를 넘김 (좌표 변환 필요)
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // 표시 좌표를 내부 좌표로 변환
    const scaleX = width / displaySize.width;
    const scaleY = height / displaySize.height;
    const internalX = displayX * scaleX;
    const internalY = displayY * scaleY;
    
    for (let i = layerRects.current.length - 1; i >= 0; i--) {
      const { x: lx, y: ly, w, h, index } = layerRects.current[i];
      if (internalX >= lx && internalX <= lx + w && internalY >= ly && internalY <= ly + h) {
        onSelectLayer && onSelectLayer(index);
        return;
      }
    }
    onSelectLayer && onSelectLayer(null);
  };

  return <canvas ref={canvasRef} onClick={handleCanvasClick} />;
}

export default CanvasPreview;
