import React from "react";

export default function EffectsPanel({
  effects,
  onSelectEffect,
  onTemplateButtonClick,
  selectedEffect,
}) {
  return (
    <div className="effects-panel">
      {/* 프레임 시퀀스 이펙트 버튼 */}
      <button
        className={
          selectedEffect && selectedEffect.name === "Frame Sequence"
            ? "active"
            : ""
        }
        onClick={() =>
          onSelectEffect({ name: "Frame Sequence", icon: "fa fa-film" })
        }
        title="프레임 시퀀스"
      >
        <i className="fa fa-film"></i>
        <span>프레임</span>
      </button>

      {effects.map((effect) => (
        <button
          key={effect.name}
          className={
            selectedEffect && selectedEffect.name === effect.name
              ? "active"
              : ""
          }
          onClick={() => {
            if (effect.name === "Template") {
              onTemplateButtonClick();
            } else {
              onSelectEffect(effect);
            }
          }}
        >
          <i className={effect.icon}></i>
          <span>{effect.name}</span>
        </button>
      ))}
    </div>
  );
}
