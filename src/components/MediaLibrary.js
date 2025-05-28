import React from "react";

function MediaLibrary({ onUpload }) {
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    onUpload(files);
  };

  return (
    <div className="media-library">
      <input type="file" multiple onChange={handleFileChange} />
    </div>
  );
}

export default MediaLibrary;
