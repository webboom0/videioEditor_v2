/**
 * Canvas 기반 이미지 크롭 유틸리티
 * 다양한 크롭 모드를 지원하는 함수들
 */

/**
 * 이미지를 지정된 크기로 크롭하여 Canvas에 그리는 함수
 * @param {CanvasRenderingContext2D} ctx - Canvas 컨텍스트
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} options - 크롭 옵션
 * @param {string} options.scaleMode - 크롭 모드 ('crop', 'fit', 'cover')
 * @param {string} options.cropMode - 크롭 위치 ('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'smart')
 * @param {Object} options.targetSize - 목표 크기 {width, height}
 * @param {Object} options.cropOffset - 크롭 오프셋 {x, y} (-1.0 ~ 1.0)
 * @param {number} options.cropZoom - 크롭 줌 레벨 (1.0 ~ 3.0)
 * @param {number} options.x - 그리기 X 위치 (크롭된 이미지의 중심점)
 * @param {number} options.y - 그리기 Y 위치 (크롭된 이미지의 중심점)
 * @param {number} options.scale - 스케일
 * @param {number} options.opacity - 투명도
 */
export function drawCroppedImage(ctx, img, options = {}) {
  if (!img || !img.complete) return;

  const {
    scaleMode = 'crop',
    cropMode = 'center',
    targetSize = null,
    cropOffset = { x: 0, y: 0 },
    cropZoom = 1.0,
    x = 0,
    y = 0,
    scale = 1,
    opacity = 1,
    align = 'center',
    verticalAlign = 'middle'
  } = options;

  // 목표 크기가 없으면 원본 크기 사용
  const targetWidth = targetSize?.width || img.naturalWidth;
  const targetHeight = targetSize?.height || img.naturalHeight;

  // 크롭 계산
  const cropData = calculateCrop(img, {
    scaleMode,
    cropMode,
    targetWidth,
    targetHeight,
    cropOffset,
    cropZoom
  });

  // x, y는 이미 크롭된 이미지의 중심점이므로 그대로 사용
  const centerX = x;
  const centerY = y;

  // Canvas에 그리기 (중심점 기준)
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  
  // 크롭된 이미지를 중심점 기준으로 그리기
  ctx.drawImage(
    img,
    cropData.sourceX, cropData.sourceY, cropData.sourceWidth, cropData.sourceHeight,
    -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight
  );
  
  ctx.restore();
}

/**
 * 크롭 데이터를 계산하는 함수
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} options - 크롭 옵션
 * @returns {Object} 크롭 데이터
 */
