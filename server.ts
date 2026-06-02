import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeySet: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    nodeEnv: process.env.NODE_ENV
  });
});

app.post('/api/chat', validateApiKey, async (req, res) => {
  console.log('[API Chat] Incoming request');
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
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let attempts = 0;
    while (attempts < 5) {
      try {
        const result = await ai.models.generateContentStream({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        });

        for await (const chunk of result) {
          const text = chunk.text;
          if (text) res.write(text);
        }
        res.end();
        return;
      } catch (innerError: any) {
        attempts++;
        const message = String(innerError.message || '').toLowerCase();
        const code = innerError.status || innerError.code || 0;
        const isRetryable = message.includes('overloaded') || message.includes('high demand') || message.includes('unavailable') || code === 503 || code === 429;
        
        if (isRetryable && attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          continue;
        }
        if (!res.headersSent) {
          res.status(500).json({ error: 'AI Error', details: message });
        } else {
          res.write(`\n\n[오류: AI 서비스 일시 지연]`);
          res.end();
        }
        return;
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Server Error' });
  }
});

app.post('/api/report', validateApiKey, async (req, res) => {
  try {
    const { persona, scenario, history } = req.body;
    const systemPrompt = `
귀하는 현대자동차 리서치/코칭 분야의 '마스터 등급' AI 리더십 분석 전문가입니다. 
단순 대화 요약이 아닌, 사용자의 '무의식적인 말투', '단어 선택의 패턴', '공감의 깊이'를 데이터 기반으로 해부하여 리포트를 작성하세요.

[시나리오 context]
- 제목: ${scenario.title}
- 내용: ${scenario.description}
- 팀원 정보: ${persona.name}(${persona.role}, ${persona.mbti} - ${persona.style})

[대화 로그 데이터]
${history.map((m: any) => `${m.role === 'user' ? '리더' : persona.name}: ${m.content}`).join('\n')}

[리포트 작성 엄격 규칙]
1. 인용문 중심 분석: 모든 '강점'과 '개선점'에는 대화 로그에서 사용자가 실제로 한 말(따옴표 "")을 반드시 포함하고, 그 말이 상대방에게 준 심리적 타격을 분석하세요.
2. 립서비스 금지: "잘했습니다" 같은 모호한 칭찬은 배제합니다. "리더가 ~라고 질문한 것은 개방형 질문으로서 상대방의 본심을 끌어내는 데 기여했습니다"와 같이 분석하세요.
3. 실전 스크립트 제공: 액션 플랜에는 구체적인 대사(Script)를 상황별로 제공하세요.
4. 직무 밀착 솔루션: ${persona.division} 부문의 실제 현장 고충(영업 실적, CS 만족도, 정비 공임 등)과 연결된 리더십 비전을 제시하세요.

반드시 다음 JSON 형식을 100% 준수하여 답변하세요. (JSON 외 텍스트 포함 시 시스템 오류 발생)

{
  "overall": "리더의 고유한 소통 스타일을 정의하고, 전체적인 소통 유효성을 전문적으로 총평 (최소 5문장)",
  "psychology": "사용자의 특정 발언 이후 팀원의 심리 변화(경계심 고조, 신뢰 형성 등)를 정밀 분석",
  "leadership": "리더의 화법 원형 진단 및 대화 패턴에 숨겨진 리더십 자아 분석",
  "needs": "팀원이 직접 말하지 않았으나 대화 속에 간절히 원했던 '정서적 결핍' 또는 '실질적 지원' 포인트",
  "strengths": "가장 효과적이었던 순간의 발언 인용 및 해당 발언의 성과 분석",
  "improvements": "가장 아쉬웠던 발언 인용 및 그 발언을 들었을 때 팀원이 느꼈을 감정의 원인 분석",
  "actionPlan": {
    "quote": "다음 대화 재개 시 상대방의 마음을 열 수 있는 추천 스크립트",
    "guidelines": [
      "지금 당장 교정해야 할 언어 습관",
      "이 팀원의 특성을 고려한 면담 전략",
      "갈등 재발 시 실질적 행동 규칙"
    ],
    "risk": "현재의 소통 스타일이 고착화될 경우 발생할 조직 관리 리스크"
  }
}
`;

    const ai = getAiClient();
    let attempts = 0;
    while (attempts < 5) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.2 } as any
        });
        const resObj = (result as any);
        const responseText = resObj.text || (typeof resObj.text === 'function' ? resObj.text() : '') || resObj.response?.text() || '';
        const cleanedJson = responseText.replace(/```json|```/g, '').trim();
        return res.json(JSON.parse(cleanedJson));
      } catch (innerError: any) {
        attempts++;
        const message = String(innerError.message || '').toLowerCase();
        const code = innerError.status || innerError.code || 0;
        const isRetryable = message.includes('overloaded') || message.includes('high demand') || message.includes('unavailable') || code === 503 || code === 429;
        if (isRetryable && attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1500));
          continue;
        }
        throw innerError;
      }
    }
  } catch (error: any) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Report generation failed', details: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  }
}

startServer();
export default app;
