import React from "react";
import VideoTrack from "./VideoTrack";
import AudioTrack from "./AudioTrack";
import TextTrack from "./TextTrack";
import "./Timeline.css";

function Timeline({ mediaFiles, onRemove }) {
  return (
    <div className="timeline">
      <div className="timeline-header">
        <span>Video Track</span>
        <span>Audio Track</span>
        <span>Text Track</span>
      </div>
      <VideoTrack mediaFiles={mediaFiles.video} onRemove={onRemove} />
      <AudioTrack mediaFiles={mediaFiles.audio} onRemove={onRemove} />
      <TextTrack mediaFiles={mediaFiles.text} onRemove={onRemove} />
    </div>
  );
}

export default Timeline;
