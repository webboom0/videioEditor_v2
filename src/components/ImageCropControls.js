import React, { useState, useEffect } from 'react';
import { createCropPreview } from '../utils/imageCropUtils';

/**
 * 이미지 크롭 제어 컴포넌트
 */
function ImageCropControls({ 
  layer, 
  onUpdateLayer, 
  canvasWidth = 1280, 
  canvasHeight = 720 
}) {
  const [cropOptions, setCropOptions] = useState({
    scaleMode: layer.scaleMode || 'fit',
    cropMode: layer.cropMode || 'center',
    targetSize: layer.targetSize || { width: canvasWidth, height: canvasHeight },
    cropOffset: layer.cropOffset || { x: 0, y: 0 },
    cropZoom: layer.cropZoom || 1.0
  });

  const [previewCanvas, setPreviewCanvas] = useState(null);

  // 크롭 옵션이 변경될 때마다 미리보기 업데이트
  useEffect(() => {
    if (layer.src) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const preview = createCropPreview(img, cropOptions);
        setPreviewCanvas(preview);
      };
      img.src = layer.src;
    }
  }, [cropOptions, layer.src]);

  // 크롭 옵션 변경 핸들러
  const handleCropOptionChange = (key, value) => {
    const newOptions = { ...cropOptions, [key]: value };
    setCropOptions(newOptions);
    
    // 레이어 업데이트
    const updatedLayer = {
      ...layer,
      ...newOptions
    };
    onUpdateLayer(updatedLayer);
  };

  // 오프셋 변경 핸들러
  const handleOffsetChange = (axis, value) => {
    const newOffset = { ...cropOptions.cropOffset, [axis]: parseFloat(value) };
    handleCropOptionChange('cropOffset', newOffset);
  };

  // 타겟 크기 변경 핸들러
  const handleTargetSizeChange = (axis, value) => {
    const newSize = { ...cropOptions.targetSize, [axis]: parseInt(value) };
    handleCropOptionChange('targetSize', newSize);
  };

  return (
    <div className="image-crop-controls">
      <h3>이미지 크롭 설정</h3>
      
      {/* 크롭 모드 선택 */}
      <div className="control-group">
        <label>크롭 모드:</label>
        <select 
          value={cropOptions.scaleMode} 
          onChange={(e) => handleCropOptionChange('scaleMode', e.target.value)}
        >
          <option value="fit">Fit (레터박스 허용)</option>
          <option value="cover">Cover (크롭)</option>
          <option value="crop">Crop (고급 크롭)</option>
        </select>
      </div>

      {/* 크롭 위치 선택 */}
      {cropOptions.scaleMode === 'crop' && (
        <div className="control-group">
          <label>크롭 위치:</label>
          <select 
            value={cropOptions.cropMode} 
            onChange={(e) => handleCropOptionChange('cropMode', e.target.value)}
          >
            <option value="center">중앙</option>
            <option value="top-left">좌상단</option>
            <option value="top-right">우상단</option>
            <option value="bottom-left">좌하단</option>
            <option value="bottom-right">우하단</option>
            <option value="smart">스마트</option>
          </select>
        </div>
      )}

      {/* 타겟 크기 설정 */}
      <div className="control-group">
        <label>타겟 크기:</label>
        <div className="size-inputs">
          <input
            type="number"
            value={cropOptions.targetSize.width}
            onChange={(e) => handleTargetSizeChange('width', e.target.value)}
            placeholder="너비"
          />
          <span>×</span>
          <input
            type="number"
            value={cropOptions.targetSize.height}
            onChange={(e) => handleTargetSizeChange('height', e.target.value)}
            placeholder="높이"
          />
        </div>
      </div>

      {/* 크롭 오프셋 */}
      {cropOptions.scaleMode === 'crop' && (
        <div className="control-group">
          <label>크롭 오프셋:</label>
          <div className="offset-inputs">
            <div>
              <label>X: {cropOptions.cropOffset.x.toFixed(2)}</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={cropOptions.cropOffset.x}
                onChange={(e) => handleOffsetChange('x', e.target.value)}
              />
            </div>
            <div>
              <label>Y: {cropOptions.cropOffset.y.toFixed(2)}</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={cropOptions.cropOffset.y}
                onChange={(e) => handleOffsetChange('y', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 크롭 줌 */}
      {cropOptions.scaleMode === 'crop' && (
        <div className="control-group">
          <label>크롭 줌: {cropOptions.cropZoom.toFixed(2)}</label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={cropOptions.cropZoom}
            onChange={(e) => handleCropOptionChange('cropZoom', parseFloat(e.target.value))}
          />
        </div>
      )}

      {/* 미리보기 */}
      {previewCanvas && (
        <div className="preview-section">
          <label>크롭 미리보기:</label>
          <div className="preview-container">
            <canvas
              ref={(canvas) => {
                if (canvas && previewCanvas) {
                  const ctx = canvas.getContext('2d');
                  canvas.width = previewCanvas.width;
                  canvas.height = previewCanvas.height;
                  ctx.drawImage(previewCanvas, 0, 0);
                }
              }}
              style={{
                width: '200px',
                height: 'auto',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          <div className="crop-info">
            <p><strong>크롭된 이미지 크기:</strong> {cropOptions.targetSize.width} × {cropOptions.targetSize.height}px</p>
            <p><strong>중심점 기준:</strong> 이미지의 중심점이 위치 좌표(x, y)의 기준점이 됩니다.</p>
            <p><strong>빨간 점:</strong> Canvas에서 이미지의 중심점을 표시합니다.</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .image-crop-controls {
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          margin: 8px 0;
        }

        .control-group {
          margin-bottom: 16px;
        }

        .control-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #333;
        }

        .control-group select,
        .control-group input[type="number"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .size-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .size-inputs input {
          flex: 1;
        }

        .size-inputs span {
          font-weight: bold;
          color: #666;
        }

        .offset-inputs {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .offset-inputs > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .offset-inputs label {
          min-width: 60px;
          margin-bottom: 0;
        }

        .offset-inputs input[type="range"] {
          flex: 1;
        }

        .preview-section {
          margin-top: 16px;
        }

        .preview-container {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }

        .crop-info {
          margin-top: 8px;
          padding: 8px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .crop-info p {
          margin: 4px 0;
        }

        .crop-info strong {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default ImageCropControls; 