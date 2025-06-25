// 이미지 썸네일 캐시: { src: { 0.2: img, 0.4: img, 0.8: img, original: img } }
const thumbnailCache = {};

/**
 * 이미지 썸네일(quality별) 생성 및 캐싱
 * @param {string} src - 이미지 경로
 * @param {number} quality - 0.2, 0.4, 0.8
 * @returns {Promise<HTMLImageElement>} 썸네일 이미지
 */
export async function getThumbnail(src, quality = 0.4) {
  if (!src) return null;
  if (!thumbnailCache[src]) thumbnailCache[src] = {};
  if (thumbnailCache[src][quality]) return thumbnailCache[src][quality];

  // 원본 이미지 로드
  let originalImg = thumbnailCache[src].original;
  if (!originalImg) {
    originalImg = await loadImage(src);
    thumbnailCache[src].original = originalImg;
  }

  // 썸네일 생성
  const thumbImg = await createThumbnail(originalImg, quality);
  thumbnailCache[src][quality] = thumbImg;
  return thumbImg;
}

/**
 * 원본 이미지 로드 (Promise)
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 이미지 썸네일 생성 (Canvas 리사이즈)
 */
function createThumbnail(img, quality) {
  return new Promise((resolve) => {
    const w = Math.max(1, Math.round(img.naturalWidth * quality));
    const h = Math.max(1, Math.round(img.naturalHeight * quality));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const thumbImg = new window.Image();
    thumbImg.onload = () => resolve(thumbImg);
    thumbImg.src = canvas.toDataURL('image/jpeg', 0.85);
  });
}

/**
 * 원본 이미지 반환 (최종 추출용)
 */
export async function getOriginalImage(src) {
  if (!src) return null;
  if (thumbnailCache[src]?.original) return thumbnailCache[src].original;
  const img = await loadImage(src);
  if (!thumbnailCache[src]) thumbnailCache[src] = {};
  thumbnailCache[src].original = img;
  return img;
}

/**
 * 캐시 비우기 (메모리 관리)
 */
export function clearThumbnailCache() {
  Object.keys(thumbnailCache).forEach((src) => {
    Object.keys(thumbnailCache[src]).forEach((q) => {
      delete thumbnailCache[src][q];
    });
    delete thumbnailCache[src];
  });
} 