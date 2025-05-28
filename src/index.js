import React from "react";
import { createRoot } from "react-dom/client";
import VideoEditor from "./components/VideoEditor";
import "./styles/editor.css";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (!container) {
    console.error("Could not find root element");
    return;
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <VideoEditor />
    </React.StrictMode>
  );
});
