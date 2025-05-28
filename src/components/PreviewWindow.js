import React from "react";

function PreviewWindow({ mediaFiles }) {
  return (
    <div className="preview-window">
      {mediaFiles.length > 0 && (
        <video controls>
          <source src={URL.createObjectURL(mediaFiles[0])} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

export default PreviewWindow;
