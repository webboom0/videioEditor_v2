// ... 기존 코드 ...
import React, { useRef } from "react";

export default function AnimationControls({ canvasRef, ...props }) {
  // ... 기존 코드 ...

  const handleExport = async () => {
    if (!canvasRef.current) return;
    const stream = canvasRef.current.captureStream(30); // 30fps
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
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
    };

    recorder.start();

    // 애니메이션 길이만큼 녹화 후 자동 정지 (예: 10초)
    setTimeout(() => {
      recorder.stop();
    }, 10000); // 10초 (원하는 길이로 수정)
  };

  return (
    <div className="animation-controls">
      {/* ... 기존 컨트롤 ... */}
      <button onClick={handleExport}>Export</button>
    </div>
  );
}
