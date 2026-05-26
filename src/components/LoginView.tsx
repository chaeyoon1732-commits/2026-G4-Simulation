import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Key, Users, Building, User } from 'lucide-react';
import { UserProfile } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';

interface LoginViewProps {
  onLogin: (userData: UserProfile) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [formData, setFormData] = useState({
    entryCode: '',
    group: '1',
    affiliation: '',
    displayName: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLogin({
          uid: result.user.uid,
          displayName: result.user.displayName || 'Guest User',
          email: result.user.email || '',
          affiliation: '현대자동차',
          group: '1',
          photoURL: result.user.photoURL,
          isAdmin: result.user.email === 'chaeyoon1732@gmail.com' || result.user.email?.endsWith('@hyundai.com')
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.code === 'auth/operation-not-allowed') {
        alert('Google 로그인이 활성화되지 않았습니다. Firebase 콘솔에서 설정을 확인해주세요.');
      } else if (error?.code === 'auth/popup-blocked') {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entryCode || !formData.affiliation || !formData.displayName) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.entryCode !== '101TQCD' && formData.entryCode !== '6927376') {
      alert('올바른 입장코드를 입력해주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await signInAnonymously(auth);
      onLogin({
        ...formData,
        uid: result.user.uid,
        email: `${formData.displayName}@simulation.com`, // Artificial email
        isAdmin: formData.entryCode === '6927376', // Admin code check
        photoURL: null
      });
    } catch (error: any) {
      console.error('Anonymous login error:', error);
      if (error?.code === 'auth/operation-not-allowed') {
        alert('Anonymous(익명) 로그인이 활성화되지 않았습니다. Firebase 콘솔(Authentication > Sign-in method)에서 익명 로그인을 활성화해주세요.');
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#002C5F] relative overflow-hidden py-12 px-4">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px]"></div>
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-sky-300/10 rounded-full blur-[80px]"></div>
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 flex flex-col items-center max-w-xl w-full text-center"
      >
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-blue-200 text-xs font-bold tracking-[0.2em] mb-6"
          >
            2026 국내사업인재육성팀
          </motion.div>
          <h1 className="text-white text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
            현장 리더<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-sky-100">AI 면담 시뮬레이터</span>
          </h1>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                <Key className="w-3 h-3" /> 입장코드
              </label>
              <input 
                type="password"
                required
                value={formData.entryCode}
                onChange={e => setFormData({...formData, entryCode: e.target.value})}
                placeholder="입장코드를 입력하세요"
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> 성함
                </label>
                <input 
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                  placeholder="본인 성함"
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> 조 선택
                </label>
                <select 
                  value={formData.group}
                  onChange={e => setFormData({...formData, group: e.target.value})}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                >
                  <option value="1" className="bg-[#002C5F]">1조</option>
                  <option value="2" className="bg-[#002C5F]">2조</option>
                  <option value="3" className="bg-[#002C5F]">3조</option>
                  <option value="4" className="bg-[#002C5F]">4조</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                <Building className="w-3 h-3" /> 소속 (거점/팀)
              </label>
              <input 
                type="text"
                required
                value={formData.affiliation}
                onChange={e => setFormData({...formData, affiliation: e.target.value})}
                placeholder="예: 강남대로지점 / 국내서비스전략팀"
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center gap-3 bg-white text-[#002C5F] px-8 py-5 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl active:scale-95 justify-center group mt-8"
            >
              <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              시뮬레이션 시작하기
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 bg-white/10 border border-white/20 text-white rounded-2xl font-bold mt-6 hover:bg-white/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google 계정으로 로그인
              </>
            )}
          </button>
          
          <div className="mt-8 text-[10px] text-blue-300/50 uppercase tracking-[0.3em] font-bold">
            Hyundai Motor Group Training System
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
