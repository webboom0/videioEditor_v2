import React, { useState, useRef } from "react";
import "../styles/Timeline.css";

function Timeline({
  mediaFiles,
  onRemove,
  playhead,
  onPlayheadChange,
  selectedLayerIndex,
  onSelectLayer,
}) {
  const TIMELINE_DURATION = 180; // 3분(초)

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
  };

  // 클립 스타일 계산
  const getClipStyle = (clip) => ({
    left: `${(clip.start / TIMELINE_DURATION) * 100}%`,
    width: `${(clip.duration / TIMELINE_DURATION) * 100}%`,
  });

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
        {mediaFiles.map((clip, i) => (
          <div className="timeline-track" key={i}>
            <span className="track-label">
              {clip.type === "video" && "영상"}
              {clip.type === "audio" && "오디오"}
              {clip.type === "image" && "이미지"}
              {clip.type === "text" && "텍스트"}
              {clip.type === "effect" && "이펙트"}
            </span>
            <div
              className={`timeline-clip${
                selectedLayerIndex === i ? " selected" : ""
              }`}
              style={{
                left: `${(clip.start / TIMELINE_DURATION) * 100}%`,
                width: `${(clip.duration / TIMELINE_DURATION) * 100}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer && onSelectLayer(i);
              }}
            >
              {clip.name || clip.text || clip.type}
            </div>
          </div>
        ))}
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
