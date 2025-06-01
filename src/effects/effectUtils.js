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
  lovelyHearts: (ctx, layer, currentTime, canvas) => {
    // 더 다양한 색상과 크기의 하트가 랜덤하게 떠오르는 효과
    const t = (currentTime - layer.start) / layer.duration;
    for (let i = 0; i < (layer.count || 20); i++) {
      const x = Math.random() * canvas.width;
      const y = canvas.height - t * (canvas.height + 100) + Math.random() * 30;
      const size = 20 + Math.random() * 20;
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(i + t * 10);
      ctx.fillStyle = ["#ffb6c1", "#ff69b4", "#ff1493", "#ff69b4", "#fff0f5"][
        i % 5
      ];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x - size / 2,
        y - size / 2,
        x - size,
        y + size / 3,
        x,
        y + size
      );
      ctx.bezierCurveTo(
        x + size,
        y + size / 3,
        x + size / 2,
        y - size / 2,
        x,
        y
      );
      ctx.fill();
      ctx.restore();
    }
  },
  loveRain: (ctx, layer, currentTime, canvas) => {
    // 핑크빛 하트가 비처럼 내리는 효과
    const t = (currentTime - layer.start) / layer.duration;
    for (let i = 0; i < (layer.count || 30); i++) {
      const x = (i * 53 + t * 200) % canvas.width;
      const y = (t * canvas.height * 1.2 + i * 37) % canvas.height;
      const size = 16 + (i % 3) * 8;
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(i + t * 5);
      ctx.fillStyle = ["#ffb6c1", "#ff69b4", "#ff1493", "#fff0f5"][i % 4];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x - size / 2,
        y - size / 2,
        x - size,
        y + size / 3,
        x,
        y + size
      );
      ctx.bezierCurveTo(
        x + size,
        y + size / 3,
        x + size / 2,
        y - size / 2,
        x,
        y
      );
      ctx.fill();
      ctx.restore();
    }
  },
  filmDust: (ctx, layer, currentTime, canvas) => {
    // 랜덤한 먼지 파티클
    const count = layer.count || 80;
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 0.25;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
    ctx.restore();

    // 랜덤 스크래치
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 0.12;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * canvas.width;
      const y1 = Math.random() * canvas.height;
      const y2 = y1 + Math.random() * 40 + 10;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
    ctx.restore();
  },
  filmGrain: (ctx, layer, currentTime, canvas) => {
    const grainAmount = layer.amount ?? 0.15; // 0~1
    const w = canvas.width,
      h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * grainAmount;
      data[i] = Math.min(255, Math.max(0, data[i] + noise)); // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
      // A는 그대로
    }
    ctx.putImageData(imageData, 0, 0);
  },
  filmScratch: (ctx, layer, currentTime, canvas) => {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 0.12;
    for (let i = 0; i < (layer.count || 8); i++) {
      const x = Math.random() * canvas.width;
      const y1 = Math.random() * canvas.height;
      const y2 = y1 + Math.random() * 60 + 20;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
    ctx.restore();
  },
  filmBurn: (ctx, layer, currentTime, canvas) => {
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 0.18;
    const grad = ctx.createRadialGradient(
      canvas.width * 0.1,
      canvas.height * 0.5,
      10,
      canvas.width * 0.1,
      canvas.height * 0.5,
      canvas.width * 0.5
    );
    grad.addColorStop(0, "rgba(255,200,100,0.8)");
    grad.addColorStop(1, "rgba(255,200,100,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  },
};
