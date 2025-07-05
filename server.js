const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 6060;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 템플릿 저장 API
app.post('/api/save-template', async (req, res) => {
  try {
    const { name, template } = req.body;
    
    if (!name || !template) {
      return res.status(400).json({ error: '템플릿 이름과 데이터가 필요합니다.' });
    }

    // 템플릿 디렉토리 경로
    const templateDir = path.join(__dirname, 'public', 'template');
    const templatePath = path.join(templateDir, `${name}.json`);

    // 템플릿 디렉토리가 없으면 생성
    try {
      await fs.access(templateDir);
    } catch {
      await fs.mkdir(templateDir, { recursive: true });
    }

    // 템플릿 파일 저장
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf8');

    // 기본 썸네일 이미지 생성 (빈 이미지 또는 기본 이미지)
    const thumbDir = path.join(templateDir, 'thumb');
    try {
      await fs.access(thumbDir);
    } catch {
      await fs.mkdir(thumbDir, { recursive: true });
    }

    // 기본 썸네일 이미지 복사 (기존 썸네일이 있다면)
    const defaultThumbPath = path.join(thumbDir, 'default.svg');
    const newThumbPath = path.join(thumbDir, `${name}.svg`);
    
    try {
      await fs.copyFile(defaultThumbPath, newThumbPath);
    } catch {
      // 기본 썸네일이 없으면 빈 파일 생성 (나중에 실제 이미지로 교체 가능)
      await fs.writeFile(newThumbPath, '');
    }

    res.json({ success: true, message: '템플릿이 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('템플릿 저장 오류:', error);
    res.status(500).json({ error: '템플릿 저장에 실패했습니다.' });
  }
});

// 템플릿 목록 조회 API
app.get('/api/templates', async (req, res) => {
  try {
    console.log('템플릿 목록 조회 요청 받음');
    const templateDir = path.join(__dirname, 'public', 'template');
    
    // 템플릿 디렉토리가 없으면 빈 배열 반환
    try {
      await fs.access(templateDir);
    } catch {
      console.log('템플릿 디렉토리가 없음, 빈 배열 반환');
      return res.json([]);
    }
    
    const files = await fs.readdir(templateDir);
    console.log('템플릿 디렉토리 파일들:', files);
    
    const templates = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .filter(name => name && name.length > 0);
    
    console.log('필터링된 템플릿 목록:', templates);
    res.json(templates);
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error);
    res.status(500).json({ error: '템플릿 목록을 가져올 수 없습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`http://localhost:${PORT}`);
}); 