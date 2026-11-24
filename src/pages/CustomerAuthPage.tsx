import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { UserProfile } from '../types/store';

type AuthMode = 'login' | 'register' | 'reset';

export function CustomerAuthPage() {
  usePageMeta(
    "Sign In & Register – Tote'Alley Yours",
    "Access your Tote'Alley Yours account to view orders, saved delivery addresses, and custom tote designs."
  );

  const navigate = useNavigate();
  const { user, setSession } = useStore();
  const [mode, setMode] = useState<AuthMode>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'customer') {
      navigate('/account', { replace: true });
    } else if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setSession(res.user, res.token);
        navigate('/account');
      } else if (mode === 'register') {
        const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ full_name: fullName, email, phone, password }),
        });
        setSession(res.user, res.token);
        navigate('/account');
      } else {
        const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ email, phone, new_password: newPassword }),
        });
        setSuccessMsg(res.message);
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="rounded-3xl bg-white border border-[#EAE0D5] p-7 sm:p-9 shadow-sm">
        <div className="text-center mb-6">
          <p className="font-display text-3xl font-semibold text-[#2A211F]">Tote&apos;Alley Yours</p>
          <p className="text-xs italic font-display text-[#B55470]">Your bag, your rules.</p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F3ECE4] mb-6">
          {(
            [
              { id: 'login', label: 'Sign In' },
              { id: 'register', label: 'Register' },
              { id: 'reset', label: 'Reset' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                mode === t.id ? 'bg-white text-[#2A211F] shadow-sm' : 'text-[#6D5D58]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#6D5D58] mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
            />
          </div>

          {(mode === 'register' || mode === 'reset') && (
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Phone Number {mode === 'reset' ? '(to verify account) *' : '*'}
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          )}

          {mode !== 'reset' ? (
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a new password"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-[#A93855] bg-[#FDF2F4] border border-[#F2C7D2] rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs text-[#355A38] bg-[#EEF5EE] border border-[#C8DEC9] rounded-xl px-3 py-2">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#2A211F] text-white py-3 text-sm font-semibold hover:bg-[#433532] transition-colors disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
