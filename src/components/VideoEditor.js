import React, { useState, useRef, useEffect } from "react";

import Timeline from "./Timeline";

import MediaLibrary from "./MediaLibrary";

import EffectsPanel from "./EffectsPanel";

import PreviewWindow from "./PreviewWindow";

import CanvasPreview from "./CanvasPreview";

import PropertyBox from "./PropertyBox";

// import layersData from "../data/layers.json"; // 또는 fetch로 불러와도 됨

const TIMELINE_DURATION = 180; // 3분(초)

const effects = [
  { name: "Template", icon: "fa fa-cubes" },
  // { name: "Blur", icon: "fa fa-adjust" },
  // { name: "Fade", icon: "fa fa-adjust" },
  // 등등 필요한 이펙트 추가
];

function VideoEditor() {
  const [mediaFiles, setMediaFiles] = useState([]);

  const [layers, setLayers] = useState([]);

  const [playhead, setPlayhead] = useState(0);

  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const animationRef = useRef();

  const audioRef = useRef(null);

  const [isExporting, setIsExporting] = useState(false);

  const [audioSrc, setAudioSrc] = useState("");

  const [showTemplates, setShowTemplates] = useState(false);

  const [templateFiles, setTemplateFiles] = useState([]);

  const [selectedEffect, setSelectedEffect] = useState(null);

  // 최초 마운트 시 localStorage에서 불러오거나, 없으면 json에서 불러오기

  useEffect(() => {
    const saved = localStorage.getItem("layers");

    if (saved) {
      // setLayers(JSON.parse(saved));
    }
  }, []);

  // layers가 바뀔 때마다 localStorage에 저장

  useEffect(() => {
    if (layers.length > 0) {
      localStorage.setItem("layers", JSON.stringify(layers));
    }
  }, [layers]);

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
    // 이미 선택된 이펙트를 다시 클릭하면 해제
    if (selectedEffect && selectedEffect.name === effect.name) {
      setSelectedEffect(null);
    } else {
      setSelectedEffect(effect);
    }
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

  // Export 함수 추가

  const handleExport = () => {
    const canvas = document.querySelector("canvas"); // 또는 canvasRef.current 사용

    if (!canvas) {
      alert("캔버스를 찾을 수 없습니다.");

      return;
    }

    setIsExporting(true); // 녹화 시작 시 표시

    const stream = canvas.captureStream(30); // 30fps

    const recorder = new window.MediaRecorder(stream, {
      mimeType: "video/webm",
    });

    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "export.webm";

      a.click();

      URL.revokeObjectURL(url);

      setIsExporting(false); // 녹화 끝나면 숨김
    };

    recorder.start();

    // 예시: 10초간 녹화 후 자동 정지 (원하는 길이로 수정)

    setTimeout(() => {
      recorder.stop();
    }, 10000);
  };

  const handleApplyTemplate = (template) => {
    // 타임라인에 template을 적용하는 로직 작성

    // 예: setTimelineLayers(template.layers);

    console.log("템플릿 적용:", template);
  };

  // 템플릿 파일 선택 시 JSON 불러와서 layers에 적용

  const handleSelectTemplateFile = async (file) => {
    try {
      const res = await fetch(`/template/${file}.json`);

      if (!res.ok) throw new Error("템플릿 파일을 불러올 수 없습니다.");

      const data = await res.json();

      let layersArr = [];

      if (Array.isArray(data)) {
        layersArr = data;
      } else if (Array.isArray(data.layers)) {
        layersArr = data.layers;
      } else {
        layersArr = [data];
      }

      setLayers(layersArr);

      // 오디오 트랙 찾기

      const audioLayer = layersArr.find((layer) => layer.type === "audio");

      setAudioSrc(audioLayer ? audioLayer.src : "");

      setSelectedLayerIndex(null);

      setPlayhead(0);

      setIsPlaying(false);
    } catch (e) {
      alert("템플릿 파일을 불러오지 못했습니다.");
    }
  };

  // 템플릿 버튼 클릭 시

  const handleTemplateButtonClick = () => {
    setShowTemplates(true);
    setTemplateFiles(["DRAMA", "LOVE"]);
  };

  // 템플릿 선택 시

  const handleTemplateSelect = (templateName) => {
    // ... 템플릿 적용 코드 ...
    setSelectedEffect(null);
  };

  // 템플릿 파일 클릭 시

  const handleTemplateFileClick = (file) => {
    handleSelectTemplateFile(file);
  };

  // 닫기 버튼

  const handleTemplateModalClose = () => {
    setShowTemplates(false);
    setSelectedEffect(null);
  };

  const selectedLayer =
    selectedLayerIndex !== null ? layers[selectedLayerIndex] : null;

  const canvasWidth = 1280;

  const canvasHeight = Math.round((canvasWidth * 9) / 16);

  return (
    <div className="video-editor">
      <EffectsPanel
        effects={effects}
        onSelectEffect={handleSelectEffect}
        onTemplateButtonClick={handleTemplateButtonClick}
        selectedEffect={selectedEffect}
      />

      <div className="editor-container">
        <div className="editor-media-container">
          <div className={`media-library${showTemplates ? " active" : ""}`}>
            <MediaLibrary onUpload={setMediaFiles} />

            {showTemplates && (
              <div className="template-list-modal">
                <h4>템플릿 파일 선택</h4>

                <ul>
                  {templateFiles.map((file) => (
                    <li key={file}>
                      <button onClick={() => handleTemplateFileClick(file)}>
                        <img
                          src={`/template/thumb/${file}.png`}
                          alt={`${file} 썸네일`}
                        />

                        {file}
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  className="close-btn"
                  onClick={handleTemplateModalClose}
                >
                  <span className="blind">닫기</span>
                </button>
              </div>
            )}
          </div>

          {/* <PreviewWindow mediaFiles={mediaFiles} /> */}

          <CanvasPreview
            layers={layers}
            currentTime={playhead}
            width={canvasWidth}
            height={canvasHeight}
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
            <button
              onClick={() => {
                if (!isPlaying && showTemplates) {
                  setShowTemplates(false); // 재생 시작 시 템플릿 모달 닫기
                }
                setIsPlaying((p) => !p);
              }}
            >
              {isPlaying ? (
                <i className="fa fa-pause"></i>
              ) : (
                <i className="fa fa-play"></i>
              )}
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
              <i className="fa fa-trash"></i>
            </button>

            <button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "녹화 중..." : "Export"}
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

      {/* 오디오 태그 (audioSrc가 있을 때만) */}

      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" />}

      {/* 녹화 중이면 안내 메시지 또는 로딩바 표시 */}

      {isExporting && (
        <div
          style={{
            position: "fixed",

            top: 0,

            left: 0,

            right: 0,

            bottom: 0,

            background: "rgba(0,0,0,0.3)",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",

              padding: 40,

              borderRadius: 12,

              fontSize: 24,

              fontWeight: "bold",

              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            🎬 영상 녹화 중입니다...
            <br />
            잠시만 기다려주세요!
            <div
              style={{
                marginTop: 20,

                width: 200,

                height: 10,

                background: "#eee",

                borderRadius: 5,

                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",

                  height: "100%",

                  background:
                    "linear-gradient(90deg, #4f8cff 40%, #a0c8ff 100%)",

                  animation: "progressBar 10s linear",
                }}
              />
            </div>
          </div>

          {/* 진행바 애니메이션용 스타일 */}

          <style>
            {`

              @keyframes progressBar {

                from { width: 0%; }

                to { width: 100%; }

              }

            `}
          </style>
        </div>
      )}
    </div>
  );
}

export default VideoEditor;
