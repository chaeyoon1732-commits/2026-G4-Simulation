import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface LoginViewProps {
  onLogin: (userData: UserProfile) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onLogin({
          uid: result.user.uid,
          displayName: result.user.displayName || '사용자',
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
        alert('Google 로그인이 활성화되지 않았습니다. Firebase 콘솔(Authentication > 로그인 방법)에서 Google을 활성화해주세요.');
      } else if (error?.code === 'auth/admin-restricted-operation') {
        alert('사용자 생성 권한이 제한되었습니다. Firebase 콘솔(프로젝트 ID: g4-simulation)에서 [Authentication > 설정 > 사용자 작업] 메뉴로 이동하여 "계정 만들기 허용"이 체크되어 있는지 확인해주세요.');
      } else if (error?.code === 'auth/popup-blocked') {
        alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
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
          <p className="text-blue-200/70 text-lg font-medium max-w-2xl mx-auto">
            현장 리더가 마주할 수 있는 면담 상황을 시뮬레이션 해보세요.<br />
            교육생께서는 본인 개인 구글 계정으로 로그인해주시기 바랍니다.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center gap-4 bg-white text-[#002C5F] px-8 py-6 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl active:scale-95 justify-center group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-[#002C5F]/30 border-t-[#002C5F] rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-lg">Google 계정으로 계속하기</span>
              </>
            )}
          </button>
          
          <div className="mt-8">
            <div className="text-[10px] text-blue-300/50 uppercase tracking-[0.3em] font-bold">
              Hyundai Motor Group Training System
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
