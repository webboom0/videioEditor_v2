import React, { useRef, useEffect, useState } from "react";
import { EFFECT_MAP } from "../effects/effectUtils";
import { drawCroppedImage, calculateCrop } from "../utils/imageCropUtils";
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
  width = 5000, // 작업 공간 확장: 5000x5000
  height = 5000,
  selectedLayerIndex,
  onSelectLayer,
  onMoveKeyframe,
  onResizeKeyframe,
  containerRef,
  quality = 0.4,
  zoom = 1,
  selectedKeyframe,
  onKeyframeUpdate,
}) {
  const canvasRef = useRef(null);
  const videoRefs = useRef({});
  const [displaySize, setDisplaySize] = useState({ width: 1280, height: 720 });

  // 내보내기 영역 설정 (1920x1080, 중앙 고정)
  const exportWidth = 1920;
  const exportHeight = 1080;
  const exportX = (width - exportWidth) / 2; // 중앙 정렬
  const exportY = (height - exportHeight) / 2;

  // 각 레이어의 위치와 크기 저장
  const layerRects = useRef([]);

  // 썸네일 이미지 상태 관리
  const [thumbImages, setThumbImages] = useState({});

  // === 뷰포트 패닝(마우스 드래그) ===
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // === 키프레임 드래그 상태 ===
  const isDraggingKeyframe = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartKeyframe = useRef(null);
  
  // 커서 상태 관리
  const [cursor, setCursor] = useState('default');

  // 드래그 상태 추가
  const [dragMode, setDragMode] = useState(null); // 'move' | 'resize'
  const dragHandleIndex = useRef(null); // 0:좌상, 1:우상, 2:좌하, 3:우하

  // --- 보간 함수 추가 ---
  function getCurrentKeyframeValue(layer, currentTime) {
    if (!Array.isArray(layer.animation) || layer.animation.length === 0) {
      return {
        x: layer.x ?? 0,
        y: layer.y ?? 0,
        scale: layer.scale ?? 1,
        opacity: layer.opacity ?? 1,
      };
    }
    const relTime = currentTime - layer.start;
    let prev = layer.animation[0];
    let next = layer.animation[layer.animation.length - 1];
    if (relTime <= prev.time) {
      return {
        x: prev.x ?? layer.x ?? 0,
        y: prev.y ?? layer.y ?? 0,
        scale: prev.scale ?? layer.scale ?? 1,
        opacity: prev.opacity ?? layer.opacity ?? 1,
      };
    } else if (relTime >= next.time) {
      return {
        x: next.x ?? layer.x ?? 0,
        y: next.y ?? layer.y ?? 0,
        scale: next.scale ?? layer.scale ?? 1,
        opacity: next.opacity ?? layer.opacity ?? 1,
      };
    } else {
      for (let i = 1; i < layer.animation.length; i++) {
        if (layer.animation[i].time > relTime) {
          next = layer.animation[i];
          prev = layer.animation[i - 1];
          break;
        }
      }
      const t = (relTime - prev.time) / (next.time - prev.time);
      const easedT = applyEasing(t, prev.easing || 'linear');
      return {
        x: (prev.x ?? layer.x ?? 0) + ((next.x ?? layer.x ?? 0) - (prev.x ?? layer.x ?? 0)) * easedT,
        y: (prev.y ?? layer.y ?? 0) + ((next.y ?? layer.y ?? 0) - (prev.y ?? layer.y ?? 0)) * easedT,
        scale: (prev.scale ?? layer.scale ?? 1) + ((next.scale ?? layer.scale ?? 1) - (prev.scale ?? layer.scale ?? 1)) * easedT,
        opacity: (prev.opacity ?? layer.opacity ?? 1) + ((next.opacity ?? layer.opacity ?? 1) - (prev.opacity ?? layer.opacity ?? 1)) * easedT,
      };
    }
  }
  // ---

  // --- drawX, drawY, boxX, boxY를 완전히 일치시키는 함수 도입 ---
  function getTextDrawAndBox(layer, keyframe, ctx, width, height) {
    const fontSize = layer.fontSize || 30;
    const fontFamily = layer.fontFamily || "Arial";
    const text = layer.text || '';
    const scale = keyframe?.scale ?? layer.scale ?? 1;
    ctx.save();
    ctx.font = `${fontSize * scale}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const w = metrics.width;
    const h = fontSize * 1.2 * scale;
    ctx.restore();

    let drawX = keyframe?.x ?? layer.x ?? 0;
    let drawY = keyframe?.y ?? layer.y ?? 0;
    let textAlign = layer.align || "left";
    let textBaseline = "top";
    if (layer.align === "center") drawX = width / 2;
    else if (layer.align === "right") drawX = width - (layer.marginRight || 0);
    if (layer.verticalAlign === "middle") {
      textBaseline = "middle";
      drawY = height / 2;
    } else if (layer.verticalAlign === "bottom") {
      textBaseline = "bottom";
      drawY = height - (layer.marginBottom || 0);
    }
    // 바운딩 박스 좌표 계산 (textAlign, textBaseline에 따라)
    let boxX = drawX, boxY = drawY;
    if (textAlign === "center") boxX -= w / 2;
    else if (textAlign === "right") boxX -= w;
    if (textBaseline === "middle") boxY -= h / 2;
    else if (textBaseline === "bottom") boxY -= h;
    return { drawX, drawY, w, h, boxX, boxY, textAlign, textBaseline };
  }
  // ---

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    
    // 키프레임 핸들 클릭 확인
    if (selectedKeyframe && selectedKeyframe.layerIndex !== null && selectedKeyframe.keyframeIndex !== null) {
      const selectedLayer = layers[selectedKeyframe.layerIndex];
      if (selectedLayer && selectedLayer.animation && selectedLayer.animation[selectedKeyframe.keyframeIndex]) {
        const keyframe = selectedLayer.animation[selectedKeyframe.keyframeIndex];
        const absoluteTime = selectedLayer.start + keyframe.time;
        
        // 현재 시간이 키프레임 시간과 일치하는지 확인
        if (Math.abs(currentTime - absoluteTime) < 0.1) {
          const rect = canvasRef.current.getBoundingClientRect();
          const displayX = e.clientX - rect.left;
          const displayY = e.clientY - rect.top;
          
          // 표시 좌표를 내부 좌표로 변환
          const scaleX = width / displaySize.width;
          const scaleY = height / displaySize.height;
          const internalX = displayX * scaleX;
          const internalY = displayY * scaleY;
          
          if (selectedLayer.type === 'text') {
            const { drawX, drawY, w, h, boxX, boxY, textAlign, textBaseline } = getTextDrawAndBox(selectedLayer, keyframe, canvasRef.current.getContext("2d"), width, height);
            const handleSize = 12;
            const handles = [
              { x: boxX, y: boxY },
              { x: boxX + w, y: boxY },
              { x: boxX, y: boxY + h },
              { x: boxX + w, y: boxY + h }
            ];
            // 핸들 클릭 판정
            for (let i = 0; i < handles.length; i++) {
              const handle = handles[i];
              if (
                Math.abs(internalX - handle.x) <= handleSize / 2 &&
                Math.abs(internalY - handle.y) <= handleSize / 2
              ) {
                // 크기조절 시작
                isDraggingKeyframe.current = true;
                dragStartPos.current = { x: internalX, y: internalY };
                dragStartKeyframe.current = { ...keyframe };
                setDragMode('resize');
                dragHandleIndex.current = i;
                setCursor('nwse-resize');
                window.addEventListener('mousemove', handleKeyframeDrag);
                window.addEventListener('mouseup', handleKeyframeDragEnd);
                return;
              }
            }
            // 바운딩 박스 내부 클릭: 이동
            if (
              internalX >= boxX && internalX <= boxX + w &&
              internalY >= boxY && internalY <= boxY + h
            ) {
              isDraggingKeyframe.current = true;
              dragStartPos.current = { x: internalX, y: internalY };
              dragStartKeyframe.current = { ...keyframe };
              setDragMode('move');
              setCursor('grabbing');
              window.addEventListener('mousemove', handleKeyframeDrag);
              window.addEventListener('mouseup', handleKeyframeDragEnd);
              return;
            }
          }
          // 키프레임 위치 계산
          let keyframeX = keyframe.x ?? selectedLayer.x ?? 0;
          let keyframeY = keyframe.y ?? selectedLayer.y ?? 0;
          
          // 정렬 처리
          if (selectedLayer.align === "center") {
            keyframeX = width / 2;
          } else if (selectedLayer.align === "right") {
            keyframeX = width - (selectedLayer.marginRight || 0);
          }
          
          if (selectedLayer.verticalAlign === "middle") {
            keyframeY = height / 2;
          } else if (selectedLayer.verticalAlign === "bottom") {
            keyframeY = height - (selectedLayer.marginBottom || 0);
          }
          
          // 핸들 영역 확인 (20px 반지름)
          const distance = Math.sqrt((internalX - keyframeX) ** 2 + (internalY - keyframeY) ** 2);
          if (distance <= 20) {
            isDraggingKeyframe.current = true;
            dragStartPos.current = { x: internalX, y: internalY };
            dragStartKeyframe.current = { ...keyframe };
            setCursor('grabbing');
            
            window.addEventListener('mousemove', handleKeyframeDrag);
            window.addEventListener('mouseup', handleKeyframeDragEnd);
            return;
          }
        }
      }
    }
    
    // 기존 패닝 로직
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(e) {
    if (!isPanning.current) {
      // 키프레임 핸들 위에 있는지 확인
      if (selectedKeyframe && selectedKeyframe.layerIndex !== null && selectedKeyframe.keyframeIndex !== null) {
        const selectedLayer = layers[selectedKeyframe.layerIndex];
        if (selectedLayer && selectedLayer.animation && selectedLayer.animation[selectedKeyframe.keyframeIndex]) {
          const keyframe = selectedLayer.animation[selectedKeyframe.keyframeIndex];
          const absoluteTime = selectedLayer.start + keyframe.time;
          
          if (Math.abs(currentTime - absoluteTime) < 0.1) {
            const rect = canvasRef.current.getBoundingClientRect();
            const displayX = e.clientX - rect.left;
            const displayY = e.clientY - rect.top;
            
            const scaleX = width / displaySize.width;
            const scaleY = height / displaySize.height;
            const internalX = displayX * scaleX;
            const internalY = displayY * scaleY;
            
            let keyframeX = keyframe.x ?? selectedLayer.x ?? 0;
            let keyframeY = keyframe.y ?? selectedLayer.y ?? 0;
            
            if (selectedLayer.align === "center") {
              keyframeX = width / 2;
            } else if (selectedLayer.align === "right") {
              keyframeX = width - (selectedLayer.marginRight || 0);
            }
            
            if (selectedLayer.verticalAlign === "middle") {
              keyframeY = height / 2;
            } else if (selectedLayer.verticalAlign === "bottom") {
              keyframeY = height - (selectedLayer.marginBottom || 0);
            }
            
            const distance = Math.sqrt((internalX - keyframeX) ** 2 + (internalY - keyframeY) ** 2);
            if (distance <= 20) {
              setCursor('grab');
              return;
            }
          }
        }
      }
      setCursor('default');
      return;
    }
    
    const dx = (e.clientX - lastPos.current.x) / zoom;
    const dy = (e.clientY - lastPos.current.y) / zoom;
    viewportOffset.current.x += dx;
    viewportOffset.current.y += dy;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  
  function handleMouseUp() {
    isPanning.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  // 키프레임 드래그 중 핸들러
  function handleKeyframeDrag(e) {
    if (!isDraggingKeyframe.current || !dragStartKeyframe.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // 표시 좌표를 내부 좌표로 변환
    const scaleX = width / displaySize.width;
    const scaleY = height / displaySize.height;
    const internalX = displayX * scaleX;
    const internalY = displayY * scaleY;
    
    if (dragMode === 'move') {
      // 이동
      const deltaX = internalX - dragStartPos.current.x;
      const deltaY = internalY - dragStartPos.current.y;
      const newX = (dragStartKeyframe.current.x ?? 0) + deltaX;
      const newY = (dragStartKeyframe.current.y ?? 0) + deltaY;
      if (onKeyframeUpdate && selectedKeyframe) {
        const updatedKeyframe = {
          ...dragStartKeyframe.current,
          x: newX,
          y: newY
        };
        onKeyframeUpdate(selectedKeyframe.layerIndex, selectedKeyframe.keyframeIndex, updatedKeyframe);
      }
    } else if (dragMode === 'resize') {
      // 크기조절
      const { drawX, drawY, w: bw, h: bh } = getTextDrawAndBox(selectedLayer, dragStartKeyframe.current, canvasRef.current.getContext("2d"), width, height);
      let refX = drawX, refY = drawY, refW = bw, refH = bh;
      let newW = bw, newH = bh;
      let scale = dragStartKeyframe.current.scale ?? selectedLayer.scale ?? 1;
      // 각 핸들별로 기준점/방향 다름
      if (dragHandleIndex.current === 0) { // 좌상
        newW = (refX + refW) - internalX;
        newH = (refY + refH) - internalY;
      } else if (dragHandleIndex.current === 1) { // 우상
        newW = internalX - refX;
        newH = (refY + refH) - internalY;
      } else if (dragHandleIndex.current === 2) { // 좌하
        newW = (refX + refW) - internalX;
        newH = internalY - refY;
      } else if (dragHandleIndex.current === 3) { // 우하
        newW = internalX - refX;
        newH = internalY - refY;
      }
      // 최소 크기 제한
      newW = Math.max(10, newW);
      newH = Math.max(10, newH);
      // scale 계산 (기존 크기 대비 비율)
      const baseFontSize = selectedLayer.fontSize || 30;
      const baseW = (selectedLayer.text?.length || 1) * baseFontSize * 0.6;
      const baseH = baseFontSize * 1.2;
      const newScale = Math.min(newW / baseW, newH / baseH);
      if (onKeyframeUpdate && selectedKeyframe) {
        const updatedKeyframe = {
          ...dragStartKeyframe.current,
          scale: newScale
        };
        onKeyframeUpdate(selectedKeyframe.layerIndex, selectedKeyframe.keyframeIndex, updatedKeyframe);
      }
    }
  }

  // 키프레임 드래그 종료 핸들러
  function handleKeyframeDragEnd() {
    isDraggingKeyframe.current = false;
    dragStartKeyframe.current = null;
    setDragMode(null);
    dragHandleIndex.current = null;
    setCursor('default');
    window.removeEventListener('mousemove', handleKeyframeDrag);
    window.removeEventListener('mouseup', handleKeyframeDragEnd);
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

  // 가이드라인 그리기 함수
  function drawGuides(ctx) {
    ctx.save();
    
    // 내보내기 영역 테두리 (1920x1080)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(exportX, exportY, exportWidth, exportHeight);
    
    // 내보내기 영역 배경 (반투명)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(exportX, exportY, exportWidth, exportHeight);
    
    // Rule of Thirds 가이드라인
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // 세로선 (1/3, 2/3)
    const thirdX1 = exportX + exportWidth / 3;
    const thirdX2 = exportX + (exportWidth * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(thirdX1, exportY);
    ctx.lineTo(thirdX1, exportY + exportHeight);
    ctx.moveTo(thirdX2, exportY);
    ctx.lineTo(thirdX2, exportY + exportHeight);
    ctx.stroke();
    
    // 가로선 (1/3, 2/3)
    const thirdY1 = exportY + exportHeight / 3;
    const thirdY2 = exportY + (exportHeight * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(exportX, thirdY1);
    ctx.lineTo(exportX + exportWidth, thirdY1);
    ctx.moveTo(exportX, thirdY2);
    ctx.lineTo(exportX + exportWidth, thirdY2);
    ctx.stroke();
    
    // 중앙 십자선
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    const centerX = exportX + exportWidth / 2;
    const centerY = exportY + exportHeight / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, exportY);
    ctx.lineTo(centerX, exportY + exportHeight);
    ctx.moveTo(exportX, centerY);
    ctx.lineTo(exportX + exportWidth, centerY);
    ctx.stroke();
    
    // 안전 영역 (90% 영역)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 1]);
    const safeMargin = 0.05; // 5% 마진
    const safeX = exportX + exportWidth * safeMargin;
    const safeY = exportY + exportHeight * safeMargin;
    const safeWidth = exportWidth * (1 - 2 * safeMargin);
    const safeHeight = exportHeight * (1 - 2 * safeMargin);
    ctx.strokeRect(safeX, safeY, safeWidth, safeHeight);
    
    // 내보내기 영역 라벨
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('EXPORT AREA (1920x1080)', exportX + 10, exportY + 10);
    
    ctx.restore();
  }

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
    ctx.translate(-viewportOffset.current.x, -viewportOffset.current.y);
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
          // draw와 동일한 anchor/offset/scale/crop 계산
          let anchorX = layer.x ?? 0;
          let anchorY = layer.y ?? 0;
          if (anchorX === 0 && layer.align === "center") anchorX = width / 2;
          else if (anchorX === 0 && layer.align === "right") anchorX = width;
          if (anchorY === 0 && layer.verticalAlign === "middle") anchorY = height / 2;
          else if (anchorY === 0 && layer.verticalAlign === "bottom") anchorY = height;
          let animOffsetX = 0, animOffsetY = 0, animScale = 1;
          if (Array.isArray(layer.animation) && layer.animation.length > 1) {
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
            animScale = (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t;
          }
          const finalX = anchorX + animOffsetX;
          const finalY = anchorY + animOffsetY;
          let renderScale = (layer.scale ?? 1) * animScale;
          const cropOptions = {
            scaleMode: layer.scaleMode || 'fit',
            cropMode: layer.cropMode || 'center',
            targetSize: layer.targetSize || null,
            cropOffset: layer.cropOffset || { x: 0, y: 0 },
            cropZoom: layer.cropZoom || 1.0,
          };
          const targetWidth = cropOptions.targetSize?.width || img.naturalWidth;
          const targetHeight = cropOptions.targetSize?.height || img.naturalHeight;
          const cropData = calculateCrop(img, {
            ...cropOptions,
            targetWidth,
            targetHeight,
          });
          // drawImage(..., -targetWidth/2, -targetHeight/2, targetWidth, targetHeight)
          const boxW = targetWidth * renderScale;
          const boxH = targetHeight * renderScale;
          const boxX = finalX - (targetWidth / 2) * renderScale;
          const boxY = finalY - (targetHeight / 2) * renderScale;
          // layerRects에 실제 draw되는 box 좌표 기록
          layerRects.current.push({
            x: boxX,
            y: boxY,
            w: boxW,
            h: boxH,
            index: idx,
          });
          // drawCroppedImage 호출
          drawCroppedImage(ctx, img, {
            ...cropOptions,
            x: finalX,
            y: finalY,
            scale: renderScale,
            opacity: animOpacity,
            align: layer.align || 'center',
            verticalAlign: layer.verticalAlign || 'middle',
          });
          
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
        const { x, y, scale } = getCurrentKeyframeValue(layer, currentTime);
        const { drawX, drawY, w, h, boxX, boxY, textAlign, textBaseline } = getTextDrawAndBox(layer, { x, y, scale }, ctx, width, height);
        ctx.save();
        ctx.globalAlpha = layer.opacity ?? 1;
        ctx.font = `${layer.fontSize ? layer.fontSize * scale : 32 * scale}px ${layer.fontFamily || "sans-serif"}`;
        ctx.fillStyle = layer.color || "#fff";
        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;
        ctx.fillText(layer.text || "", drawX, drawY);
        // 바운딩 박스/핸들
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(boxX, boxY, w, h);
        ctx.setLineDash([]);
        const handleSize = 12;
        const handles = [
          { x: boxX, y: boxY },
          { x: boxX + w, y: boxY },
          { x: boxX, y: boxY + h },
          { x: boxX + w, y: boxY + h }
        ];
        handles.forEach(handle => {
          ctx.save();
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fff';
          ctx.fillStyle = 'rgba(255,0,0,0.8)';
          ctx.rect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
        ctx.restore();
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

      const { x, y, scale } = getCurrentKeyframeValue(layer, currentTime);
      const { drawX, drawY, w, h, boxX, boxY, textAlign, textBaseline } = getTextDrawAndBox(layer, { x, y, scale }, ctx, width, height);
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.font = `${layer.fontSize ? layer.fontSize * scale : 32 * scale}px ${layer.fontFamily || "sans-serif"}`;
      ctx.fillStyle = layer.color || "#fff";
      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;
      ctx.fillText(layer.text || "", drawX, drawY);
      // 바운딩 박스/핸들
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(boxX, boxY, w, h);
      ctx.setLineDash([]);
      const handleSize = 12;
      const handles = [
        { x: boxX, y: boxY },
        { x: boxX + w, y: boxY },
        { x: boxX, y: boxY + h },
        { x: boxX + w, y: boxY + h }
      ];
      handles.forEach(handle => {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = 'rgba(255,0,0,0.8)';
        ctx.rect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    });

    // 3. 가이드라인 그리기 (맨 위에)
    drawGuides(ctx);
    
    ctx.restore();
  }, [layers, currentTime, width, height, selectedLayerIndex, displaySize, thumbImages, zoom, selectedKeyframe]);

  // 클릭 시 실제 layers의 인덱스를 넘김 (좌표 변환 필요)
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // 표시 좌표를 내부 좌표로 변환 (뷰포트 오프셋 고려)
    const scaleX = width / displaySize.width;
    const scaleY = height / displaySize.height;
    const internalX = (displayX * scaleX) / zoom + viewportOffset.current.x;
    const internalY = (displayY * scaleY) / zoom + viewportOffset.current.y;
    
    for (let i = layerRects.current.length - 1; i >= 0; i--) {
      const { x: lx, y: ly, w, h, index } = layerRects.current[i];
      if (internalX >= lx && internalX <= lx + w && internalY >= ly && internalY <= ly + h) {
        onSelectLayer && onSelectLayer(index);
        return;
      }
    }
    onSelectLayer && onSelectLayer(null);
  };

  return <canvas 
    ref={canvasRef} 
    onClick={handleCanvasClick}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    style={{ cursor: isDraggingKeyframe.current ? 'grabbing' : cursor }}
  />;
}

export default CanvasPreview;
