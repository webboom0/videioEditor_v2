import React, { useState, useRef } from "react";
import "../styles/Timeline.css";
import AudioWaveform from "./AudioWaveform.js";

function Timeline({
  mediaFiles,
  onRemove,
  playhead,
  onPlayheadChange,
  selectedLayerIndex,
  onSelectLayer,
  onChangeImage,
  onKeyframeAdd,
  onKeyframeRemove,
  onKeyframeUpdate,
  onKeyframeSelect,
  onKeyframeDeselect,
  selectedKeyframe,
  onClipResize,
}) {
  const TIMELINE_DURATION = 180; // 3분(초)
  const TIMELINE_WIDTH = 600; // 타임라인 전체 px (원하는 값으로 조정)

  // 시간 눈금 생성 (예: 0, 10, 20, ..., 180)
  const tickStep = 10;
  const ticks = Array.from(
    { length: TIMELINE_DURATION / tickStep + 1 },
    (_, i) => i * tickStep
  );

  // 트랙별로 미디어 분리
  const videoClips = mediaFiles
    .map((clip, i) => ({ ...clip, globalIndex: i }))
    .filter((f) => f.type === "video");
  const audioClips = mediaFiles
    .map((clip, i) => ({ ...clip, globalIndex: i }))
    .filter((f) => f.type === "audio");
  const imageClips = mediaFiles
    .map((clip, i) => ({ ...clip, globalIndex: i }))
    .filter((f) => f.type === "image");
  const textClips = mediaFiles
    .map((clip, i) => ({ ...clip, globalIndex: i }))
    .filter((f) => f.type === "text");
  const effectClips = mediaFiles
    .map((clip, i) => ({ ...clip, globalIndex: i }))
    .filter((f) => f.type === "effect");

  const headerRef = useRef(null);

  // playhead 이동 함수
  const movePlayhead = (clientX) => {
    const target = headerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const newTime = Math.round(percent * TIMELINE_DURATION);
    onPlayheadChange && onPlayheadChange(newTime);
  };

  // 드래그 상태 관리
  let isDragging = false;

  // 마우스 이벤트 핸들러
  const handleHeaderMouseDown = (e) => {
    movePlayhead(e.clientX);

    const handleMouseMove = (moveEvent) => {
      movePlayhead(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // 플레이헤드 위치
  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = Math.round(percent * TIMELINE_DURATION);
    onPlayheadChange && onPlayheadChange(newTime);
    
    // 타임라인 빈 공간 클릭 시 키프레임 선택 해제
    onKeyframeDeselect && onKeyframeDeselect();
  };

  // 클립 리사이즈 핸들 드래그
  const handleResizeStart = (e, clipIndex, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const clip = mediaFiles[clipIndex];
    const startX = e.clientX;
    const origStart = clip.start;
    const origDuration = clip.duration;
    const timelineRect = e.target.closest('.timeline-tracks').getBoundingClientRect();
    const timelineWidth = timelineRect.width;

    // 키프레임 제한 계산
    let minStart = 0;
    let maxEnd = origStart + origDuration;
    if (Array.isArray(clip.animation) && clip.animation.length > 0) {
      const minKF = Math.min(...clip.animation.map(kf => kf.time));
      const maxKF = Math.max(...clip.animation.map(kf => kf.time));
      minStart = origStart + minKF;
      maxEnd = origStart + maxKF;
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSec = (deltaX / timelineWidth) * TIMELINE_DURATION;
      let newStart = origStart;
      let newDuration = origDuration;
      if (direction === 'left') {
        newStart = Math.max(0, Math.min(origStart + deltaSec, origStart + origDuration - 0.1));
        if (Array.isArray(clip.animation) && clip.animation.length > 0) {
          newStart = Math.min(newStart, minStart);
        }
        newDuration = origDuration + (origStart - newStart);
      } else if (direction === 'right') {
        let newEnd = origStart + origDuration + deltaSec;
        if (Array.isArray(clip.animation) && clip.animation.length > 0) {
          newEnd = Math.max(newEnd, maxEnd);
        }
        newEnd = Math.max(newEnd, origStart + 0.1);
        newDuration = newEnd - origStart;
      }
      onClipResize && onClipResize(clipIndex, newStart, newDuration);
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 클립 스타일 계산
  const getClipStyle = (clip) => ({
    left: `${(clip.start / TIMELINE_DURATION) * 100}%`,
    width: `${(clip.duration / TIMELINE_DURATION) * 100}%`,
  });

  // 키프레임 렌더링 함수
  const renderKeyframes = (clip) => {
    if (!Array.isArray(clip.animation) || clip.animation.length <= 1) {
      return null;
    }

    const clipIndex = mediaFiles.indexOf(clip);

    return clip.animation.map((keyframe, idx) => {
      // 키프레임의 상대적 시간을 클립 내에서의 위치로 변환
      const keyframeTime = keyframe.time;
      const relativePosition = (keyframeTime / clip.duration) * 100;
      
      // 선택된 키프레임인지 확인
      const isSelected = selectedKeyframe && 
                        selectedKeyframe.layerIndex === clipIndex && 
                        selectedKeyframe.keyframeIndex === idx;
      
      // Easing 타입에 따른 색상 결정
      const getKeyframeColor = (easing) => {
        switch (easing) {
          case 'easeIn':
            return { bg: '#ff9800', border: '#f57c00' }; // 주황색
          case 'easeOut':
            return { bg: '#4caf50', border: '#388e3c' }; // 초록색
          case 'easeInOut':
            return { bg: '#9c27b0', border: '#7b1fa2' }; // 보라색
          default:
            return { bg: '#ffeb3b', border: '#f57f17' }; // 노란색 (linear)
        }
      };
      
      const colors = getKeyframeColor(keyframe.easing);
      
      // 더블클릭 시 삭제 확인
      const handleKeyframeDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('이 키프레임을 삭제하시겠습니까?')) {
          onKeyframeRemove && onKeyframeRemove(mediaFiles.indexOf(clip), keyframeTime);
        }
      };

      return (
        <div
          key={`keyframe-${idx}`}
          className={`timeline-keyframe${isSelected ? ' selected' : ''}`}
          style={{
            left: `${relativePosition}%`,
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: isSelected ? '12px' : '8px',
            height: isSelected ? '12px' : '8px',
            backgroundColor: isSelected ? '#ff0000' : colors.bg,
            borderRadius: '50%',
            border: `2px solid ${isSelected ? '#ffffff' : colors.border}`,
            cursor: 'grab',
            zIndex: isSelected ? 10 : 5,
            boxShadow: isSelected ? '0 0 8px rgba(255, 0, 0, 0.8)' : 'none',
          }}
          title={`키프레임 ${idx + 1}: ${keyframeTime}s (${keyframe.easing || 'linear'}) - 드래그하여 시간 조정, 더블클릭하여 삭제`}
          onMouseDown={(e) => handleKeyframeDragStart(e, clip, idx)}
          onClick={(e) => {
            e.stopPropagation();
            // 키프레임 시간으로 플레이헤드 이동
            const absoluteTime = clip.start + keyframeTime;
            onPlayheadChange && onPlayheadChange(absoluteTime);
            
            // 해당 객체 선택
            const clipIndex = mediaFiles.indexOf(clip);
            onSelectLayer && onSelectLayer(clipIndex);
            
            // 키프레임 선택
            onKeyframeSelect && onKeyframeSelect(clipIndex, idx);
          }}
          onDoubleClick={handleKeyframeDoubleClick}
        />
      );
    });
  };

  // 키프레임 드래그 시작
  const handleKeyframeDragStart = (e, clip, keyframeIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const keyframe = clip.animation[keyframeIndex];
    const startX = e.clientX;
    const startTime = keyframe.time;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const clipElement = e.target.closest('.timeline-clip');
      if (!clipElement) return;
      
      const clipRect = clipElement.getBoundingClientRect();
      const clipWidth = clipRect.width;
      const deltaTime = (deltaX / clipWidth) * clip.duration;
      const newTime = Math.max(0, Math.min(clip.duration, startTime + deltaTime));
      
      // 다른 키프레임과 최소 0.5초 간격 유지
      const otherKeyframes = clip.animation.filter((_, i) => i !== keyframeIndex);
      const tooClose = otherKeyframes.some(kf => Math.abs(kf.time - newTime) < 0.5);
      
      if (!tooClose) {
        // 키프레임 시간 업데이트
        onKeyframeUpdate && onKeyframeUpdate(
          mediaFiles.indexOf(clip), 
          keyframeIndex, 
          { ...keyframe, time: newTime }
        );
      }
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 클립 더블클릭 시 키프레임 생성
  const handleClipDoubleClick = (e, clip, clipIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = Math.max(0, Math.min(clip.duration, percent * clip.duration));
    const absTime = clip.start + time;

    // 이미 해당 시간에 키프레임이 있으면 무시
    if (Array.isArray(clip.animation) && clip.animation.some(kf => Math.abs(kf.time - time) < 0.1)) {
      return;
    }

    let newKF = { time, x: clip.x || 0, y: clip.y || 0, scale: clip.scale || 1, opacity: clip.opacity || 1 };
    const anim = Array.isArray(clip.animation) ? [...clip.animation] : [];
    if (anim.length === 0) {
      // 키프레임이 하나도 없으면 현재 값
      // 이미 newKF에 반영됨
    } else {
      // 시간 기준으로 앞뒤 키프레임 찾기
      const sorted = anim.slice().sort((a, b) => a.time - b.time);
      let prev = sorted[0], next = sorted[sorted.length - 1];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].time > time) {
          next = sorted[i];
          prev = sorted[i - 1];
          break;
        }
      }
      if (time <= sorted[0].time) {
        // 맨 앞이면 첫 키프레임 값 복사
        newKF = { ...sorted[0], time };
      } else if (time >= sorted[sorted.length - 1].time) {
        // 맨 뒤면 마지막 키프레임 값 복사
        newKF = { ...sorted[sorted.length - 1], time };
      } else {
        // 중간이면 prev/next 보간
        const t = (time - prev.time) / (next.time - prev.time);
        newKF = {
          time,
          x: (prev.x ?? 0) + ((next.x ?? 0) - (prev.x ?? 0)) * t,
          y: (prev.y ?? 0) + ((next.y ?? 0) - (prev.y ?? 0)) * t,
          scale: (prev.scale ?? 1) + ((next.scale ?? 1) - (prev.scale ?? 1)) * t,
          opacity: (prev.opacity ?? 1) + ((next.opacity ?? 1) - (prev.opacity ?? 1)) * t,
          easing: prev.easing || 'linear',
        };
      }
    }
    onKeyframeAdd && onKeyframeAdd(clipIndex, time, newKF);
  };

  // 컨텍스트 메뉴 처리
  const handleClipContextMenu = (e, clipIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 현재 플레이헤드가 이 클립 내부에 있는지 확인
    const clip = mediaFiles[clipIndex];
    const relativeTime = playhead - clip.start;
    
    if (relativeTime < 0 || relativeTime > clip.duration) {
      return; // 클립 범위 밖이면 무시
    }

    // 컨텍스트 메뉴 생성
    const menu = document.createElement('div');
    menu.className = 'timeline-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      padding: 4px 0;
    `;

    // 키프레임 추가 버튼
    const addButton = document.createElement('button');
    addButton.textContent = `키프레임 추가 (${relativeTime.toFixed(1)}s)`;
    addButton.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: none;
      cursor: pointer;
      text-align: left;
      font-size: 12px;
    `;
    addButton.onclick = () => {
      onKeyframeAdd && onKeyframeAdd(clipIndex, relativeTime);
      document.body.removeChild(menu);
    };

    // 키프레임 삭제 버튼 (가장 가까운 키프레임)
    const existingKeyframes = clip.animation || [];
    const closestKeyframe = existingKeyframes.find(kf => 
      Math.abs(kf.time - relativeTime) < 0.5
    );
    
    if (closestKeyframe) {
      const removeButton = document.createElement('button');
      removeButton.textContent = `키프레임 삭제 (${closestKeyframe.time.toFixed(1)}s)`;
      removeButton.style.cssText = addButton.style.cssText;
      removeButton.onclick = () => {
        onKeyframeRemove && onKeyframeRemove(clipIndex, closestKeyframe.time);
        document.body.removeChild(menu);
      };
      menu.appendChild(removeButton);
    }

    menu.appendChild(addButton);

    // 메뉴 외부 클릭 시 닫기
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };
    
    document.addEventListener('click', closeMenu);
    document.body.appendChild(menu);
  };

  return (
    <div className="timeline">
      {/* 시간 눈금 */}
      <div
        className="timeline-header"
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
        style={{ cursor: "pointer" }}
      >
        <div className="timeline-ticks">
          {ticks.map((t) => (
            <span key={t} className="timeline-tick">
              {t}s
            </span>
          ))}
        </div>
      </div>
      {/* 트랙들 */}
      <div className="timeline-tracks" onClick={handleTimelineClick}>
        {mediaFiles.map((clip, i) => {
          const clipWidthPx =
            (clip.duration / TIMELINE_DURATION) * TIMELINE_WIDTH;
          return (
            <div className={`timeline-track track-${clip.type}`} key={i}>
              <span className="track-label">
                {clip.type === "video" && "영상"}
                {clip.type === "audio" && "오디오"}
                {clip.type === "image" && "이미지"}
                {clip.type === "text" && "텍스트"}
                {clip.type === "effect" && "이펙트"}
              </span>
              <div
                className={`timeline-clip clip-${clip.type}${
                  selectedLayerIndex === i ? " selected" : ""
                }`}
                style={{
                  left: `${(clip.start / TIMELINE_DURATION) * 100}%`,
                  width: `${(clip.duration / TIMELINE_DURATION) * 100}%`,
                  position: 'relative',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer && onSelectLayer(i);
                }}
                onContextMenu={(e) => handleClipContextMenu(e, i)}
                onDoubleClick={(e) => handleClipDoubleClick(e, clip, i)}
              >
                {/* 왼쪽 리사이즈 핸들 */}
                <div
                  className="timeline-resize-handle left"
                  onMouseDown={(e) => handleResizeStart(e, i, 'left')}
                  style={{ position: 'absolute', left: 0, top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 24, cursor: 'ew-resize', zIndex: 10, background: 'transparent' }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #007bff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                </div>
                {/* 오른쪽 리사이즈 핸들 */}
                <div
                  className="timeline-resize-handle right"
                  onMouseDown={(e) => handleResizeStart(e, i, 'right')}
                  style={{ position: 'absolute', right: 0, top: '50%', transform: 'translate(50%, -50%)', width: 12, height: 24, cursor: 'ew-resize', zIndex: 10, background: 'transparent' }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #007bff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                </div>
                {/* 클립 내용 */}
                {clip.type === "image" ? (
                  <>{clip.name || "이미지"}</>
                ) : clip.type === "audio" ? (
                  <AudioWaveform
                    src={clip.src}
                    width={clipWidthPx}
                    height={30}
                  />
                ) : (
                  clip.name || clip.text || clip.type
                )}
                {/* 키프레임 표시 */}
                {renderKeyframes(clip)}
              </div>
            </div>
          );
        })}
        {/* 플레이헤드 */}
        <div
          className="timeline-playhead"
          style={{
            left: `${(playhead / TIMELINE_DURATION) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

export default Timeline;