export function calculateCrop(img, options) {
  const {
    scaleMode,
    cropMode,
    targetWidth,
    targetHeight,
    cropOffset,
    cropZoom
  } = options;

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // 비율 계산
  const targetRatio = targetWidth / targetHeight;
  const imgRatio = imgWidth / imgHeight;

  let sourceWidth, sourceHeight, sourceX, sourceY;

  if (scaleMode === 'fit') {
    // fit 모드: 이미지가 전체 영역에 맞도록 조정 (레터박스 가능)
    if (imgRatio > targetRatio) {
      // 이미지가 더 넓음 - 높이에 맞춤
      sourceHeight = imgHeight;
      sourceWidth = imgHeight * targetRatio;
      sourceX = (imgWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // 이미지가 더 높음 - 너비에 맞춤
      sourceWidth = imgWidth;
      sourceHeight = imgWidth / targetRatio;
      sourceX = 0;
      sourceY = (imgHeight - sourceHeight) / 2;
    }
  } else if (scaleMode === 'cover') {
    // cover 모드: 이미지가 전체 영역을 덮도록 조정 (크롭 발생)
    if (imgRatio > targetRatio) {
      // 이미지가 더 넓음 - 너비에 맞춤
      sourceWidth = imgWidth;
      sourceHeight = imgWidth / targetRatio;
      sourceX = 0;
      sourceY = (imgHeight - sourceHeight) / 2;
    } else {
      // 이미지가 더 높음 - 높이에 맞춤
      sourceHeight = imgHeight;
      sourceWidth = imgHeight * targetRatio;
      sourceX = (imgWidth - sourceWidth) / 2;
      sourceY = 0;
    }
  } else {
    // crop 모드: 기본적으로 cover와 동일하지만 추가 옵션들 적용
    if (imgRatio > targetRatio) {
      sourceWidth = imgWidth;
      sourceHeight = imgWidth / targetRatio;
      sourceX = 0;
      sourceY = (imgHeight - sourceHeight) / 2;
    } else {
      sourceHeight = imgHeight;
      sourceWidth = imgHeight * targetRatio;
      sourceX = (imgWidth - sourceWidth) / 2;
      sourceY = 0;
    }
  }

  // 크롭 모드에 따른 위치 조정
  if (cropMode !== 'center') {
    const offsetX = (imgWidth - sourceWidth) / 2;
    const offsetY = (imgHeight - sourceHeight) / 2;

    switch (cropMode) {
      case 'top-left':
        sourceX = 0;
        sourceY = 0;
        break;
      case 'top-right':
        sourceX = imgWidth - sourceWidth;
        sourceY = 0;
        break;
      case 'bottom-left':
        sourceX = 0;
        sourceY = imgHeight - sourceHeight;
        break;
      case 'bottom-right':
        sourceX = imgWidth - sourceWidth;
        sourceY = imgHeight - sourceHeight;
        break;
      case 'smart':
        // 스마트 크롭: 중앙을 기준으로 하지만 약간의 랜덤성 추가
        sourceX = Math.max(0, Math.min(imgWidth - sourceWidth, sourceX + (Math.random() - 0.5) * 100));
        sourceY = Math.max(0, Math.min(imgHeight - sourceHeight, sourceY + (Math.random() - 0.5) * 100));
        break;
    }
  }

  // 수동 오프셋 적용
  if (cropOffset.x !== 0 || cropOffset.y !== 0) {
    const maxOffsetX = (imgWidth - sourceWidth) / 2;
    const maxOffsetY = (imgHeight - sourceHeight) / 2;
    
    sourceX += cropOffset.x * maxOffsetX;
    sourceY += cropOffset.y * maxOffsetY;
    
    // 경계 체크
    sourceX = Math.max(0, Math.min(imgWidth - sourceWidth, sourceX));
    sourceY = Math.max(0, Math.min(imgHeight - sourceHeight, sourceY));
  }

  // 줌 적용
  if (cropZoom !== 1.0) {
    const zoomedWidth = sourceWidth / cropZoom;
    const zoomedHeight = sourceHeight / cropZoom;
    const zoomOffsetX = (sourceWidth - zoomedWidth) / 2;
    const zoomOffsetY = (sourceHeight - zoomedHeight) / 2;
    
    sourceX += zoomOffsetX;
    sourceY += zoomOffsetY;
    sourceWidth = zoomedWidth;
    sourceHeight = zoomedHeight;
  }

  return {
    sourceX: Math.round(sourceX),
    sourceY: Math.round(sourceY),
    sourceWidth: Math.round(sourceWidth),
    sourceHeight: Math.round(sourceHeight)
  };
}

/**
 * 이미지 크롭 미리보기를 위한 임시 Canvas 생성
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} options - 크롭 옵션
 * @returns {HTMLCanvasElement} 크롭된 이미지가 그려진 Canvas
 */
export function createCropPreview(img, options = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const targetWidth = options.targetSize?.width || img.naturalWidth;
  const targetHeight = options.targetSize?.height || img.naturalHeight;
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  drawCroppedImage(ctx, img, {
    ...options,
    x: targetWidth / 2,
    y: targetHeight / 2,
    align: 'center',
    verticalAlign: 'middle'
  });
  
  return canvas;
}

/**
 * 크롭 정보를 JSON으로 직렬화
 * @param {Object} cropOptions - 크롭 옵션
 * @returns {Object} 직렬화된 크롭 정보
 */
export function serializeCropOptions(cropOptions) {
  return {
    scaleMode: cropOptions.scaleMode || 'crop',
    cropMode: cropOptions.cropMode || 'center',
    targetSize: cropOptions.targetSize || null,
    cropOffset: cropOptions.cropOffset || { x: 0, y: 0 },
    cropZoom: cropOptions.cropZoom || 1.0
  };
}

/**
 * JSON에서 크롭 정보를 역직렬화
 * @param {Object} serialized - 직렬화된 크롭 정보
 * @returns {Object} 크롭 옵션
 */
export function deserializeCropOptions(serialized) {
  return {
    scaleMode: serialized.scaleMode || 'crop',
    cropMode: serialized.cropMode || 'center',
    targetSize: serialized.targetSize || null,
    cropOffset: serialized.cropOffset || { x: 0, y: 0 },
    cropZoom: serialized.cropZoom || 1.0
  };
}

/**
 * 이미지의 주요 객체나 얼굴을 감지하여 스마트 크롭 위치를 계산
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} targetSize - 목표 크기
 * @returns {Object} 스마트 크롭 오프셋 {x, y}
 */
export function calculateSmartCropOffset(img, targetSize) {
  // 간단한 스마트 크롭: 이미지의 밝기 분포를 기반으로 중심점 계산
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 이미지를 작은 크기로 리사이즈하여 성능 향상
  const sampleSize = 100;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;
  
  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  
  // 각 픽셀의 밝기를 가중치로 사용하여 중심점 계산
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      const idx = (y * sampleSize + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const weight = brightness / 255;
      
      totalWeight += weight;
      weightedX += x * weight;
      weightedY += y * weight;
    }
  }
  
  if (totalWeight > 0) {
    const centerX = weightedX / totalWeight / sampleSize;
    const centerY = weightedY / totalWeight / sampleSize;
    
    // -1 ~ 1 범위로 정규화
    return {
      x: (centerX - 0.5) * 2,
      y: (centerY - 0.5) * 2
    };
  }
  
  return { x: 0, y: 0 };
}

