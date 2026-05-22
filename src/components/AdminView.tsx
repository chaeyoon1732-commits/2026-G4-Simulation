import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { dbService } from '../services/dbService';
import { Persona, Scenario, SimulationRecord } from '../types';
import { 
  Users, 
  Briefcase, 
  BarChart3, 
  Download, 
  Trash2, 
  Plus, 
  Save, 
  X,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Loader2,
  Maximize2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ReportView from './ReportView';

export default function AdminView() {
  const [tab, setTab] = useState<'dashboard' | 'personas' | 'scenarios'>('dashboard');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [simulations, setSimulations] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationRecord | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, s, sim] = await Promise.all([
        dbService.getPersonas(),
        dbService.getScenarios(),
        dbService.getSimulations()
      ]);
      setPersonas(p);
      setScenarios(s);
      setSimulations(sim);
    } catch (err: any) {
      console.error('Admin fetch error:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const data = simulations.map(s => ({
      날짜: new Date(s.timestamp?.toDate()).toLocaleString(),
      사용자: s.userName,
      이메일: s.userEmail,
      대상: s.personaName,
      상황: s.scenarioTitle,
      마지막감정: s.finalEmotion,
      메시지수: s.messages.length
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Simulation_History");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(fileData, `현대자동차_시뮬레이션_기록_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Dashboard calculations
  const personaStats = personas.map(p => ({
    name: p.name,
    count: simulations.filter(s => s.personaId === p.id).length
  }));

  const divisionStats = [
    { name: '영업', value: simulations.filter(s => personas.find(p => p.id === s.personaId)?.division === '영업').length },
    { name: '서비스', value: simulations.filter(s => personas.find(p => p.id === s.personaId)?.division === '서비스').length },
  ];

  const scoreStats = [
    { name: '90점대', value: simulations.filter(s => {
      const avg = s.metrics ? (s.metrics.rapport + s.metrics.analysis + s.metrics.solution + s.metrics.engagement) / 4 : 0;
      return avg >= 90;
    }).length },
    { name: '80점대', value: simulations.filter(s => {
      const avg = s.metrics ? (s.metrics.rapport + s.metrics.analysis + s.metrics.solution + s.metrics.engagement) / 4 : 0;
      return avg >= 80 && avg < 90;
    }).length },
    { name: '70점대', value: simulations.filter(s => {
      const avg = s.metrics ? (s.metrics.rapport + s.metrics.analysis + s.metrics.solution + s.metrics.engagement) / 4 : 0;
      return avg >= 70 && avg < 80;
    }).length },
    { name: '60점대 이하', value: simulations.filter(s => {
      const avg = s.metrics ? (s.metrics.rapport + s.metrics.analysis + s.metrics.solution + s.metrics.engagement) / 4 : 0;
      return avg < 70;
    }).length },
  ];

  const COLORS = ['#002C5F', '#007FA8', '#E4DCD3', '#64748B'];
  const SCORE_COLORS = ['#16a34a', '#2563eb', '#ca8a04', '#dc2626'];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Sub Header */}
      <div className="bg-white border-b px-8 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-8">
          <h2 className="text-xl font-bold text-h-blue">관리자 컨트롤 센터</h2>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'dashboard', label: '대시보드', icon: BarChart3 },
              { id: 'personas', label: '페르소나 관리', icon: Users },
              { id: 'scenarios', label: '시나리오 관리', icon: Briefcase },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  tab === t.id ? 'bg-white text-h-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-green-700 transition-all"
        >
          <Download className="w-4 h-4" />
          데이터 엑셀 다운로드
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-h-blue mb-4" />
            <span className="text-slate-500 font-bold">오케스트레이션 활성화 중...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-red-600">
            <h3 className="font-bold text-lg mb-2">관리자 데이터 로드 실패</h3>
            <p className="text-sm opacity-90 mb-6">{error}</p>
            <button 
              onClick={fetchData}
              className="bg-h-blue text-white px-6 py-2 rounded-lg font-bold text-sm"
            >
              다시 불러오기
            </button>
          </div>
        ) : tab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: '전체 시뮬레이션', value: simulations.length, icon: MessageSquare, color: 'text-blue-600' },
                { label: '활성 사용자', value: new Set(simulations.map(s => s.userId)).size, icon: Users, color: 'text-green-600' },
                { label: '등록 페르소나', value: personas.length, icon: TrendingUp, color: 'text-purple-600' },
                { label: '등록 시나리오', value: scenarios.length, icon: Briefcase, color: 'text-orange-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Realtime</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-h-blue" /> 페르소나별 선택 비중
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={personaStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" fill="#002C5F" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-h-active" /> 점수대별 분포
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={scoreStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {scoreStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SCORE_COLORS[index % SCORE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-slate-500">
                {scoreStats.map((s, idx) => (
                  <div key={s.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SCORE_COLORS[idx] }}></span>
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-4 h-4 text-h-blue" /> 부문별 진행 비중
              </h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={divisionStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {divisionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#002C5F] rounded-full"></span> 영업</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#007FA8] rounded-full"></span> 서비스</div>
              </div>
            </div>

            {/* Recent History Table */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">최근 시뮬레이션 로그</h3>
                <span className="text-[10px] text-slate-400 font-mono">Real-time Feed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-3">일시</th>
                      <th className="px-6 py-3">사용자 / 소속 / 지점</th>
                      <th className="px-6 py-3">대화 상대 / 상황</th>
                      <th className="px-6 py-3 text-center">턴 / 점수 (Avg)</th>
                      <th className="px-6 py-3">감정 / 상태</th>
                      <th className="px-6 py-3">동작</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {simulations.slice(0, 20).map((sim) => {
                      const avgScore = sim.metrics ? Math.round((sim.metrics.rapport + sim.metrics.analysis + sim.metrics.solution + sim.metrics.engagement) / 4) : 0;
                      return (
                        <tr key={sim.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium text-slate-400">
                            {sim.timestamp?.toDate ? new Date(sim.timestamp.toDate()).toLocaleString() : 'Just now'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{sim.userName}</div>
                            <div className="text-[10px] text-blue-600 font-bold">{sim.userAffiliation} / {sim.userGroup}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-h-blue">{sim.personaName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{sim.scenarioTitle}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-slate-700">{sim.turnCount || sim.messages.length} Turns</div>
                            <div className={`text-lg font-black ${avgScore > 70 ? 'text-green-600' : avgScore > 40 ? 'text-orange-500' : 'text-red-500'}`}>
                              {avgScore}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] w-fit">
                                {sim.finalEmotion}
                              </span>
                              {sim.isCompleted ? (
                                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-lg font-bold text-[10px] w-fit">
                                  COMPLETED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] w-fit">
                                  DROPPED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => setSelectedSimulation(sim)}
                              className="text-slate-400 hover:text-h-blue p-2 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 capitalize">{tab === 'personas' ? '페르소나 리스트' : '시나리오 리스트'}</h3>
              <button 
                onClick={() => {
                  setEditingId('new');
                  setEditData(tab === 'personas' ? { division: '영업' } : {});
                }}
                className="bg-h-blue text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                새로운 항목 추가
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(tab === 'personas' ? personas : scenarios).map((item: any) => (
                <div key={item.id} className="border p-4 rounded-lg flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">{item.name || item.title} <span className="text-xs font-normal text-slate-400">({item.id})</span></div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.trait || item.description}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingId(item.id);
                        setEditData({...item});
                      }}
                      className="p-2 text-slate-400 hover:bg-slate-100 rounded"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm('정말 삭제하시겠습니까?')) {
                          if (tab === 'personas') await dbService.deletePersona(item.id);
                          else await dbService.deleteScenario(item.id);
                          fetchData();
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal (Simplified) */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h4 className="font-bold text-h-blue">항목 편집 / 추가</h4>
              <button onClick={() => setEditingId(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
              {tab === 'personas' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">ID (Unique)</label>
                      <input 
                        type="text" 
                        value={editData.id || ''}
                        placeholder="예: P1" 
                        className="w-full p-3 border rounded-lg text-sm bg-slate-50"
                        onChange={e => setEditData({...editData, id: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">성함</label>
                      <input 
                        type="text" 
                        value={editData.name || ''}
                        placeholder="예: 홍길동" 
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">부문</label>
                      <select 
                        value={editData.division || '영업'}
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, division: e.target.value})}
                      >
                        <option value="영업">영업</option>
                        <option value="서비스">서비스</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">직급</label>
                      <input 
                        type="text" 
                        value={editData.role || ''}
                        placeholder="예: 과장" 
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, role: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">연령</label>
                      <input 
                        type="number" 
                        value={editData.age || ''}
                        placeholder="예: 35" 
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, age: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">MBTI</label>
                      <input 
                        type="text" 
                        value={editData.mbti || ''}
                        placeholder="예: ISTJ" 
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, mbti: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">주요 특징 (Trait)</label>
                    <textarea 
                      value={editData.trait || ''}
                      placeholder="페르소나의 성격이나 현재 처한 상황적 특징" 
                      className="w-full p-3 border rounded-lg text-sm h-20"
                      onChange={e => setEditData({...editData, trait: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">말투 및 스타일 (Style)</label>
                    <textarea 
                      value={editData.style || ''}
                      placeholder="대화 시 주로 사용하는 어조나 표현 방식" 
                      className="w-full p-3 border rounded-lg text-sm h-20"
                      onChange={e => setEditData({...editData, style: e.target.value})}
                    ></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">ID (Unique)</label>
                      <input 
                        type="text" 
                        value={editData.id || ''}
                        placeholder="예: S1" 
                        className="w-full p-3 border rounded-lg text-sm bg-slate-50"
                        onChange={e => setEditData({...editData, id: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">카테고리</label>
                      <input 
                        type="text" 
                        value={editData.category || ''}
                        placeholder="예: 성과/평가 면담" 
                        className="w-full p-3 border rounded-lg text-sm"
                        onChange={e => setEditData({...editData, category: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">시나리오 제목</label>
                    <input 
                      type="text" 
                      value={editData.title || ''}
                      placeholder="시나리오를 한 줄로 요약하는 제목" 
                      className="w-full p-3 border rounded-lg text-sm"
                      onChange={e => setEditData({...editData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">상세 시나리오 설명</label>
                    <textarea 
                      value={editData.description || ''}
                      placeholder="면담의 배경이 되는 상세한 갈등 상황 설명" 
                      className="w-full p-3 border rounded-lg text-sm h-40"
                      onChange={e => setEditData({...editData, description: e.target.value})}
                    ></textarea>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setEditingId(null)} className="px-6 py-2 rounded font-bold text-slate-500">취소</button>
              <button 
                onClick={async () => {
                  if (tab === 'personas') await dbService.savePersona(editData as Persona);
                  else await dbService.saveScenario(editData as Scenario);
                  setEditingId(null);
                  fetchData();
                }}
                className="bg-h-active text-white px-8 py-2 rounded font-bold"
              >
                저장하기
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Simulation Detail Modal */}
      {selectedSimulation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col pt-10">
          <div className="flex-1 bg-white rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
            <div className="absolute top-6 right-10 z-[110]">
              <button 
                onClick={() => setSelectedSimulation(null)}
                className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-all shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
               <ReportView simulation={selectedSimulation} onRestart={() => setSelectedSimulation(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
