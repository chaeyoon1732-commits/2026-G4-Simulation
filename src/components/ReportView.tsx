import React, { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SimulationRecord } from '../types';
import { 
  Trophy, 
  Target, 
  BarChart3, 
  MessageSquare, 
  Download,
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
  LineChart,
  Line,
  XAxis,
  CartesianGrid
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
      
      const dataUrl = await toPng(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        width: 1200,
        style: {
          borderRadius: '0'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`interview-report-${simulation.userName}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
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

            <div className="col-span-8 bg-white rounded-[2rem] p-10 border-2 border-[#002C5F]/10 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#002C5F] text-white rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black text-[#002C5F]">종합 총평 (Overall Assessment)</h3>
                </div>
              </div>
              
              <p className="text-slate-600 leading-relaxed font-bold text-lg mb-10">
                {simulation.evaluation?.overall || `면담 전반적으로 ${simulation.personaName}님의 심리적 동요를 충분히 해소해주지 못한 채 일방적인 소통이 이뤄진 부분이 관찰됩니다.`}
              </p>

              <div className="grid grid-cols-3 gap-6 mt-auto">
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">발화 비중</div>
                  <div className="text-2xl font-black text-[#002C5F]">{analytics.userRatio}%</div>
                  <div className="text-[10px] font-bold text-slate-400">리더 발화량</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">인터뷰 턴</div>
                  <div className="text-2xl font-black text-[#002C5F]">{simulation.messages.length}</div>
                  <div className="text-[10px] font-bold text-slate-400">총 대화 수</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl">
                  <div className="text-[10px] font-black text-slate-400 uppercase mb-2">목표 달성</div>
                  <div className="text-2xl font-black text-[#002C5F]">{avgScore > 70 ? '2' : '1'} <span className="text-sm">/ 3</span></div>
                  <div className="text-[10px] font-bold text-slate-400">완성도 기준</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 mb-12">
            <div className="col-span-5 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
               <h4 className="text-lg font-black text-[#002C5F] mb-8 flex items-center gap-2">
                 <BarChart3 className="w-5 h-5" /> 역량 분석 (Competency)
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
            </div>

            <div className="col-span-7 flex flex-col gap-6">
                <div className="bg-slate-50/50 rounded-2xl p-6 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-3 text-blue-700">
                      <Brain className="w-5 h-5" />
                      <span className="font-black text-sm">팀원 심리 반응</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold leading-relaxed">
                    {simulation.evaluation?.psychology || `팀원의 현재 상황에 대한 공감적 접근이 필요합니다.`}
                  </p>
                </div>

                <div className="bg-slate-50/50 rounded-2xl p-6 border-l-4 border-emerald-500">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700">
                      <Zap className="w-5 h-5" />
                      <span className="font-black text-sm">리더십 스타일</span>
                  </div>
                  <p className="text-sm text-slate-600 font-bold leading-relaxed">
                    {simulation.evaluation?.leadership || `문제 중심에서 사람 중심으로 대화의 초점을 옮겨보세요.`}
                  </p>
                </div>
            </div>
          </div>

          <div className="bg-[#002C5F]/5 p-12 rounded-[2.5rem] mt-12 mb-12">
            <h3 className="text-2xl font-black text-[#002C5F] mb-10 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-500" /> 액션 플랜 (Action Plan)
            </h3>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-[#002C5F]">핵심 스킬</h4>
                </div>
                <p className="text-sm text-slate-600 font-bold">
                  {simulation.evaluation?.actionPlan?.interviewSkill || '적극적 경청 및 개방형 질문'}
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-[#002C5F]">가이드라인</h4>
                </div>
                <p className="text-sm text-slate-600 font-bold">
                  {simulation.evaluation?.actionPlan?.guidelines?.join(', ') || '샌드위치 피드백, 7:3 경청 원칙'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t-2 border-slate-100">
            <h3 className="text-2xl font-black text-[#002C5F] mb-8 flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-blue-500" /> 면담 대화 기록 (History)
            </h3>
            
            <div className="space-y-6">
              {simulation.messages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${m.role === 'user' ? 'bg-[#002C5F] text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {m.role === 'user' ? 'Leader' : 'Member'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold truncate">
                      {new Date(m.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed font-medium max-w-[85%] border ${
                    m.role === 'user' 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 rounded-tr-none' 
                      : 'bg-white border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="mt-12 text-center">
           <button 
              onClick={onRestart}
              className="px-12 py-5 bg-[#002C5F] text-white rounded-2xl font-black text-xl hover:shadow-2xl transition-all shadow-xl inline-flex items-center gap-3"
            >
              새로운 시뮬레이션 시작하기
            </button>
        </div>
      </div>
    </div>
  );
}
