import React from "react";

function EffectsPanel({ onSelectEffect, onTemplateButtonClick }) {
  const effects = [{ name: "Template", icon: "fa fa-cubes" }];

  return (
    <div className="effects-panel">
      {effects.map((effect) => (
        <button
          key={effect.name}
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

export default EffectsPanel;
