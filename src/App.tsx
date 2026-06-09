import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import SetupView from './components/SetupView';
import ChatView from './components/ChatView';
import LoginView from './components/LoginView';
import AdminView from './components/AdminView';
import ReportView from './components/ReportView';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { Division, Persona, Scenario, UserProfile, SimulationRecord } from './types';
import { LogOut, ShieldCheck, User as UserIcon, Settings, Cloud, CloudOff } from 'lucide-react';
import { dbService } from './services/dbService';

const ADMIN_PASSWORD = '6927376';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [publicAccess, setPublicAccess] = useState(false);
  const [step, setStep] = useState<'setup' | 'chat' | 'admin' | 'report' | 'admin-login'>('setup');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [lastSimulation, setLastSimulation] = useState<SimulationRecord | null>(null);

  useEffect(() => {
    // Check local storage for session
    try {
      const savedUser = localStorage.getItem('simulation_user');
      if (savedUser && savedUser !== 'undefined') {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn('Failed to parse saved user from localStorage', e);
      localStorage.removeItem('simulation_user');
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Check if we have manually entered user info in localStorage
      let savedUser = null;
      try {
        const savedUserStr = localStorage.getItem('simulation_user');
        savedUser = savedUserStr && savedUserStr !== 'undefined' ? JSON.parse(savedUserStr) as UserProfile : null;
      } catch (e) {
        console.warn('Failed to parse saved user during auth state change', e);
      }

      if (firebaseUser) {
        // If we have a saved user and the IDs match, don't overwrite with generic info
        if (savedUser && savedUser.uid === firebaseUser.uid) {
          setUser(savedUser);
        } else {
          // If IDs don't match or no saved user, use Firebase Auth info
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || (savedUser?.uid === firebaseUser.uid ? savedUser.displayName : 'Guest User'),
            email: firebaseUser.email || '',
            affiliation: savedUser?.uid === firebaseUser.uid ? savedUser.affiliation : '현대자동차',
            group: savedUser?.uid === firebaseUser.uid ? savedUser.group : '1',
            isAdmin: firebaseUser.email === 'chaeyoon1732@gmail.com' || firebaseUser.email?.endsWith('@hyundai.com'),
            photoURL: firebaseUser.photoURL
          };
          setUser(profile);
          localStorage.setItem('simulation_user', JSON.stringify(profile));
        }
      } else {
        // Not signed in to Firebase
        setUser(null);
        localStorage.removeItem('simulation_user');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Database initialization side effect
  useEffect(() => {
    const initDb = async () => {
      if (!loading && user && auth.currentUser) {
        try {
          await dbService.testConnection();
          setDbConnected(true);
          dbService.syncInitialData();
        } catch (err) {
          setDbConnected(false);
        }
      }
    };
    initDb();
  }, [user?.uid, loading]);

  const handleLogin = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('simulation_user', JSON.stringify(newUser));
  };

  const handleCodeLogin = async (code: string) => {
    if (code === ADMIN_PASSWORD) {
      try {
        const result = await signInAnonymously(auth);
        const guestUser: UserProfile = {
          uid: result.user.uid,
          displayName: 'Guest Leader',
          email: 'guest@simulation.local',
          affiliation: '현대자동차',
          group: 'Guest',
          isAdmin: true, // Special case for master passcode
          photoURL: null,
        };
        handleLogin(guestUser);
        return true;
      } catch (e) {
        console.error('Anonymous auth error:', e);
        return false;
      }
    }
    return false;
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('simulation_user');
    setUser(null);
  };

  const handleStartSimulation = (division: Division, persona: Persona, scenario: Scenario) => {
    setSelectedPersona(persona);
    setSelectedScenario(scenario);
    setStep('chat');
  };

  const handleExitSimulation = () => {
    setStep('setup');
    setSelectedPersona(null);
    setSelectedScenario(null);
    setLastSimulation(null);
  };

  const handleShowReport = (sim: SimulationRecord) => {
    setLastSimulation(sim);
    setStep('report');
  };

  const handleEnterAdmin = () => {
    setStep('admin-login');
  };

  const handleAdminAuth = async (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setStep('admin');
      // Update public access setting in DB when admin logs in
      try {
        await dbService.updateSettings({ publicAccess: true });
        setPublicAccess(true);
      } catch (err) {
        console.error('Failed to update public access setting:', err);
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    const checkSettings = async () => {
      const settings = await dbService.getSettings();
      setPublicAccess(settings.publicAccess);
    };
    if (dbConnected) {
      checkSettings();
    }
  }, [dbConnected]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-h-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-h-blue"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} onCodeLogin={handleCodeLogin} publicAccess={publicAccess} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Integrated Top Header */}
      <header className="h-20 bg-[#002C5F] text-white flex items-center justify-between px-8 shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <div className="w-4 h-0.5 bg-blue-300 mb-1"></div>
              <div className="w-4 h-0.5 bg-blue-300"></div>
            </div>
            <span className="font-bold text-sm tracking-tight text-white/90">G4 Emerging LEADER</span>
          </div>

          <nav className="flex items-center gap-2">
            <button 
              onClick={() => setStep('setup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                step === 'setup' ? 'bg-blue-500 text-white shadow-lg' : 'text-blue-200 hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>면담 시뮬레이션</span>
            </button>
            
            <button 
              onClick={handleEnterAdmin}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                step === 'admin' ? 'bg-blue-500 text-white shadow-lg' : 'text-blue-200 hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>관리자모드</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
            dbConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {dbConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
            <span>{dbConnected ? 'CLOUD CONNECTED' : 'OFFLINE MODE'}</span>
          </div>

          <div className="flex items-center gap-3 pr-6 border-r border-white/10">
            <div className="text-right">
              <div className="text-[11px] font-bold text-white">{user.displayName || 'User'}</div>
              <div className="text-[9px] text-blue-300/60 font-bold">{user.affiliation || '현대자동차'}</div>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="P" className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-inner"><UserIcon className="w-4 h-4 text-white" /></div>
            )}
          </div>

          {step === 'chat' ? (
            <button 
              onClick={handleExitSimulation}
              className="bg-white text-[#002C5F] px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-50 transition-all active:scale-95"
            >
              시뮬레이션 종료
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {step === 'setup' ? (
            <SetupView onStart={handleStartSimulation} />
          ) : step === 'admin-login' ? (
            <div className="h-full flex items-center justify-center p-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-md w-full text-center"
              >
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <ShieldCheck className="w-10 h-10 text-[#002C5F]" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">관리자 로그인</h2>
                <p className="text-slate-500 text-sm mb-8 font-medium">관리자 전용 대시보드 접근을 위해<br/>비밀번호를 입력해주세요.</p>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const pwd = (form.elements.namedItem('password') as HTMLInputElement).value;
                    const success = await handleAdminAuth(pwd);
                    if (success) {
                      // No need to reset if we are switching views, but good practice if kept
                      form.reset();
                    } else {
                      alert('비밀번호가 올바르지 않습니다.');
                    }
                  }}
                  className="space-y-4"
                >
                  <input 
                    name="password"
                    type="password" 
                    placeholder="Password" 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-lg font-bold tracking-widest focus:border-blue-500 focus:outline-none transition-all"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    className="w-full bg-[#002C5F] text-white py-4 rounded-2xl font-black text-lg hover:shadow-xl transition-all active:scale-95 shadow-lg"
                  >
                    접속하기
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep('setup')}
                    className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
                  >
                    돌아가기
                  </button>
                </form>
              </motion.div>
            </div>
          ) : step === 'admin' ? (
            <AdminView />
          ) : step === 'report' ? (
            lastSimulation && <ReportView simulation={lastSimulation} onRestart={handleExitSimulation} />
          ) : (
            selectedPersona && selectedScenario && (
              <ChatView 
                persona={selectedPersona} 
                scenario={selectedScenario} 
                user={user}
                onExit={handleExitSimulation}
                onShowReport={handleShowReport}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}
