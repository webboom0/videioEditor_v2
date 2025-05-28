import React, { useEffect, useRef, useState } from "react";

// 오디오 파형 데이터 추출 함수
async function getWaveformData(audioUrl, sampleCount = 200) {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const rawData = audioBuffer.getChannelData(0); // 첫 번째 채널
  const blockSize = Math.floor(rawData.length / sampleCount);
  const waveform = [];
  for (let i = 0; i < sampleCount; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[i * blockSize + j]);
    }
    waveform.push(sum / blockSize);
  }
  return waveform;
}

export default function AudioWaveform({ src, width = 400, height = 60 }) {
  const [waveform, setWaveform] = useState([]);
  const canvasRef = useRef();

  useEffect(() => {
    getWaveformData(src, width).then(setWaveform);
  }, [src, width]);

  useEffect(() => {
    if (!waveform.length) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#4fc3f7";
    waveform.forEach((v, i) => {
      const x = i;
      const y = (1 - v) * height * 0.5;
      const barHeight = v * height;
      ctx.fillRect(x, y, 1, barHeight);
    });
  }, [waveform, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
