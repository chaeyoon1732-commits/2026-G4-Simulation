import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SimulationRecord } from '../types';
import { 
  Trophy, 
  Target, 
  BarChart3, 
  MessageSquare, 
  Undo2,
  Download,
  PieChart as PieChartIcon,
  TrendingUp,
  Brain,
  Zap,
  Lightbulb,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface ReportViewProps {
  simulation: SimulationRecord;
  onRestart: () => void;
}

export default function ReportView({ simulation, onRestart }: ReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const avgScore = Math.round((simulation.metrics.rapport + simulation.metrics.analysis + simulation.metrics.solution + simulation.metrics.engagement) / 4);
  
  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 70) return { grade: 'B', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (score >= 60) return { grade: 'C', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const gradeInfo = getGrade(avgScore);

  const analytics = useMemo(() => {
    const userMessages = simulation.messages.filter(m => m.role === 'user');
    const aiMessages = simulation.messages.filter(m => m.role === 'assistant');
    
    const userChars = userMessages.reduce((acc, m) => acc + m.content.length, 0);
    const aiChars = aiMessages.reduce((acc, m) => acc + m.content.length, 0);
    const totalChars = (userChars + aiChars) || 1;
    
    const userRatio = Math.round((userChars / totalChars) * 100);

    const safetyTrend = simulation.messages.map((m, idx) => {
      // Simulate safety trend based on emotion and turns
      let safety = 50 + (idx * 5);
      if (['당황', '억울', '서운'].includes(m.emotion || '')) safety -= 15;
      if (['감동', '신뢰', '안심'].includes(m.emotion || '')) safety += 20;
      return { turn: idx + 1, level: Math.min(100, Math.max(0, safety)) };
    });

    return { 
      userRatio, 
      safetyTrend, 
      userChars, 
      aiChars,
      aiTurnCount: aiMessages.length,
      userTurnCount: userMessages.length
    };
  }, [simulation.messages]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setIsDownloading(true);
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`interview-report-${simulation.userName}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const radarData = [
    { subject: '라포 형성', A: simulation.metrics.rapport },
    { subject: '현상 파악', A: simulation.metrics.analysis },
    { subject: '해결책 도출', A: simulation.metrics.solution },
    { subject: '몰입도', A: simulation.metrics.engagement },
  ];

  return (
    <div className="h-full mt-2 overflow-y-auto bg-slate-50">
      {/* Dynamic Header Toolbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-50 shadow-sm" data-html2canvas-ignore="true">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-[#002C5F] flex items-center gap-2">
            <span className="p-2 bg-[#002C5F] text-white rounded-lg"><LayoutDashboard className="w-5 h-5" /></span>
            Report Preview
          </h2>
          <div className="h-4 w-px bg-slate-200"></div>
          <p className="text-sm font-bold text-slate-500">{simulation.userName} 리더 - {simulation.scenarioTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
          >
            대시보드
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-2 bg-[#002C5F] text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} /> 
            {isDownloading ? '생성 중...' : 'PDF 저장'}
          </button>
          <button 
            onClick={onRestart}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto pt-24 pb-20 px-8">
        <div ref={reportRef} id="report-screen" className="bg-white p-12 shadow-xl border border-slate-100 rounded-lg min-h-[1400px]">
          
          {/* Main Title Section */}
          <div className="border-b-2 border-slate-100 pb-10 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black text-[#002C5F] tracking-tight mb-3">면담 시뮬레이션 결과 리포트 📊</h1>
              <div className="flex items-center gap-3 text-slate-500 font-bold text-lg">
                <span>{simulation.personaName} {simulation.userGroup}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>{simulation.scenarioTitle}</span>
              </div>
            </div>
            <div className="text-right text-slate-400 text-sm font-bold">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            {/* OVERALL SCORE Card */}
            <div className="col-span-4 bg-slate-50 rounded-[2rem] p-10 flex flex-col items-center justify-center border border-slate-100 shadow-sm relative overflow-hidden">
               <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">OVERALL SCORE</div>
               <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                    <circle cx="96" cy="96" r="88" stroke="#002C5F" strokeWidth="12" fill="none" 
                            strokeDasharray={552} 
                            strokeDashoffset={552 - (552 * avgScore) / 100}
                            strokeLinecap="round" 
                            className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-6xl font-black text-[#002C5F]">{avgScore}</span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                  </div>
               </div>
               <div className={`text-7xl font-black ${gradeInfo.color} mb-3`}>{gradeInfo.grade}</div>
               <div className="text-sm font-bold text-slate-400">종합 등급</div>
               <Trophy className="absolute top-6 right-6 w-8 h-8 text-slate-200" />
            </div>

            {/* Assessment Summary */}
            <div className="col-span-8 bg-white rounded-[2rem] p-10 border-2 border-[#002C5F]/10 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#002C5F] text-white rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-[#002C5F]">종합 총평 (Overall Assessment)</h3>
                </div>
                <span className="px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-xs font-black border border-orange-100">
                  {avgScore >= 80 ? '적극적 문제해결 코칭' : '수동적 관찰형 코칭'}
                </span>
              </div>
              
              <p className="text-slate-600 leading-relaxed font-bold text-lg mb-10">
                {simulation.evaluation?.overall || `면담 전반적으로 ${simulation.personaName}님의 심리적 동요를 충분히 해소해주지 못한 채, ${avgScore < 60 ? '형식적인 응답 위주로 대화가 단절되는 양상을 보였습니다.' : '적절한 공감을 바탕으로 대화를 이끌어 나갔으나 구체적인 실행 계획 수립에 아쉬움이 있습니다.'} 리더의 적극적인 경청과 구체적인 가이드가 병행된다면 다음 면담에서는 더 높은 몰입도를 이끌어낼 수 있을 것입니다.`}
              </p>

              <div className="grid grid-cols-3 gap-6 mt-auto">
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">발화 비중</div>
                  <div className="text-2xl font-black text-[#002C5F]">{analytics.userRatio}%</div>
                  <div className="text-[10px] font-bold text-slate-400">리더 발화량</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">핵심 키워드</div>
                  <div className="text-sm font-black text-[#002C5F]">#공감 #존중 #계획</div>
                  <div className="text-[10px] font-bold text-slate-400">체크리스트 완료</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">목표 달성</div>
                  <div className="text-2xl font-black text-[#002C5F]">{avgScore > 70 ? '2' : '1'} <span className="text-sm">/ 3</span></div>
                  <div className="text-[10px] font-bold text-slate-400">완성도 기준</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-8">
            {/* Quantitative Analysis Card */}
            <div className="col-span-5 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
               <h4 className="text-lg font-black text-[#002C5F] mb-8 flex items-center gap-2">
                 <BarChart3 className="w-5 h-5" /> 정량적 분석 (Quantitative)
               </h4>
               <div className="h-64 mb-10">
                 <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                     <PolarGrid stroke="#e2e8f0" />
                     <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} />
                     <Radar name="Score" dataKey="A" stroke="#002C5F" strokeWidth={3} fill="#002C5F" fillOpacity={0.15} />
                   </RadarChart>
                 </ResponsiveContainer>
               </div>
               
               <div className="border-t border-slate-50 pt-8">
                 <h5 className="text-xs font-black text-slate-400 uppercase mb-4">심리적 안전감 변화 추이</h5>
                 <div className="h-32">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={analytics.safetyTrend}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <Line type="monotone" dataKey="level" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                     </LineChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>

            {/* Qualitative Details Column */}
            <div className="col-span-7 flex flex-col gap-6">
               <div className="bg-slate-50/50 rounded-2xl p-6 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-3 text-blue-700">
                     <Brain className="w-5 h-5" />
                     <span className="font-black text-sm">팀원 심리 반응 분석</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold leading-relaxed">
                    {simulation.evaluation?.psychology || `팀원은 리더의 반복되는 질문에 자신의 상황이 제대로 전달되지 않는다고 느껴 다소 냉소적인 반응을 보였습니다. 특히 침묵을 긍정의 의미보다는 '부담 시그널'로 오해할 수 있는 소지가 관찰되었습니다.`}
                  </p>
               </div>

                <div className="bg-slate-50/50 rounded-2xl p-6 border-l-4 border-emerald-500">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700">
                     <Zap className="w-5 h-5" />
                     <span className="font-black text-sm">리더십 스타일 진단</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold leading-relaxed">
                    {simulation.evaluation?.leadership || `문제 중심의 질문 방식은 명확한 현상 파악에 도움이 되지만, ${simulation.personaName}님 같은 관계 지향형 팀원에게는 압박감으로 작용했습니다. '비판'보다는 '지원' 중심의 언어 변환이 필요합니다.`}
                  </p>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-6 border-l-4 border-indigo-500">
                  <div className="flex items-center gap-2 mb-3 text-indigo-700">
                     <Target className="w-5 h-5" />
                     <span className="font-black text-sm">팀원 니즈 파악 (Needs Identification)</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold leading-relaxed">
                     {simulation.evaluation?.needs || `단위 업무량에 대한 불만보다는 '동료와의 형평성'과 '미래 역량 개발'에 대한 불안이 핵심 요구사항으로 파악됩니다. 이에 대한 명확한 지지 발언이 필요합니다.`}
                  </p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100">
               <h4 className="text-emerald-700 font-black mb-4 flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5" /> 소통상의 강점 (Strengths)
               </h4>
               <p className="text-emerald-800/80 text-sm font-bold leading-relaxed">
                 {simulation.evaluation?.strengths || `팀원이 스스로의 문제점에 대해 솔직하게 고백할 때 끝까지 말을 끊지 않고 경청한 점은 매우 훌륭한 라포 형성의 기초가 되었습니다.`}
               </p>
            </div>
            <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100">
               <h4 className="text-orange-700 font-black mb-4 flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5" /> 개선 포인트 (Improvements)
               </h4>
               <p className="text-orange-800/80 text-sm font-bold leading-relaxed">
                 {simulation.evaluation?.improvements || `결론을 조급하게 내리려 하기보다, 상대방의 질문에 역질문을 통해 스스로 해답을 찾게 하는 '코칭적 대화'의 비중을 높여야 합니다.`}
               </p>
            </div>
          </div>

          {/* Actionable Insights Footer */}
          <div className="bg-[#002C5F]/5 p-12 rounded-[2.5rem]">
            <h3 className="text-2xl font-black text-[#002C5F] mb-10 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-500" /> 실전 가이드 및 액션 플랜 (Actionable Insights)
            </h3>
            
            <div className="grid grid-cols-3 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase">
                  <FileText className="w-4 h-4" /> 추천 대화 예시
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 italic text-slate-500 text-sm leading-relaxed shadow-sm quote-card relative font-bold">
                  "{simulation.evaluation?.actionPlan.quote || `${simulation.personaName}씨, 요즘 바쁜 일정 속에서도 묵묵히 제 역할을 해주고 있어 든든해요. 혹시 업무 배분에서 제가 놓치고 있는 부분이 있다면 편하게 말해주세요.`}"
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase">
                  <UserCheck className="w-4 h-4" /> 리더십 행동 가이드
                </div>
                <ul className="space-y-3">
                  {(simulation.evaluation?.actionPlan.guidelines || ['샌드위치 피드백 사용', '7:3 경청 원칙 준수', 'Open-ended 질문 최소 1회']).map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 text-sm font-bold">
                       <span className="w-1.5 h-1.5 bg-[#002C5F] rounded-full"></span>
                       {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase">
                  <AlertTriangle className="w-4 h-4" /> 리스크 관리 방안
                </div>
                <p className="text-slate-500 text-sm leading-relaxed font-bold">
                  {simulation.evaluation?.actionPlan.risk || `팀원의 무미건조한 반응이 3회 이상 지속될 경우, 팀원은 리더가 자신에게 관심이 없거나 포기했다고 판단하여 이탈 의사가 생길 수 있습니다. 적극적인 비언어적 표현(고개 끄덕임, 눈맞춤)과 언어적 피드백으로 신뢰를 회복해야 합니다.`}
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-12 text-center" data-html2canvas-ignore="true">
           <p className="text-slate-400 font-bold mb-6">이 결과는 기록되어 향후 실습 결과와 비주얼 대시보드에서 비교 분석할 수 있습니다.</p>
           <button 
              onClick={onRestart}
              className="px-12 py-5 bg-[#002C5F] text-white rounded-2xl font-black text-xl hover:shadow-2xl transition-all active:scale-95 shadow-xl inline-flex items-center gap-3"
            >
              새로운 시뮬레이션 시작하기
            </button>
        </div>
      </div>
    </div>
  );
}
