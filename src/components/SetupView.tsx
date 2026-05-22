import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/dbService';
import { Division, Persona, Scenario } from '../types';
import { User, Briefcase, ChevronRight, Layers, MessageSquare, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface SetupViewProps {
  onStart: (division: Division, persona: Persona, scenario: Scenario) => void;
}

export default function SetupView({ onStart }: SetupViewProps) {
  const [step, setStep] = useState<'persona' | 'category' | 'scenario'>('persona');
  const [division, setDivision] = useState<Division>('영업');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // We rely on fallback in dbService if fetch fails
        const [pData, sData] = await Promise.all([
          dbService.getPersonas(),
          dbService.getScenarios()
        ]);
        setPersonas(pData);
        setScenarios(sData);
      } catch (err: any) {
        console.error('SetupView Data fetch error:', err);
        // If we failed even with mock data (unlikely), show error
        if (personas.length === 0) {
          setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPersonas = personas.filter(p => p.division === division);
  const categories = Array.from(new Set(scenarios.map(s => s.category)));
  const filteredScenarios = scenarios.filter(s => s.category === selectedCategory);

  const handleStart = () => {
    if (selectedPersona && selectedScenario) {
      onStart(division, selectedPersona, selectedScenario);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#002C5F] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <span className="mt-6 text-slate-500 font-bold tracking-widest text-sm uppercase">Ochestrating Simulation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 max-w-md shadow-2xl">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-bold text-xl mb-2">시스템 오류</h3>
          <p className="text-sm opacity-90 mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white px-6 py-4 rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg active:scale-95 transition-all"
          >
            데이터 동기화 재시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top Stepper */}
      <div className="bg-white border-b border-slate-200 px-12 py-6 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className={`flex items-center gap-3 transition-opacity ${step === 'persona' ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'persona' ? 'bg-[#002C5F] text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>1</div>
              <span className="font-bold text-sm text-slate-700">대상 페르소나</span>
            </div>
            <div className="w-8 h-px bg-slate-200"></div>
            <div className={`flex items-center gap-3 transition-opacity ${step === 'category' ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'category' ? 'bg-[#002C5F] text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>2</div>
              <span className="font-bold text-sm text-slate-700">상황 유형</span>
            </div>
            <div className="w-8 h-px bg-slate-200"></div>
            <div className={`flex items-center gap-3 transition-opacity ${step === 'scenario' ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'scenario' ? 'bg-[#002C5F] text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>3</div>
              <span className="font-bold text-sm text-slate-700">세부 시나리오</span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-end justify-center px-4 border-r border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Context</span>
              <div className="text-xs font-bold text-blue-600">
                {selectedPersona ? `${selectedPersona.name} (${selectedPersona.role})` : '미선택'}
              </div>
            </div>
            {selectedPersona && selectedScenario ? (
              <button
                onClick={handleStart}
                className="bg-[#002C5F] text-white px-8 py-3 rounded-xl font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                시뮬레이션 시작 <MessageSquare className="w-4 h-4" />
              </button>
            ) : (
              <div className="bg-slate-100 text-slate-400 px-8 py-3 rounded-xl font-bold border border-slate-200 cursor-not-allowed">
                항목을 선택해주세요
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Selection Area */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 'persona' ? (
              <motion.div 
                key="persona"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-4xl font-bold text-[#002C5F] mb-4 tracking-tight">대화 타겟을 선택하세요</h2>
                    <p className="text-slate-500 text-lg">면담 역량을 실습할 가장 적합한 페르소나를 선택하십시오.</p>
                  </div>
                  
                  <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                    {(['영업', '서비스'] as Division[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDivision(d);
                          setSelectedPersona(null);
                        }}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          division === d 
                            ? 'bg-[#002C5F] text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {d}부문
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredPersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPersona(p);
                        setStep('category');
                      }}
                      className={`text-left p-8 bg-white rounded-3xl border transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-95 group ${
                        selectedPersona?.id === p.id 
                          ? 'border-blue-500 ring-4 ring-blue-500/10' 
                          : 'border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-colors group-hover:bg-[#002C5F] group-hover:text-white ${selectedPersona?.id === p.id ? 'bg-[#002C5F] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {p.id}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] px-2 py-1 bg-slate-100 rounded font-bold text-slate-500 mb-1">{p.mbti}</span>
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{p.division} Expertise</span>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-800 mb-1">{p.name} <span className="text-lg font-normal text-slate-400">{p.role}</span></div>
                      <div className="text-sm font-bold text-blue-600 mb-4">{p.age}세 | {p.trait.split(',')[0]}</div>
                      <div className="text-xs text-slate-600 leading-relaxed italic line-clamp-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                        "{p.style}"
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : step === 'category' ? (
              <motion.div 
                key="category"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10 flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-bold text-[#002C5F] mb-4 tracking-tight">상황 유형을 선택하세요</h2>
                    <p className="text-slate-500 text-lg">실행하고자 하는 면담의 성격을 먼저 지정하십시오.</p>
                  </div>
                  <button 
                    onClick={() => setStep('persona')}
                    className="flex items-center gap-2 text-[#002C5F] font-bold hover:underline mb-2 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> 이전 단계
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setStep('scenario');
                      }}
                      className="p-10 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-500 transition-all text-center group active:scale-95"
                    >
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto mb-6 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Layers className="w-8 h-8" />
                      </div>
                      <div className="text-xl font-bold text-slate-800">{cat}</div>
                      <div className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Select Category</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="scenario"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10 flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-bold text-[#002C5F] mb-4 tracking-tight">세부 시나리오를 선택하세요</h2>
                    <p className="text-slate-500 text-lg">[{selectedCategory}] 카테고리의 실전 시나리오입니다.</p>
                  </div>
                  <button 
                    onClick={() => setStep('category')}
                    className="flex items-center gap-2 text-[#002C5F] font-bold hover:underline mb-2 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> 이전 단계
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                  {filteredScenarios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScenario(s)}
                      className={`text-left p-8 bg-white rounded-3xl border transition-all hover:shadow-2xl hover:scale-[1.01] active:scale-95 ${
                        selectedScenario?.id === s.id 
                          ? 'border-blue-500 ring-4 ring-blue-500/10' 
                          : 'border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-blue-600 mb-2 uppercase tracking-widest underline decoration-blue-200">
                        {s.category}
                      </div>
                      <div className="text-2xl font-bold text-slate-800 mb-4">{s.title}</div>
                      <p className="text-sm text-slate-500 leading-relaxed border-t pt-5">
                        {s.description}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
