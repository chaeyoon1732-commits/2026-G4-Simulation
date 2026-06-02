import express from 'express';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Key Validation Middleware for Chat
const validateApiKey = (req: any, res: any, next: any) => {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log('API Key Validation - Key found:', !!rawKey);

  if (!rawKey || typeof rawKey !== 'string' || rawKey.trim() === '' || rawKey === 'MY_GEMINI_API_KEY') {
    return res.status(401).json({ 
      error: 'API 키가 설정되지 않았습니다.',
      details: 'AI Studio 우측 상단 [Settings] -> [Secrets] 메뉴에 "GEMINI_API_KEY"를 등록해주세요.'
    });
  }
  next();
};

// Gemini initialization helper
const getAiClient = () => {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  // Filter out quotes and non-printable characters/whitespace
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
  
  if (apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== '') {
    const masked = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[Gemini Init] Key: ${masked} (Len: ${apiKey.length})`);
  }

  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API routes go here FIRST
app.get('/api/health', (req, res) => {
  const availableKeys = Object.keys(process.env).map(key => {
    const isSet = !!process.env[key] && process.env[key] !== 'MY_GEMINI_API_KEY' && process.env[key] !== '';
    return { key, isSet };
  });
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeySet: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    nodeEnv: process.env.NODE_ENV,
    secrets: availableKeys.filter(k => k.key.includes('API') || k.key.includes('KEY') || k.key.includes('GEMINI'))
  });
});

app.post('/api/chat', validateApiKey, async (req, res) => {
  console.log('[API Chat] Incoming request from User-Agent:', req.headers['user-agent']);
  try {
    const { persona, scenario, history } = req.body;

    if (!persona || !scenario || !history) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const isFirstMessage = Array.isArray(history) && history.length === 0;
    const userTitle = (persona.division === '영업') ? '지점장님' : '팀장님';
    
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
2. 직무 전문성 강화:
   - 카마스터(영업직)의 경우: 지점 당직, 잠재 고객 확보(DB), 시승(Test Drive), 견적 상담, 신차 출고, 차량 인도, 사후 관리(CS) 등 영업 현장 용어를 사용하세요.
   - 서비스엔지니어(정비직)의 경우: 센터 입고, 차량 진단, 부품 수급, 정비 리드타임(L/T), 보증 수리, 과잉 정비 오해, 작업 완성도 등 서비스 현장 용어를 사용하세요.
3. 호칭 준수: 상대방(리더)을 반드시 "${userTitle}" 또는 "${userTitle}님"이라고 부르세요.
4. 난이도 조절: 리더가 경청, 공감, 개방형 질문을 할 때만 마음을 조금씩 여세요. 지시적이거나 비난조라면 반발하거나 침묵하세요.
5. 짧은 호흡: 절대로 길게 설명하지 마세요. 실제 대화처럼 한 번에 1~3문장 이내로만 답변하세요.
6. 감정 상태 포함: 답변 끝에 반드시 [감정: 상태] 형태로 현재의 감정 상태를 요점만 적어주세요.
7. 분석 데이터 포함: 답변 끝에 반드시 [분석: {"metrics": {"rapport": 0-100, "analysis": 0-100, "solution": 0-100, "engagement": 0-100}, "goals": [true/false, true/false, true/false]}] 형식으로 현재까지의 대화 수준을 평가하세요. 
   - 이 분석 데이터는 반드시 답변의 가장 마지막에 JSON 형식을 지켜 위치시켜야 합니다.
   - goals: 1. 아이스브레이킹/공감 여부, 2. 원인 파악 시도 여부, 3. 개선 약속 도출 여부
${isFirstMessage ? `8. 시작 방식: 현재 상황에 이미 처해있는 상태로, ${userTitle}이 면담을 시작하자고 했거나 본인이 찾아온 시점입니다. 별도의 요약 없이 바로 대화를 시작하는 첫 마디를 하세요.` : ''}

현재 대화 기록:
${Array.isArray(history) ? history.map((m: any) => `${m.role === 'user' ? userTitle : persona.name}: ${m.content}`).join('\n') : ''}
`;

    const ai = getAiClient();
    console.log('Generating streaming content with model: gemini-3.5-flash');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      const result = await ai.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          res.write(text);
        }
      }
      res.end();
    } catch (innerError: any) {
      console.error('Streaming error:', innerError);
      
      let errorMsg = 'AI 응답 생성 중 오류가 발생했습니다.';
      const message = innerError.message || '';
      
      if (message.includes('API key not valid')) {
        errorMsg = '유효하지 않은 Gemini API 키가 감지되었습니다. [Settings] -> [Secrets] 메뉴에 등록된 GEMINI_API_KEY 값이 따옴표(")나 공백 없이 정확한지 확인해주세요.';
      } else if (message.includes('overloaded') || innerError.status === 503) {
        errorMsg = '현재 AI 서버에 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      }
      
      if (!res.headersSent) {
        res.status(500).json({ error: errorMsg, details: innerError.message });
      } else {
        res.write(`\n\n[오류: ${errorMsg}]`);
        res.end();
      }
    }
  } catch (outerError: any) {
    console.error('Outer handler error:', outerError);
    if (!res.headersSent) {
      res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
  }
});

