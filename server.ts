import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API routes go here FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/chat', async (req, res) => {
  const { persona, scenario, history } = req.body;

  if (!persona || !scenario || !history) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const isFirstMessage = history.length === 0;
  const userTitle = persona.division === '영업' ? '지점장님' : '팀장님';
  
  const systemPrompt = `
귀하는 현대자동차 국내사업본부의 직원입니다. 현재 당신은 ${userTitle}과 면담을 진행하고 있습니다.

[당신의 프로필]
성함: ${persona.name}
직급: ${persona.role}
나이: ${persona.age}세
성향: ${persona.trait}
MBTI: ${persona.mbti}
업무 스타일: ${persona.style}

[현재 면담 상황]
카테고리: ${scenario.category}
상황: ${scenario.title} - ${scenario.description}

[작동 규칙]
1. 현실성 유지: 대기업 현장에서 발생하는 실제 갈등을 직장인의 언어로 표현하세요. 현대자동차 직원이 쓸법한 현실적인 말투를 사용하세요. 
2. 호칭 준수: 상대방(리더)을 반드시 "${userTitle}" 또는 "${userTitle}님"이라고 부르세요.
3. 난이도 조절: 리더가 경청, 공감, 개방형 질문을 할 때만 마음을 조금씩 여세요. 지시적이거나 비난조라면 반발하거나 침묵하세요.
4. 짧은 호흡: 절대로 길게 설명하지 마세요. 실제 대화처럼 한 번에 1~3문장 이내로만 답변하세요.
5. 감정 상태 포함: 답변 끝에 반드시 [감정: 상태] 형태로 현재의 감정 상태를 요점만 적어주세요.
6. 분석 데이터 포함: 답변 끝에 반드시 [분석: {"metrics": {"rapport": 0-100, "analysis": 0-100, "solution": 0-100, "engagement": 0-100}, "goals": [true/false, true/false, true/false]}] 형식으로 현재까지의 대화 수준을 평가하세요. 
   - 이 분석 데이터는 반드시 답변의 가장 마지막에 JSON 형식을 지켜 위치시켜야 합니다.
   - goals: 1. 아이스브레이킹/공감 여부, 2. 원인 파악 시도 여부, 3. 개선 약속 도출 여부
${isFirstMessage ? `7. 시작 방식: 현재 상황에 이미 처해있는 상태로, ${userTitle}이 면담을 시작하자고 했거나 본인이 찾아온 시점입니다. 별도의 요약 없이 바로 대화를 시작하는 첫 마디를 하세요.` : ''}

현재 대화 기록:
${history.map((m: any) => `${m.role === 'user' ? userTitle : persona.name}: ${m.content}`).join('\n')}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
    });
    
    const text = response.text || '';
    
    // Extract emotion from the text if present
    const emotionMatch = text.match(/\[감정:\s?([^\]]+)\]/);
    const emotion = emotionMatch ? emotionMatch[1] : '중립';
    
    // Extract metrics/goals if present - using a more robust regex for nested JSON
    const analysisMatch = text.match(/\[분석:\s?(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})\]/);
    const analysis = analysisMatch ? JSON.parse(analysisMatch[1]) : {
      metrics: { rapport: 50, analysis: 30, solution: 10, engagement: 40 },
      goals: [false, false, false]
    };

    const cleanText = text.replace(/\[감정:\s?[^\]]+\]/g, '')
                        .replace(/\[분석:\s?\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}\]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

    res.json({ content: cleanText, emotion, analysis });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    
    // Check for rate limit or quota issues
    const isRateLimit = error?.status === 429 || error?.code === 429 || error.message?.includes('429') || error.message?.includes('quota');
    const isServiceUnavailable = error?.status === 503 || error?.code === 503 || error.message?.includes('503') || error.message?.includes('overloaded');
    
    let errorMessage = 'AI 응답 생성 중 오류가 발생했습니다.';
    let status = 500;

    if (isRateLimit) {
      errorMessage = 'AI 서비스의 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.';
      status = 429;
    } else if (isServiceUnavailable) {
      errorMessage = '현재 AI 모델에 많은 사용자가 몰리고 있습니다. 잠시 후 다시 시도해 주세요.';
      status = 503;
    }
    
    // Ensure we always return JSON
    res.status(status).json({ error: errorMessage });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  }
}

startServer();

export default app;
