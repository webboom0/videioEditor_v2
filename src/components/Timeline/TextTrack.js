import React from "react";

function TextTrack({ mediaFiles, onRemove }) {
  return (
    <div className="text-track">
      {mediaFiles.map((file, index) => (
        <div key={index} className="track-item">
          <span>{file.name}</span>
          <button onClick={() => onRemove(index)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

export default TextTrack;
