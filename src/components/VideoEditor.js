import React, { useState, useRef, useEffect } from "react";
import Timeline from "./Timeline";
import MediaLibrary from "./MediaLibrary";
import EffectsPanel from "./EffectsPanel";
import PreviewWindow from "./PreviewWindow";
import CanvasPreview from "./CanvasPreview";
import PropertyBox from "./PropertyBox";

const TIMELINE_DURATION = 180; // 3분(초)

function VideoEditor() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [layers, setLayers] = useState([
    {
      type: "text",
      text: "Hello!",
      x: 200,
      y: 100,
      start: 0,
      duration: 100,
      color: "#fff",
      font: "30px Arial",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 5, x: 200, y: 100, scale: 1 }, // 5초 시점 (1.5배)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_01.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 0,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 0, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_02.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 10,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 0, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_03.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 20,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 20, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_04.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 30,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 0, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_05.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 40,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 0, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    {
      type: "image",
      src: "/files/photo/photo_06.jpg",
      x: 0, // 시작 위치 (px)
      y: 0,
      start: 50,
      duration: 10, // 클립 전체 지속시간
      scale: 1, // 시작 scale (1 = 원본 크기)
      scaleMode: "fit",
      animation: [
        { time: 0, x: 0, y: 0, scale: 1 }, // 시작 (원본 크기)
        { time: 2, x: 0, y: 0, scale: 1.2 }, // 2초 시점 (1.2배)
        { time: 5, x: 0, y: 0, scale: 1.5 }, // 5초 시점 (1.5배)
        { time: 10, x: 0, y: 0, scale: 1 }, // 끝 (원본 크기)
      ],
    },
    // {
    //   type: "video",
    //   src: "/files/video/theme1.mp4",
    //   x: 0,
    //   y: 0,
    //   start: 2,
    //   duration: 100,
    //   animation: {
    //     type: "move-scale",
    //     endX: 400,
    //     endY: 200,
    //     endWidth: 320, // 원하는 최종 width
    //     endHeight: 180, // 원하는 최종 height
    //   },
    //   width: 160, // 시작 width
    //   height: 90,
    // },
    {
      type: "effect",
      effectType: "flash", // 또는 "line", "circle", "blur", "grayscale" 등
      x: 0,
      y: 0,
      width: 640,
      height: 360,
      start: 2,
      duration: 3,
      // 추가 파라미터
      color: "#fff",
      intensity: 0.7,
    },
    {
      type: "effect",
      effectType: "hearts",
      x: 0,
      y: 0,
      width: 640,
      height: 360,
      start: 10,
      duration: 4,
      count: 15, // 하트 개수
    },
    {
      type: "audio",
      src: "/files/music/DRAMA.mp3",
      start: 0,
      duration: 180, // 오디오 길이에 맞게 설정
      name: "DRAMA.mp3",
    },
    // ...이펙트 등
  ]);
  const [playhead, setPlayhead] = useState(0);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef();
  const audioRef = useRef(null);

  // 애니메이션 프레임
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, playhead]);

  const tick = () => {
    setPlayhead((prev) => {
      const next = prev + 0.033;
      if (next > TIMELINE_DURATION) {
        setIsPlaying(false);
        return TIMELINE_DURATION;
      }
      return next;
    });
    animationRef.current = requestAnimationFrame(tick);
  };

  // 오디오 동기화
  useEffect(() => {
    let animationId;

    function syncPlayhead() {
      const audio = audioRef.current;
      if (isPlaying && audio) {
        setPlayhead(audio.currentTime);
        animationId = requestAnimationFrame(syncPlayhead);
      }
    }

    if (isPlaying) {
      // 오디오 재생
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = playhead;
        audio.play();
        animationId = requestAnimationFrame(syncPlayhead);
      }
    } else {
      // 오디오 일시정지
      const audio = audioRef.current;
      if (audio) audio.pause();
      cancelAnimationFrame(animationId);
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  // 슬라이더 등으로 playhead가 바뀔 때 오디오 위치도 맞춰줌
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - playhead) > 0.1) {
      audio.currentTime = playhead;
    }
  }, [playhead]);

  const handleSelectEffect = (effect) => {
    console.log("선택된 효과:", effect);
  };

  const handleRemove = (index) => {
    setLayers((prevLayers) => prevLayers.filter((_, i) => i !== index));
  };

  const handlePlayheadChange = (newTime) => {
    setPlayhead(newTime);
  };

  // 텍스트 수정 핸들러
  const handleTextChange = (e) => {
    const value = e.target.value;
    setLayers((layers) =>
      layers.map((layer, i) =>
        i === selectedLayerIndex ? { ...layer, text: value } : layer
      )
    );
  };

  const selectedLayer =
    selectedLayerIndex !== null ? layers[selectedLayerIndex] : null;

  return (
    <div className="video-editor">
      <EffectsPanel onSelectEffect={handleSelectEffect} />
      <div className="editor-container">
        <div className="editor-media-container">
          <MediaLibrary onUpload={setMediaFiles} />
          {/* <PreviewWindow mediaFiles={mediaFiles} /> */}
          <CanvasPreview
            layers={layers}
            currentTime={playhead}
            width={640}
            height={360}
            selectedLayerIndex={selectedLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            onMoveLayer={(idx, x, y) => {
              setLayers((layers) =>
                layers.map((layer, i) =>
                  i === idx ? { ...layer, x, y } : layer
                )
              );
            }}
          />
        </div>
        <div className="editor-timeline-container">
          <div className="animation-controls">
            <button onClick={() => setIsPlaying((p) => !p)}>
              {isPlaying ? "⏸️ 일시정지" : "▶️ 재생"}
            </button>
            <span style={{ margin: "0 10px" }}>
              {playhead.toFixed(2)}s / {TIMELINE_DURATION}s
            </span>
            <input
              type="range"
              min={0}
              max={TIMELINE_DURATION}
              step={0.01}
              value={playhead}
              onChange={(e) => setPlayhead(Number(e.target.value))}
              style={{ width: 200 }}
            />
            <button
              onClick={() => {
                if (selectedLayerIndex !== null && layers[selectedLayerIndex]) {
                  setLayers((layers) =>
                    layers.filter((_, i) => i !== selectedLayerIndex)
                  );
                  setSelectedLayerIndex(null);
                }
              }}
              disabled={selectedLayerIndex === null}
              style={{ marginLeft: 10 }}
            >
              🗑️ 선택된 클립 삭제
            </button>
          </div>
          <Timeline
            mediaFiles={layers}
            onRemove={handleRemove}
            playhead={playhead}
            onPlayheadChange={handlePlayheadChange}
            selectedLayerIndex={selectedLayerIndex}
            onSelectLayer={setSelectedLayerIndex}
            onChangeImage={(idx, newSrc) => {
              setLayers((layers) =>
                layers.map((layer, i) =>
                  i === idx ? { ...layer, src: newSrc } : layer
                )
              );
            }}
          />
        </div>
      </div>
      <div className="side-panel">
        <PropertyBox
          layer={selectedLayer}
          onChange={(updatedLayer) => {
            setLayers((layers) =>
              layers.map((layer, i) =>
                i === selectedLayerIndex ? updatedLayer : layer
              )
            );
          }}
        />
      </div>
      {/* 오디오 태그 (숨김) */}
      <audio ref={audioRef} src="/files/music/DRAMA.mp3" preload="auto" />
    </div>
  );
}

export default VideoEditor;
