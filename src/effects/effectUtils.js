// 하트 그리기 함수
export function drawHeart(ctx, x, y, size, color = "#ff69b4") {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.quadraticCurveTo(x, y, x + size / 2, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
  ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + size);
  ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// 번쩍임 효과
export function effectFlash(ctx, layer, currentTime, canvas) {
  const scale = layer.scale ?? 1;
  ctx.save();
  ctx.globalAlpha =
    (layer.intensity || 0.5) *
    Math.abs(Math.sin((currentTime - layer.start) * Math.PI * 2));
  ctx.fillStyle = layer.color || "#fff";
  // 캔버스 중심 기준으로 스케일 적용
  if (canvas) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // fallback: 기존 방식
    ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
  }
  ctx.restore();
}

// 라인 효과
export function effectLine(ctx, layer) {
  ctx.save();
  ctx.strokeStyle = layer.color || "#f00";
  ctx.lineWidth = layer.lineWidth || 5;
  ctx.beginPath();
  ctx.moveTo(layer.x, layer.y);
  ctx.lineTo(layer.x + layer.width, layer.y + layer.height);
  ctx.stroke();
  ctx.restore();
}

// 하트 파티클 효과
export function effectHearts(ctx, layer, currentTime, canvas) {
  const heartCount = layer.count || 12;
  // 캔버스 크기 기준으로 영역 설정
  const areaW = (canvas ? canvas.width : layer.width) || 640;
  const areaH = (canvas ? canvas.height : layer.height) || 360;
  const duration = layer.duration || 3;
  const scale = layer.scale ?? 1;
  const elapsed = currentTime - layer.start;
  for (let i = 0; i < heartCount; i++) {
    const seed = i * 9973;
    const x = (layer.x || 0) + (((seed % areaW) + ((i * 37) % 50)) % areaW);
    const delay = (i * 0.2) % duration;
    const t = Math.max(0, Math.min(1, (elapsed - delay) / (duration - delay)));
    if (t < 0 || t > 1) continue;
    const y = (layer.y || 0) + areaH - t * (areaH + 40);
    const size = (18 + (seed % 10) * 2) * scale;
    drawHeart(ctx, x, y, size);
  }
}

// 이펙트 맵핑
export const EFFECT_MAP = {
  flash: effectFlash,
  line: effectLine,
  hearts: effectHearts,
  // ...다른 효과 추가...
};
