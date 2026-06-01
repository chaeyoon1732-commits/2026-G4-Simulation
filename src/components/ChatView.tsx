import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Persona, Scenario, Message, UserProfile, SimulationRecord } from '../types';
import { dbService } from '../services/dbService';
import { 
  Send, 
  ArrowLeft, 
  User, 
  MessageCircle, 
  AlertCircle, 
  RefreshCw, 
  Radar, 
  CheckCircle2, 
  Circle, 
  Lightbulb, 
  Quote,
  FileText 
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar as RadarSeries, 
  ResponsiveContainer 
} from 'recharts';

interface ChatViewProps {
  persona: Persona;
  scenario: Scenario;
  user: UserProfile;
  onExit: () => void;
  onShowReport: (sim: SimulationRecord) => void;
}

export default function ChatView({ persona, scenario, user, onExit, onShowReport }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('초기 대기 중');
  const [metrics, setMetrics] = useState({ rapport: 50, analysis: 30, solution: 10, engagement: 40 });
  const [goals, setGoals] = useState([false, false, false]);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [turnCount, setTurnCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const goalList = [
    "아이스브레이킹 및 감정적 공감 시도",
    "문제의 근본적인 원인 파악 및 현상 공유",
    "구체적인 개선 행동 및 마무리 약속 도출"
  ];

  const guideData = {
    영업: {
      guide: "영업 현장에서는 숫자에 가려진 직원의 감정을 읽어주는 것이 중요합니다. '왜 실적이 안나오나' 보다는 '어떤 점이 힘든지' 먼저 다가가세요.",
      recommend: ["요즘 시장 분위기가 많이 어렵지요?", "박 과장님이 가장 고민인 부분은 무엇인가요?", "함께 해결할 수 있는 방법이 있을지 고민해봅시다."]
    },
    서비스: {
      guide: "엔지니어는 자신의 기술적 자존감을 인정받길 원합니다. 고충을 충분히 경청하고, 센터 전체의 효율성을 위해 그들의 전문성이 필요함을 강조하세요.",
      recommend: ["베테랑으로서 수고가 많으십니다.", "현장의 안전과 효율을 위해 주신 의견 경청하겠습니다.", "팀 전체의 성장을 위해 어떤 지원이 필요할까요?"]
    }
  };

  const currentGuide = persona.division === '영업' ? guideData.영업 : guideData.서비스;

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinish(true); // Auto-finish on timeout
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const startSimulation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            persona,
            scenario,
            history: [] 
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let serverError = '알 수 없는 서버 오류가 발생했습니다.';
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              serverError = errorData.error || serverError;
            } catch (e) {
              serverError = `JSON 파싱 오류 (${response.status})`;
            }
          }
          setMessages([{ role: 'assistant', content: `[오류] ${serverError}`, emotion: '오류', timestamp: Date.now() }]);
          return;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error("Non-JSON response received:", text.substring(0, 500));
          setMessages([{ role: 'assistant', content: `[통신 오류] 서버에서 올바르지 않은 응답이 왔습니다. (HTML/Text 응답 수신됨)`, emotion: '오류', timestamp: Date.now() }]);
          return;
        }

        const data = await response.json();
        
        if (data.error) {
          setMessages([{ role: 'assistant', content: `[오류] ${data.error}`, emotion: '오류', timestamp: Date.now() }]);
          return;
        }

        setMessages([{ role: 'assistant', content: data.content, emotion: data.emotion, timestamp: Date.now() }]);
        setCurrentEmotion(data.emotion);
        if (data.analysis) {
          setMetrics(data.analysis.metrics);
          setGoals(data.analysis.goals);
        }
      } catch (error) {
        console.error('Failed to start chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    startSimulation();
  }, [persona, scenario]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || timeLeft <= 0 || turnCount >= 10) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setTurnCount(prev => prev + 1);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          scenario,
          history: newMessages
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMsg = `서버 오류가 발생했습니다. (Status: ${response.status})`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
            errorMsg = `데이터 형식 오류 (${response.status})`;
          }
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: `[오류] ${errorMsg}`, emotion: '오류', timestamp: Date.now() }]);
        setIsLoading(false);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Non-JSON response in chat submit:", text.substring(0, 500));
        setMessages(prev => [...prev, { role: 'assistant', content: `[통신 오류] 서버 응답이 올바르지 않습니다. (HTML/Text)`, emotion: '오류', timestamp: Date.now() }]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `[오류] ${data.error}`, emotion: '오류', timestamp: Date.now() }]);
        setIsLoading(false);
        return;
      }

      const assistantMessage: Message = { role: 'assistant', content: data.content, emotion: data.emotion, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentEmotion(data.emotion);
      if (data.analysis) {
        setMetrics(data.analysis.metrics);
        setGoals(data.analysis.goals);
      }

      // Explicit completion check at 10 turns
      if (turnCount + 1 >= 10) {
        setTimeout(() => {
          alert('최대 대화 턴(10회)에 도달했습니다. 시뮬레이션을 종료하고 리포트를 확인합니다.');
          handleFinish(true);
        }, 800);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '침묵... (연결 오류가 발생했습니다)', emotion: '당황' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async (isAuto = false) => {
    if (!isAuto && turnCount < 5) {
      alert(`최소 5회 이상의 대화가 필요합니다. (현재: ${turnCount}회)`);
      return;
    }

    setIsGeneratingReport(true);
    let evaluationData = undefined;

    try {
      // Get AI Analysis for the report
      const analysisResponse = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          scenario,
          history: messages
        })
      });

      if (analysisResponse.ok) {
        evaluationData = await analysisResponse.json();
      }
    } catch (err) {
      console.error('Failed to get AI analysis report:', err);
    } finally {
      setIsGeneratingReport(false);
    }

    const simulationData: SimulationRecord = {
      userId: user.uid,
      userEmail: user.email || 'unknown',
      userName: user.displayName || 'Unnamed User',
      userGroup: user.group,
      userAffiliation: user.affiliation,
      personaId: persona.id,
      personaName: persona.name,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      messages,
      finalEmotion: currentEmotion,
      metrics,
      turnCount,
      isCompleted: turnCount >= 5 || isAuto,
      timestamp: Date.now(),
      evaluation: evaluationData
    };

    if (messages.length > 1) {
      try {
        await dbService.saveSimulation(simulationData);
      } catch (err) {
        console.error('Record save error:', err);
      }
    }
    
    if (turnCount >= 5) {
      if (isAuto) {
        alert('면담이 종료되었습니다. 작성된 리포트를 확인합니다.');
      } else {
        alert('시뮬레이션이 종료되었습니다. 면담 리포트를 확인하실 수 있습니다.');
      }
      onShowReport(simulationData);
    } else {
      if (isAuto) {
        alert('면담 시간이 종료되었습니다. (최소 대화 턴 미달)');
      }
      onExit();
    }
  };

  const radarData = React.useMemo(() => [
    { subject: '라포 형성', A: metrics.rapport, fullMark: 100 },
    { subject: '현상 파악', A: metrics.analysis, fullMark: 100 },
    { subject: '해결책 도출', A: metrics.solution, fullMark: 100 },
    { subject: '몰입도', A: metrics.engagement, fullMark: 100 },
  ], [metrics.rapport, metrics.analysis, metrics.solution, metrics.engagement]);

  return (
    <div className="flex h-full p-4 gap-4 bg-slate-50 overflow-hidden">
      {/* Left Sidebar: Analysis */}
      <aside className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto hidden xl:flex">
        <div className="premium-card p-6 bg-white overflow-hidden shrink-0">
          <h2 className="sidebar-label flex items-center gap-2 mb-6">
            <Radar className="w-3.5 h-3.5 text-blue-500" /> 실시간 역량 분석
          </h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" fontSize={10} tick={{ fill: '#64748b', fontWeight: 600 }} stroke="#94a3b8" />
                <RadarSeries
                  name="Metrics"
                  dataKey="A"
                  stroke="#002C5F"
                  strokeWidth={2}
                  fill="#002C5F"
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">현재 감정 상태</span>
            <div className="text-xl font-bold text-red-500 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {currentEmotion}
            </div>
          </div>
        </div>

        <div className="premium-card p-6 bg-white shrink-0">
          <h2 className="sidebar-label flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> 면담 진척도
          </h2>
          <div className="space-y-4">
            {goalList.map((goal, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 ${goals[idx] ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                {goals[idx] ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-5 h-5 border-2 border-slate-200 rounded-full shrink-0 mt-0.5" />
                )}
                <span className={`text-[13px] font-bold leading-snug ${goals[idx] ? 'text-blue-900' : 'text-slate-400'}`}>
                  {goal}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Area (MAXIMIZED) */}
      <section className="flex-1 flex flex-col premium-card overflow-hidden bg-white shadow-2xl relative">
        <AnimatePresence>
          {isGeneratingReport && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 text-center"
            >
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full space-y-8 border border-white/20">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-h-blue/10 border-t-[#002C5F] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-[#002C5F]" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">면담 분석 리포트 생성 중</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-bold">
                    리더님의 면담 발언 데이터와 팀원의 심리 반응을<br/>
                    현대자동차 리더십 전문가 AI가 정밀 분석 중입니다.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-1.5 justify-center">
                    {[0, 1, 2].map((i) => (
                      <motion.span 
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                        className="w-2.5 h-2.5 bg-[#002C5F] rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">Data Analysis in Progress...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-[#002C5F] shadow-inner">
              {persona.id}
            </div>
            <div>
              <div className="text-base font-bold text-slate-800">{persona.name} ({persona.role})</div>
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                {scenario.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
              TURN: {turnCount}/10
            </div>
            <div className={`text-[10px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-2 ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
              TIME: {formatTime(timeLeft)}
            </div>
            <div className="text-[10px] font-bold bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              LIVE RECORDING
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 p-8 space-y-8 overflow-y-auto bg-slate-50/30"
        >
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm transition-transform hover:scale-110 ${
                  m.role === 'user' ? 'bg-[#002C5F] text-white shadow-[#002C5F]/20' : 'bg-white border border-slate-200 text-slate-400'
                }`}>
                  {m.role === 'user' ? <User className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                </div>
                <div className={`shadow-sm border border-slate-100 max-w-[88%] ${
                  m.role === 'user' 
                    ? 'bg-[#002C5F] text-white rounded-2xl rounded-tr-none p-5 lg:p-6' 
                    : 'bg-white text-slate-800 rounded-2xl rounded-tl-none p-5 lg:p-6'
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{m.content}</p>
                  <div className={`text-[9px] mt-3 font-bold opacity-40 uppercase tracking-widest ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 animate-pulse" />
              <div className="bg-white/80 border border-slate-100 p-5 rounded-2xl rounded-tl-none text-sm text-slate-400 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> 
                <span className="font-bold tracking-tight">페르소나가 메시지를 입력 중입니다...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-white">
          <form onSubmit={handleSubmit} className="relative flex items-center mb-6 max-w-5xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="리더로서 신중하게 답변을 입력하세요..."
              disabled={isLoading}
              className="w-full border-2 border-slate-100 rounded-3xl py-5 px-8 pr-32 text-base focus:outline-none focus:border-blue-500 focus:bg-white bg-slate-50/80 transition-all font-bold placeholder:text-slate-300 shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-4 bg-[#002C5F] text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg hover:shadow-xl hover:bg-black transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              전송하기
            </button>
          </form>
          <div className="flex flex-col gap-4 items-center max-w-5xl mx-auto">
            <button 
              onClick={() => handleFinish()}
              className="w-full max-w-md bg-[#002C5F] text-white py-4 rounded-3xl text-sm font-black hover:shadow-2xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              면담 시뮬레이션 종료 및 리포트 확인
            </button>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">대화를 충분히 나누셨다면 위 버튼을 눌러 리포트를 생성하세요</p>
          </div>
        </div>
      </section>

      {/* Right Sidebar: Guide */}
      <aside className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto hidden lg:flex">
        <div className="premium-card p-6 bg-white flex-1 flex flex-col border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
            <div className="p-3 bg-blue-50 rounded-2xl shadow-inner">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">코칭 가이드</h2>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{persona.division} 부문 특화</span>
            </div>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100">
              <h3 className="text-[10px] font-bold text-blue-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                 <Quote className="w-3 h-3" /> Core Insight
              </h3>
              <p className="text-[13px] text-slate-700 leading-relaxed font-bold italic">
                {currentGuide.guide}
              </p>
            </div>

            <div className="px-2">
              <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Protocol Check</h3>
              <ul className="space-y-4">
                {[
                  "상대방의 침묵을 견디고 충분한 생각 시간을 주세요.",
                  "'안된다'는 부정형 보다는 '어떻게'라는 질문을 던지세요.",
                  "일방적인 지시보다는 합의된 목표를 도출하세요."
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-[#002C5F] group-hover:text-white transition-colors">
                      {i + 1}
                    </div>
                    <span className="text-xs text-slate-600 leading-relaxed font-bold">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50">
             <div className="bg-[#002C5F] p-5 rounded-3xl text-white shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
                <h4 className="text-[10px] font-bold text-blue-300 uppercase mb-3 tracking-widest">Target Personnel</h4>
                <div className="text-base font-bold text-white mb-1">{persona.name}</div>
                <div className="text-[11px] font-bold text-blue-200 mb-4 opacity-80">{persona.role} | {persona.mbti}</div>
                <div className="text-[11px] leading-relaxed opacity-60 font-medium italic">
                  "{persona.style}"
                </div>
             </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
