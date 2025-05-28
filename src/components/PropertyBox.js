// src/components/PropertyBox.js
import React from "react";

export default function PropertyBox({ layer, onChange }) {
  if (!layer) return null;

  // 공통 속성
  const handleChange = (key, value) => {
    onChange({ ...layer, [key]: value });
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
      <div>
        <label>
          시작 시간:
          <input
            type="number"
            value={layer.start}
            onChange={(e) => handleChange("start", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          지속 시간:
          <input
            type="number"
            value={layer.duration}
            onChange={(e) => handleChange("duration", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 X:
          <input
            type="number"
            value={layer.x ?? ""}
            onChange={(e) => handleChange("x", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 Y:
          <input
            type="number"
            value={layer.y ?? ""}
            onChange={(e) => handleChange("y", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 Width:
          <input
            type="number"
            value={layer.width ?? ""}
            onChange={(e) => handleChange("width", Number(e.target.value))}
          />
        </label>
      </div>
      <div>
        <label>
          시작 Height:
          <input
            type="number"
            value={layer.height ?? ""}
            onChange={(e) => handleChange("height", Number(e.target.value))}
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
                value={layer.text}
                onChange={(e) => handleChange("text", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              색상:
              <input
                type="color"
                value={layer.color || "#ffffff"}
                onChange={(e) => handleChange("color", e.target.value)}
              />
            </label>
          </div>
          {/* 필요시 폰트, 크기 등 추가 */}
        </>
      )}
      {(layer.type === "image" || layer.type === "text") && (
        <>
          <div>
            <label>
              이미지 URL:
              <input
                type="text"
                value={layer.src}
                onChange={(e) => handleChange("src", e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              시작 Scale:
              <input
                type="number"
                step="0.01"
                value={layer.scale ?? 1}
                onChange={(e) => handleChange("scale", Number(e.target.value))}
              />
            </label>
          </div>
          {/* 이미지 변경 버튼과 파일 업로드 input */}
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
                        max={layer.duration}
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
                      time: Math.min((last.time ?? 0) + 1, layer.duration),
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
        </>
      )}
      {layer.type === "effect" && (
        <>
          <div>
            <label>이펙트 타입: {layer.effectType}</label>
          </div>
          {/* effectType별로 추가 속성 분기 가능 */}
        </>
      )}
      {/* 필요시 더 많은 타입별 속성 추가 */}
    </div>
  );
}
