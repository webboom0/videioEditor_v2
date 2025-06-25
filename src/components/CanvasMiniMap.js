import React, { useRef, useEffect, useState } from 'react';

function CanvasMiniMap({
  canvasWidth = 1280,
  canvasHeight = 720,
  zoom = 1,
  containerRef,
  onMove
}) {
  const miniWidth = 160;
  const miniHeight = 90;
  const scaleX = miniWidth / (canvasWidth * zoom);
  const scaleY = miniHeight / (canvasHeight * zoom);

  // 컨테이너 스크롤 상태 추적
  const [scroll, setScroll] = useState({ left: 0, top: 0, width: miniWidth, height: miniHeight });

  const svgRef = useRef(null);

  useEffect(() => {
    function updateScroll() {
      if (!containerRef?.current) return;
      const el = containerRef.current;
      setScroll({
        left: el.scrollLeft,
        top: el.scrollTop,
        width: el.clientWidth,
        height: el.clientHeight
      });
    }
    updateScroll();
    if (!containerRef?.current) return;
    const el = containerRef.current;
    el.addEventListener('scroll', updateScroll);
    window.addEventListener('resize', updateScroll);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [containerRef, zoom]);

  // 미니맵 뷰포트 사각형 계산
  const viewX = scroll.left * scaleX;
  const viewY = scroll.top * scaleY;
  const viewW = scroll.width * scaleX;
  const viewH = scroll.height * scaleY;

  // 미니맵 클릭/드래그 시 컨테이너 스크롤 이동
  const isDragging = useRef(false);
  function handleMouseDown(e) {
    isDragging.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    moveTo(e);
  }
  function handleMouseMove(e) {
    if (!isDragging.current) return;
    moveTo(e);
  }
  function handleMouseUp() {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
  function moveTo(e) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 미니맵 클릭 위치를 전체 캔버스 좌표로 변환
    const targetX = (mx / miniWidth) * (canvasWidth * zoom);
    const targetY = (my / miniHeight) * (canvasHeight * zoom);
    // 컨테이너의 중앙이 targetX, targetY가 되도록 스크롤
    const newLeft = Math.max(0, Math.min(canvasWidth * zoom - scroll.width, targetX - scroll.width / 2));
    const newTop = Math.max(0, Math.min(canvasHeight * zoom - scroll.height, targetY - scroll.height / 2));
    console.log('MiniMap moveTo:', { mx, my, targetX, targetY, newLeft, newTop });
    onMove && onMove({ left: newLeft, top: newTop });
  }

  return (
    <div className="canvas-minimap">
      <svg ref={svgRef} width={miniWidth} height={miniHeight} onMouseDown={handleMouseDown} style={{ cursor: 'pointer', display: 'block' }}>
        <rect x={0} y={0} width={miniWidth} height={miniHeight} fill="#222" rx={8} />
        <rect
          x={viewX}
          y={viewY}
          width={viewW}
          height={viewH}
          fill="rgba(80,180,255,0.15)"
          stroke="#4f8cff"
          strokeWidth={2}
          rx={4}
        />
      </svg>
    </div>
  );
}

export default CanvasMiniMap; 