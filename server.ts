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
5. 매우 짧은 호흡: 실제 대화처럼 한 번에 1~2문장 이내로만 매우 간략하게 답변하세요. 장황한 설명은 절대 금지합니다.
6. 감정 상태 포함: 답변 끝에 [감정: 상태] 형태로 현재의 감정을 짧게 적어주세요.
7. 분석 데이터 포함: 답변 끝에 [분석: {"metrics": {"rapport": 0-100, "analysis": 0-100, "solution": 0-100, "engagement": 0-100}, "goals": [true/false, true/false, true/false]}] 형식의 JSON 데이터를 한 줄로 포함하세요. 
   - goals: 1. 공감/아이스브레이킹, 2. 원인 파악, 3. 개선 약속 도출 여부
${isFirstMessage ? `8. 시작 방식: 상황에 맞춰 1~2문장으로 짧게 첫 마디를 건네며 대화를 시작하세요.` : ''}

현재 대화 기록:
${Array.isArray(history) ? history.map((m: any) => `${m.role === 'user' ? userTitle : persona.name}: ${m.content}`).join('\n') : ''}
`;

    const ai = getAiClient();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let attempts = 0;
    while (attempts < 10) {
      try {
        const result = await ai.models.generateContentStream({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: {
            thinkingConfig: { thinkingLevel: 'LOW' } as any,
            temperature: 0.7,
          }
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
        const isRetryable = message.includes('overloaded') || 
                           message.includes('high demand') || 
                           message.includes('unavailable') || 
                           message.includes('quota') ||
                           message.includes('limit') ||
                           code === 503 || code === 429;
        
        if (isRetryable && attempts < 10) {
          const baseDelay = Math.pow(1.5, attempts) * 1000;
          const jitter = Math.random() * 800; // Add jitter to prevent thundering herd
          const delay = baseDelay + jitter;
          console.log(`[AI Retry] Attempt ${attempts}/10, Waiting ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (!res.headersSent) {
          let errorMsg = 'AI Error';
          console.error(`[AI Error] Status: ${code}, Message: ${message}`);
          if (message.includes('api key not valid') || message.includes('api_key_invalid')) {
            errorMsg = '유효하지 않은 API 키입니다. Settings -> Secrets에서 키를 확인해주세요.';
          } else if (message.includes('prepayment credits') || message.includes('billing')) {
            errorMsg = 'AI Studio API 크레딧이 소진되었습니다. 결제 정보를 확인하거나 한도 증액을 검토해주세요.';
          } else if (code === 503 || code === 429) {
            errorMsg = '사용자가 많아 요청이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
          }
          res.status(500).json({ error: errorMsg, details: message });
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
귀하는 현대자동차 리더십 코칭 전문가입니다. 
장황한 분석은 배제하고, 대화의 핵심과 실전 솔루션만 신속하게 도출하여 리포트를 작성하세요.

[시나리오] ${scenario.title} - ${persona.name}
[대화 로그]
${history.map((m: any) => `${m.role === 'user' ? '리더' : '팀원'}: ${m.content}`).join('\n')}

[작성 규칙]
1. 모든 섹션은 핵심만 1~2문장으로 기술하세요.
2. 실전 솔루션 위주로 당장 내일 적용할 수 있는 대체 스크립트를 제공하세요.
3. 반드시 다음 JSON 형식을 100% 준수하세요.

{
  "overall": "리더의 소통 스타일 한 줄 요약 및 총평",
  "psychology": "팀원의 심리 변화 핵심 요약",
  "leadership": "리더십 스타일 진단 (간략히)",
  "needs": "팀원이 원했던 핵심 니즈",
  "strengths": "가장 좋았던 발언 1개 인용 및 이유",
  "improvements": "아쉬웠던 발언 1개 인용 및 이유",
  "actionPlan": {
    "quote": "다음 대화 추천 첫 마디",
    "interviewSkill": "추천 기법 명칭",
    "negativePatterns": [
      {
        "pattern": "반복되는 부정적 화법",
        "actualQuote": "실제 발언",
        "impact": "팀원에게 준 영향",
        "replacementScripts": ["대체 스크립트 1", "대체 스크립트 2"]
      }
    ],
    "practiceScripts": ["연습 스크립트 1", "연습 스크립트 2"],
    "guidelines": ["당장 교정할 습관", "면담 전략"],
    "risk": "소통 스타일 고착 시 리스크"
  }
}
`;

    const ai = getAiClient();
    let attempts = 0;
    while (attempts < 10) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: { 
            responseMimeType: 'application/json', 
            temperature: 0.2,
            thinkingConfig: { thinkingLevel: 'LOW' } as any
          } as any
        });
        
        // Correct text extraction according to @google/genai SDK
        const responseText = result.text || '';
        
        if (!responseText) {
          throw new Error('AI returned an empty response');
        }

        // Robust JSON extraction
        let cleanedJson = responseText;
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedJson = responseText.substring(firstBrace, lastBrace + 1);
        } else {
          cleanedJson = responseText.replace(/```json|```/g, '').trim();
        }

        try {
          return res.json(JSON.parse(cleanedJson));
        } catch (parseError) {
          console.error('JSON Parse Error. Raw text:', responseText);
          throw new Error('AI returned invalid JSON format');
        }
      } catch (innerError: any) {
        attempts++;
        const message = String(innerError.message || '').toLowerCase();
        const code = innerError.status || innerError.code || 0;
        const isRetryable = message.includes('overloaded') || 
                           message.includes('high demand') || 
                           message.includes('unavailable') || 
                           message.includes('quota') ||
                           message.includes('limit') ||
                           code === 503 || code === 429;
        
        if (isRetryable && attempts < 10) {
          const baseDelay = Math.pow(1.5, attempts) * 1500;
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          console.log(`[AI Report Retry] Attempt ${attempts}/10, Waiting ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw innerError;
      }
    }
  } catch (error: any) {
    console.error('Report error:', error);
    const message = String(error.message || '').toLowerCase();
    let userMsg = '리포트 생성에 실패했습니다.';
    if (message.includes('prepayment credits') || message.includes('billing')) {
      userMsg = 'AI Studio API 크레딧이 소진되어 리포트를 생성할 수 없습니다.';
    } else if (message.includes('quota') || message.includes('limit')) {
      userMsg = '요청 한도(Quota)가 초과되었습니다. 잠시 후 다시 시도해주세요.';
    }
    res.status(500).json({ error: userMsg, details: error.message });
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
