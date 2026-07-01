import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { BrainCircuit, Loader2, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-deep-space-violet py-12 px-4 sm:px-6 lg:px-8 relative">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-sm text-slate-400 hover:text-bright-teal transition-colors" id="login-back-btn">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>
      <div className="max-w-md w-full space-y-8 bg-deep-space-violet/40 p-10 rounded-[20px] shadow-none border border-rich-violet/60 backdrop-blur-md">
        <div className="text-center">
          <Link to="/" className="inline-block" id="login-logo-link">
            <BrainCircuit className="mx-auto h-12 w-12 text-bright-teal hover:scale-105 transition-transform animate-pulse" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-off-white tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to your LifePilot account</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-lg">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 appearance-none relative block w-full px-3 py-2 bg-deep-space-violet border border-rich-violet/80 placeholder-slate-500 text-off-white rounded-lg focus:outline-none focus:ring-2 focus:ring-bright-teal focus:border-transparent sm:text-sm" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 appearance-none relative block w-full px-3 py-2 bg-deep-space-violet border border-rich-violet/80 placeholder-slate-500 text-off-white rounded-lg focus:outline-none focus:ring-2 focus:ring-bright-teal focus:border-transparent sm:text-sm" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-deep-space-violet bg-bright-teal hover:bg-bright-teal/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright-teal disabled:opacity-50 transition-colors shadow-none">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-deep-space-violet" /> : 'Sign in'}
          </button>
        </form>
        <div className="text-center text-sm text-slate-400 font-medium mt-4">
          Don't have an account? <Link to="/register" className="text-bright-teal hover:text-bright-teal/80 transition-colors">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