/**
 * 이미지의 비율을 유지하면서 최적의 크롭 영역을 계산
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} targetSize - 목표 크기
 * @param {string} focus - 초점 위치 ('center', 'top', 'bottom', 'left', 'right')
 * @returns {Object} 크롭 데이터
 */
export function calculateOptimalCrop(img, targetSize, focus = 'center') {
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  const targetRatio = targetSize.width / targetSize.height;
  const imgRatio = imgWidth / imgHeight;
  
  let sourceWidth, sourceHeight, sourceX, sourceY;
  
  if (imgRatio > targetRatio) {
    // 이미지가 더 넓음
    sourceWidth = imgWidth;
    sourceHeight = imgWidth / targetRatio;
    sourceX = 0;
    
    // 세로 위치 조정
    switch (focus) {
      case 'top':
        sourceY = 0;
        break;
      case 'bottom':
        sourceY = imgHeight - sourceHeight;
        break;
      default: // center
        sourceY = (imgHeight - sourceHeight) / 2;
    }
  } else {
    // 이미지가 더 높음
    sourceHeight = imgHeight;
    sourceWidth = imgHeight * targetRatio;
    sourceY = 0;
    
    // 가로 위치 조정
    switch (focus) {
      case 'left':
        sourceX = 0;
        break;
      case 'right':
        sourceX = imgWidth - sourceWidth;
        break;
      default: // center
        sourceX = (imgWidth - sourceWidth) / 2;
    }
  }
  
  return {
    sourceX: Math.round(sourceX),
    sourceY: Math.round(sourceY),
    sourceWidth: Math.round(sourceWidth),
    sourceHeight: Math.round(sourceHeight)
  };
}

/**
 * 크롭된 이미지를 Blob으로 내보내기
 * @param {HTMLImageElement} img - 원본 이미지
 * @param {Object} options - 크롭 옵션
 * @param {string} format - 출력 형식 ('image/jpeg', 'image/png', 'image/webp')
 * @param {number} quality - 품질 (0-1, JPEG만 해당)
 * @returns {Promise<Blob>} 크롭된 이미지 Blob
 */
export function exportCroppedImage(img, options, format = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = createCropPreview(img, options);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, format, quality);
    } catch (error) {
      reject(error);
    }
  });
} 