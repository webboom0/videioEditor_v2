import React from "react";

export default function EffectsPanel({
  effects,
  onSelectEffect,
  onTemplateButtonClick,
  selectedEffect,
}) {
  return (
    <div className="effects-panel">
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
