import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, Sparkles, ArrowRight } from 'lucide-react';

const APP_NAME = 'NotJira';

export default function LoginPage() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative" style={{ background: '#07070f' }}>
      {/* Aurora orbs */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>
      <div className="grid-overlay" />

      {/* Animated ring behind card */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, rgba(99,102,241,0.15) 25%, transparent 50%, rgba(139,92,246,0.1) 75%, transparent 100%)',
          animation: 'spin-slow 12s linear infinite',
        }}
      />

      {/* Login Card */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="glass-panel rounded-3xl p-8 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(99,102,241,0.12), 0 30px 80px rgba(0,0,0,0.6)' }}>
          
          {/* Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500 blur-xl opacity-40 animate-pulse" />
              <div className="logo-badge relative w-16 h-16 rounded-2xl flex items-center justify-center animate-float">
                <Sparkles className="text-white w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-widest uppercase shimmer-text">{APP_NAME}</h1>
            <p className="text-gray-500 mt-2 text-sm">Sign in to your workspace</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center animate-fade-up">
              <div className="w-2 h-2 rounded-full bg-red-400 mr-2 shrink-0 animate-pulse" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3.5 rounded-xl text-sm placeholder-gray-700"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-3.5 rounded-xl text-sm placeholder-gray-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="btn-glow w-full py-3.5 mt-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                <><span>Sign In</span><ArrowRight size={16} /></>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
