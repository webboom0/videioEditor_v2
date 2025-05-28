import React from "react";

function EffectsPanel({ onSelectEffect }) {
  const effects = [
    { name: "Template", icon: "fa fa-edit" },
    { name: "Media", icon: "fa fa-edit" },
    { name: "Text", icon: "fa fa-edit" },
    { name: "Image", icon: "fa fa-edit" },
    { name: "Effect", icon: "fa fa-edit" },
  ];

  return (
    <div className="effects-panel">
      {effects.map((effect, index) => (
        <button key={index.name} onClick={() => onSelectEffect(effect)}>
          <i className={effect.icon}></i>
          <span>{effect.name}</span>
        </button>
      ))}
    </div>
  );
}

export default EffectsPanel;
