import React, { useState, useRef, useEffect } from "react";

import Timeline from "./Timeline";

import EffectsPanel from "./EffectsPanel";

import PreviewWindow from "./PreviewWindow";

import CanvasPreview from "./CanvasPreview";

import PropertyBox from "./PropertyBox";

import CanvasToolbar from "./CanvasToolbar";
import CanvasMiniMap from "./CanvasMiniMap";

// import layersData from "../data/layers.json"; // 또는 fetch로 불러와도 됨

const TIMELINE_DURATION = 180; // 3분(초)

const effects = [
  { name: "Template", icon: "fa fa-cubes" },
  // { name: "Blur", icon: "fa fa-adjust" },
  // { name: "Fade", icon: "fa fa-adjust" },
  // 등등 필요한 이펙트 추가
];

function VideoEditor() {
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

  const mediaLibraryRef = useRef(null);
  
  // Canvas 컨테이너 ref 추가
  const canvasContainerRef = useRef(null);

  // 화질, 줌, 뷰포트 상태 추가
  const [quality, setQuality] = useState(0.4); // 0.2, 0.4, 0.8
  const [zoom, setZoom] = useState(1); // 1 = 100%

  useEffect(() => {
    if (!showTemplates) return;

    function handleClickOutside(e) {
      if (
        mediaLibraryRef.current &&
        !mediaLibraryRef.current.contains(e.target)
      ) {
        setShowTemplates(false);
        setSelectedEffect(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showTemplates]);

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
      const startTime = Date.now() - playhead * 1000; // 밀리초 단위로 변환

      const tick = () => {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;

        if (elapsedSeconds >= TIMELINE_DURATION) {
          setIsPlaying(false);
          setPlayhead(TIMELINE_DURATION);
          return;
        }

        setPlayhead(elapsedSeconds);
        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animationRef.current);
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, playhead]);

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

  // 스페이스바로 재생/일시정지 토글
  useEffect(() => {
    const handleKeyDown = (e) => {
      // input, textarea, select 등에서는 무시
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectEffect = async (effect) => {
    // 이미 선택된 이펙트를 다시 클릭하면 해제
    if (selectedEffect && selectedEffect.name === effect.name) {
      setSelectedEffect(null);
    } else {
      setSelectedEffect(effect);

      // 프레임 시퀀스 이펙트 선택 시 자동으로 타임라인에 추가
      if (effect.name === "Frame Sequence") {
        // 프레임 시퀀스 이펙트 인스턴스 생성
        const { frameSequenceEffect } = await import(
          "../effects/frameSequenceEffect.js"
        );

        // 프레임 개수 확인
        await frameSequenceEffect.preloadFrames();
        const frameCount = frameSequenceEffect.maxFrameCount;
        const duration = frameCount / 30; // 30fps 기준

        const frameSequenceLayer = {
          type: "effect",
          effectType: "frameSequence",
          name: "프레임 시퀀스",
          start: playhead,
          duration: duration,
          maxFrameCount: frameCount,
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          align: "center",
          verticalAlign: "middle",
          scaleMode: "fit",
          animation: [{ time: 0, x: 0, y: 0, scale: 1, opacity: 1 }],
        };

        setLayers((prev) => [...prev, frameSequenceLayer]);
        setSelectedLayerIndex(layers.length); // 새로 추가된 레이어 선택
      }
    }
  };

  const handleRemove = (index) => {
    setLayers((prevLayers) => prevLayers.filter((_, i) => i !== index));
  };

  // 키프레임 추가 핸들러
  const handleKeyframeAdd = (layerIndex, time) => {
    setLayers((prevLayers) => {
      const layer = prevLayers[layerIndex];
      if (!layer) return prevLayers;

      // 현재 레이어의 상태를 기반으로 새 키프레임 생성
      const newKeyframe = {
        time: time,
        x: layer.x || 0,
        y: layer.y || 0,
        scale: layer.scale || 1,
        opacity: layer.opacity || 1,
      };

      // 기존 애니메이션 배열이 없으면 생성
      const animation = layer.animation || [];
      
      // 시간 순서대로 정렬하여 삽입
      const newAnimation = [...animation, newKeyframe].sort((a, b) => a.time - b.time);

      return prevLayers.map((l, i) => 
        i === layerIndex 
          ? { ...l, animation: newAnimation }
          : l
      );
    });
  };

  // 키프레임 삭제 핸들러
  const handleKeyframeRemove = (layerIndex, time) => {
    setLayers((prevLayers) => {
      const layer = prevLayers[layerIndex];
      if (!layer || !layer.animation) return prevLayers;

      const newAnimation = layer.animation.filter(kf => 
        Math.abs(kf.time - time) > 0.1
      );

      return prevLayers.map((l, i) => 
        i === layerIndex 
          ? { ...l, animation: newAnimation }
          : l
      );
    });
  };

  // 키프레임 업데이트 핸들러
  const handleKeyframeUpdate = (layerIndex, keyframeIndex, updatedKeyframe) => {
    setLayers((prevLayers) => {
      const layer = prevLayers[layerIndex];
      if (!layer || !layer.animation) return prevLayers;

      const newAnimation = [...layer.animation];
      newAnimation[keyframeIndex] = updatedKeyframe;
      
      // 시간 순서대로 정렬
      newAnimation.sort((a, b) => a.time - b.time);

      return prevLayers.map((l, i) => 
        i === layerIndex 
          ? { ...l, animation: newAnimation }
          : l
      );
    });

    // 실시간 미리보기를 위해 강제 리렌더링
    // CanvasPreview가 자동으로 업데이트됨
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

  // 템플릿 내보내기 함수 추가
  const handleExportTemplate = () => {
    if (layers.length === 0) {
      alert("저장할 레이어가 없습니다.");
      return;
    }

    // 현재 layers 상태를 템플릿 JSON으로 변환
    const templateData = layers.map(layer => {
      // 불필요한 속성 제거 (예: globalIndex 등)
      const { globalIndex, ...cleanLayer } = layer;
      return cleanLayer;
    });

    // JSON 파일로 다운로드
    const blob = new Blob([JSON.stringify(templateData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    setTemplateFiles(["DRAMA", "LOVE", "WEDDING_01"]);
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

  // 미니맵에서 스크롤 연동 함수
  function handleMiniMapMove(newScroll) {
    if (!canvasContainerRef.current) return;
    console.log('handleMiniMapMove', newScroll);
    canvasContainerRef.current.scrollLeft = newScroll.left;
    canvasContainerRef.current.scrollTop = newScroll.top;
  }

  // 드래그 앤 드롭 템플릿 불러오기
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.name.endsWith('.json'));
    
    if (jsonFile) {
      try {
        const text = await jsonFile.text();
        const data = JSON.parse(text);
        
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
        
        alert(`템플릿 "${jsonFile.name}"을 성공적으로 불러왔습니다!`);
      } catch (error) {
        alert(`템플릿 파일을 불러오는 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      alert('JSON 파일을 드래그해주세요.');
    }
  };

  // 파일 업로드 핸들러 (MediaLibrary 대체)
  const handleFileUpload = (files) => {
    const newLayers = [];
    
    files.forEach((file, index) => {
      const fileType = file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 
                      file.type.startsWith('audio/') ? 'audio' : 'unknown';
      
      if (fileType !== 'unknown') {
        const fileUrl = URL.createObjectURL(file);
        const newLayer = {
          type: fileType,
          src: fileUrl,
          name: file.name,
          start: playhead,
          duration: fileType === 'audio' ? 180 : 10, // 오디오는 3분, 나머지는 10초
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          align: 'center',
          verticalAlign: 'middle',
          animation: [
            { time: 0, x: 0, y: 0, scale: 1, opacity: 1 }
          ]
        };
        
        newLayers.push(newLayer);
      }
    });
    
    if (newLayers.length > 0) {
      setLayers(prev => [...prev, ...newLayers]);
    }
  };

  return (
    <div 
      className="video-editor"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <EffectsPanel
        effects={effects}
        onSelectEffect={handleSelectEffect}
        onTemplateButtonClick={handleTemplateButtonClick}
        selectedEffect={selectedEffect}
      />

      <div className="editor-container">
        <div className="editor-media-container" ref={canvasContainerRef}>
          {/* 툴바: 오른쪽 상단 */}
          <CanvasToolbar
            quality={quality}
            onQualityChange={setQuality}
            zoom={zoom}
            onZoomChange={setZoom}
          />
          <div
            className={`media-library${showTemplates ? " active" : ""}`}
            ref={mediaLibraryRef}
          >
            {/* 파일 업로드 버튼 */}
            <div style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                style={{
                  display: 'block',
                  padding: '8px 12px',
                  background: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '12px'
                }}
              >
                파일 업로드
              </label>
            </div>

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

          {/* 캔버스 프리뷰 */}
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
            containerRef={canvasContainerRef}
            quality={quality}
            zoom={zoom}
          />
          {/* 미니맵: 오른쪽 하단 */}
          <CanvasMiniMap
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            zoom={zoom}
            containerRef={canvasContainerRef}
            onMove={handleMiniMapMove}
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

            <button onClick={handleExportTemplate}>
              템플릿 저장
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
            onKeyframeAdd={handleKeyframeAdd}
            onKeyframeRemove={handleKeyframeRemove}
            onKeyframeUpdate={handleKeyframeUpdate}
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