app.post('/api/analyze-report', validateApiKey, async (req, res) => {
  try {
    const { persona, scenario, history } = req.body;

    if (!persona || !scenario || !history) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const systemPrompt = `
귀하는 현대자동차 리더십 코칭 전문가입니다. 
다음은 리더(사용자)와 팀원(${persona.name}, ${persona.role}, ${persona.division}) 간의 시뮬레이션 면담 기록입니다.
이 대화 내용을 분석하여 리더에게 제공할 상세 결과 리포트를 작성하세요.

[시나리오 내용]
제목: ${scenario.title}
내용: ${scenario.description}

[대화 기록]
${history.map((m: any) => `${m.role === 'user' ? '리더' : persona.name}: ${m.content}`).join('\n')}

[요구사항]
1. 모든 항목은 실제 대화 내용에서 나타난 리더의 발언과 팀원의 반응을 근거로 구체적으로 작성해야 합니다.
2. 직무의 특성을 반영하세요:
   - 카마스터(영업)의 경우: 지점 당직, 고객 DB 관리, 출고 지연 대응, CS 관리 등 영업 현장의 고충과 전문성을 고려하세요.
   - 서비스엔지니어(정비)의 경우: 정비 리드타임(L/T), 부품 수급 애로, 보증 수리 이슈, 작업 숙련도 등 서비스 현장의 현실을 반영하세요.
3. 반드시 다음 JSON 형식을 엄격히 지켜 답변하세요. (JSON 외의 텍스트는 포함하지 마세요)

{
  "overall": "대화 전체에 대한 2~3문장의 종합 총평",
  "psychology": "대화 중 나타난 팀원의 구체적인 심리 변화 및 반응 분석",
  "leadership": "리더의 대화 스타일이 팀원에게 미친 영향 및 스타일 진단",
  "needs": "팀원이 대화 속에서 은연중에 드러낸 핵심 요구사항이나 불안 요소",
  "strengths": "대화 중 리더가 보여준 가장 긍정적이었던 순간이나 발언 (근거 포함)",
  "improvements": "가장 아쉬웠던 순간이나 대화의 흐름을 개선하기 위한 포인트",
  "actionPlan": {
    "quote": "리더에게 추천하는 이 팀원 맞춤형 대화 예시 (1문장)",
    "guidelines": ["리더를 위한 구체적인 행동 가이드 3가지"],
    "risk": "현재의 리더십 스타일을 유지할 경우 발생할 수 있는 잠정적 리스크"
  }
}
`;

    const ai = getAiClient();
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.text || '';
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error('Report analysis error:', error);
    res.status(500).json({ 
      error: '리포트 분석 중 오류가 발생했습니다.', 
      details: error.message,
      code: error.status || error.code 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Dynamic import to avoid including vite in production bundles
    const { createServer: createViteServer } = await import('vite');
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
    
    // Note: This catch-all should be LAST
    app.get('*', (req, res, next) => {
      // Skip if the request is for an API route that might have missed or 404ed
      if (req.path.startsWith('/api/')) {
        return next();
      }
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
