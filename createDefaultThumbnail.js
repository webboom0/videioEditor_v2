const fs = require('fs');
const path = require('path');

// 간단한 SVG 기본 썸네일 생성
const createDefaultThumbnail = () => {
  const svgContent = `
<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="180" fill="#2c3e50"/>
  <rect x="10" y="10" width="300" height="160" fill="#34495e" stroke="#ecf0f1" stroke-width="2"/>
  <text x="160" y="90" font-family="Arial, sans-serif" font-size="24" fill="#ecf0f1" text-anchor="middle">새 템플릿</text>
  <text x="160" y="120" font-family="Arial, sans-serif" font-size="14" fill="#bdc3c7" text-anchor="middle">클릭하여 편집</text>
</svg>`;

  const thumbDir = path.join(__dirname, 'public', 'template', 'thumb');
  
  // thumb 디렉토리가 없으면 생성
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }

  // 기본 썸네일 파일 생성
  const defaultThumbPath = path.join(thumbDir, 'default.svg');
  fs.writeFileSync(defaultThumbPath, svgContent);
  
  console.log('기본 썸네일이 생성되었습니다:', defaultThumbPath);
};

createDefaultThumbnail(); 