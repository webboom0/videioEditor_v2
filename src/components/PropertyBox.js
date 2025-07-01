// src/components/PropertyBox.js
import React from "react";
import ImageCropControls from "./ImageCropControls";

export default function PropertyBox({ layer, onChange, selectedKeyframe, onKeyframeUpdate }) {
  if (!layer) return null;
  const maxFrame = 515;
  
  // 선택된 키프레임 정보
  const selectedKeyframeData = selectedKeyframe && 
                              selectedKeyframe.layerIndex !== null && 
                              selectedKeyframe.keyframeIndex !== null &&
                              layer.animation && 
                              layer.animation[selectedKeyframe.keyframeIndex] 
                              ? layer.animation[selectedKeyframe.keyframeIndex] 
                              : null;

  // 값 가져오기 함수
  const getValue = (key) => {
    if (selectedKeyframe && Array.isArray(layer.animation)) {
      const v = layer.animation[selectedKeyframe.keyframeIndex]?.[key];
      if ((key === 'x' || key === 'y') && (v === undefined || v === null)) return 100;
      return v ?? '';
    }
    if ((key === 'x' || key === 'y') && (layer[key] === undefined || layer[key] === null)) return 100;
    return layer[key] ?? '';
  };

  // 공통 속성
  const handleChange = (key, value) => {
    if (selectedKeyframe && onKeyframeUpdate && Array.isArray(layer.animation)) {
      // 키프레임 값 변경
      const updatedKeyframe = {
        ...layer.animation[selectedKeyframe.keyframeIndex],
        [key]: value
      };
      onKeyframeUpdate(selectedKeyframe.layerIndex, selectedKeyframe.keyframeIndex, updatedKeyframe);
    } else {
      // 레이어 전체 값 변경
      onChange({ ...layer, [key]: value });
    }
  };

  // 애니메이션 속성 변경 핸들러
  const handleAnimChange = (key, value) => {
    onChange({
      ...layer,
      animation: {
        ...layer.animation,
        [key]: value,
      },
    });
  };

  return (
    <div className="property-box">
      <h4>속성 편집</h4>
      
      {/* 선택된 키프레임 정보 표시 */}
      {selectedKeyframeData && (
        <div style={{ 
          background: '#f0f8ff', 
          border: '2px solid #007bff', 
          borderRadius: '8px', 
          padding: '10px', 
          marginBottom: '15px' 
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
            선택된 키프레임 {selectedKeyframe.keyframeIndex + 1}
          </h5>
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            <div>
              <strong>시간:</strong> {selectedKeyframeData.time.toFixed(1)}s
            </div>
            <div>
              <strong>X:</strong> {selectedKeyframeData.x ?? 0}
            </div>
            <div>
              <strong>Y:</strong> {selectedKeyframeData.y ?? 0}
            </div>
            <div>
              <strong>크기:</strong> {selectedKeyframeData.scale ?? 1}
            </div>
            <div>
              <strong>투명도:</strong> {selectedKeyframeData.opacity ?? 1}
            </div>
            <div>
              <strong>애니메이션:</strong> {selectedKeyframeData.easing || 'linear'}
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label>
          시작 시간:
          <input
            type="number"
            value={getValue("start")}
            onChange={(e) => handleChange("start", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          지속 시간:
          <input
            type="number"
            value={getValue("duration")}
            onChange={(e) => handleChange("duration", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 X:
          <input
            type="number"
            value={getValue("x")}
            onChange={(e) => handleChange("x", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 Y:
          <input
            type="number"
            value={getValue("y")}
            onChange={(e) => handleChange("y", Number(e.target.value))}
          />
        </label>
      </div>
      {/* 타입별 속성 분기 */}
      {layer.type === "text" && (
        <>
          <div>
            <label>
              텍스트:
              <input
                type="text"
                value={getValue("text")}
                onChange={(e) => handleChange("text", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              색상:
              <input
                type="color"
                value={getValue("color") || "#ffffff"}
                onChange={(e) => handleChange("color", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              폰트 크기:
              <input
                type="number"
                min={8}
                max={200}
                value={getValue("fontSize") || 30}
                onChange={(e) =>
                  handleChange("fontSize", Number(e.target.value))
                }
                style={{ width: 60 }}
              />{" "}
              px
            </label>
          </div>
          <div>
            <label>
              글꼴:
              <select
                value={getValue("fontFamily") || "Arial"}
                onChange={(e) => handleChange("fontFamily", e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="궁서">궁서</option>
              </select>
            </label>
          </div>
        </>
      )}
      {/* 타입별 속성 분기 */}
      {layer.type === "image" && (
        <>
          <div>
            <label>
              시작 Scale:
              <input
                type="number"
                step="0.01"
                value={getValue("scale") ?? 1}
                onChange={(e) => handleChange("scale", Number(e.target.value))}
              />
            </label>
          </div>
          {/* 이미지 변경 버튼과 파일 업로드 input */}
          <div>
            <label>
              이미지 URL:
              <input
                type="text"
                value={getValue("src")}
                onChange={(e) => handleChange("src", e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById("img-upload-propertybox").click();
            }}
          >
            이미지 변경
          </button>
          <input
            id="img-upload-propertybox"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (ev) => {
                  handleChange("src", ev.target.result);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          
          {/* 이미지 크롭 컨트롤 */}
          <ImageCropControls 
            layer={layer} 
            onUpdateLayer={onChange}
            canvasWidth={1280}
            canvasHeight={720}
          />
        </>
      )}
      {(layer.type === "image" || layer.type === "text") && (
        <>
          <div>
            <label>애니메이션 키프레임:</label>
            {Array.isArray(layer.animation) && layer.animation.length > 0 ? (
              <div className="keyframes-list">
                {layer.animation.map((kf, idx) => (
                  <div key={idx} className="keyframe-row">
                    <span>
                      time:
                      <input
                        type="number"
                        min={0}
                        max={getValue("duration")}
                        value={kf.time}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            time: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      x:
                      <input
                        type="number"
                        value={kf.x}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            x: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      y:
                      <input
                        type="number"
                        value={kf.y}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            y: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      scale:
                      <input
                        type="number"
                        step="0.01"
                        value={kf.scale}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            scale: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <span>
                      opacity:
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={kf.opacity ?? 1}
                        onChange={(e) => {
                          const newAnim = [...layer.animation];
                          newAnim[idx] = {
                            ...newAnim[idx],
                            opacity: Number(e.target.value),
                          };
                          handleChange("animation", newAnim);
                        }}
                        style={{ width: 50 }}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAnim = layer.animation.filter(
                          (_, i) => i !== idx
                        );
                        handleChange("animation", newAnim);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const last = layer.animation[
                      layer.animation.length - 1
                    ] || { time: 0, x: 0, y: 0, scale: 1 };
                    const newKF = {
                      ...last,
                      time: Math.min((last.time ?? 0) + 1, getValue("duration")),
                    };
                    handleChange("animation", [...layer.animation, newKF]);
                  }}
                >
                  키프레임 추가
                </button>
              </div>
            ) : (
              <div>
                <span>애니메이션 없음</span>
                <button
                  type="button"
                  onClick={() =>
                    handleChange("animation", [
                      { time: 0, x: 0, y: 0, scale: 1 },
                    ])
                  }
                >
                  첫 키프레임 추가
                </button>
              </div>
            )}
          </div>
          <div>
            <label>
              가로 정렬:
              <select
                value={getValue("align") || "left"}
                onChange={(e) => handleChange("align", e.target.value)}
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              세로 정렬:
              <select
                value={getValue("verticalAlign") || "top"}
                onChange={(e) => handleChange("verticalAlign", e.target.value)}
              >
                <option value="top">위</option>
                <option value="middle">중앙</option>
                <option value="bottom">아래</option>
              </select>
            </label>
          </div>
        </>
      )}
      {layer.type === "effect" && (
        <>
          <div>
            <label>이펙트 타입: {layer.effectType}</label>
          </div>

          {/* 프레임 시퀀스 전용 속성 */}
          {layer.effectType === "frameSequence" && (
            <>
              <div>
                <label>
                  FPS:
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={getValue("fps") || 30}
                    onChange={(e) =>
                      handleChange("fps", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  시작 프레임:
                  <input
                    type="number"
                    min={1}
                    max={maxFrame}
                    value={getValue("startFrame") || 1}
                    onChange={(e) =>
                      handleChange("startFrame", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  끝 프레임:
                  <input
                    type="number"
                    min={1}
                    max={maxFrame}
                    value={getValue("endFrame") || maxFrame}
                    onChange={(e) =>
                      handleChange("endFrame", Number(e.target.value))
                    }
                    style={{ width: 60 }}
                  />
                </label>
              </div>
              <div>
                <label>
                  반복:
                  <select
                    value={getValue("loop") || "once"}
                    onChange={(e) => handleChange("loop", e.target.value)}
                  >
                    <option value="once">한 번</option>
                    <option value="loop">반복</option>
                    <option value="pingpong">왕복</option>
                  </select>
                </label>
              </div>
              <div>
                <label>
                  스케일 모드:
                  <select
                    value={getValue("scaleMode") || "fit"}
                    onChange={(e) => handleChange("scaleMode", e.target.value)}
                  >
                    <option value="fit">맞춤</option>
                    <option value="cover">덮기</option>
                    <option value="none">원본</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {/* 다른 이펙트 타입별 속성 */}
          {layer.effectType === "hearts" && (
            <div>
              <label>
                하트 개수:
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={getValue("count") || 12}
                  onChange={(e) =>
                    handleChange("count", Number(e.target.value))
                  }
                  style={{ width: 60 }}
                />
              </label>
            </div>
          )}
        </>
      )}
      {/* 필요시 더 많은 타입별 속성 추가 */}
    </div>
  );
}
