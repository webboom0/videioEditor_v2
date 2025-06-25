import React from 'react';

function CanvasToolbar({
  quality, // 0.2, 0.4, 0.8
  onQualityChange,
  zoom, // 0.5, 1, 2, ...
  onZoomChange
}) {
  return (
    <div className="canvas-toolbar">
      <div className="toolbar-group">
        <button
          className={quality === 0.2 ? 'active' : ''}
          onClick={() => onQualityChange(0.2)}
          title="최소 화질 (20%)"
        >20%</button>
        <button
          className={quality === 0.4 ? 'active' : ''}
          onClick={() => onQualityChange(0.4)}
          title="중간 화질 (40%)"
        >40%</button>
        <button
          className={quality === 0.8 ? 'active' : ''}
          onClick={() => onQualityChange(0.8)}
          title="최대 화질 (80%)"
        >80%</button>
      </div>
      <div className="toolbar-group">
        <button onClick={() => onZoomChange(zoom / 1.25)} title="줌 아웃">-</button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(zoom * 1.25)} title="줌 인">+</button>
      </div>
      <style jsx>{`
        .canvas-toolbar {
          position: absolute;
          top: 16px;
          right: 24px;
          display: flex;
          gap: 16px;
          background: rgba(40,40,40,0.7);
          border-radius: 8px;
          padding: 8px 12px;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .toolbar-group {
          display: flex;
          gap: 4px;
        }
        .canvas-toolbar button {
          background: none;
          border: 1px solid #888;
          color: #fff;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 13px;
          cursor: pointer;
          opacity: 0.85;
          transition: background 0.2s, color 0.2s;
        }
        .canvas-toolbar button.active,
        .canvas-toolbar button:focus {
          background: #4f8cff;
          color: #fff;
          border-color: #4f8cff;
          opacity: 1;
        }
        .zoom-label {
          display: inline-block;
          min-width: 36px;
          text-align: center;
          color: #fff;
          font-weight: bold;
          font-size: 13px;
          line-height: 24px;
        }
      `}</style>
    </div>
  );
}

export default CanvasToolbar; 