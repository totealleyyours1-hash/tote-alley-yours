import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';
import type { UserProfile } from '../types/store';

export function AdminLoginPage() {
  usePageMeta("Admin Sign In – Tote'Alley Yours");
  const navigate = useNavigate();
  const { user, setSession } = useStore();

  const [statusLoading, setStatusLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [viaEnv, setViaEnv] = useState(false);

  const [email, setEmail] = useState('totealleyy1@gmail.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    apiFetch<{ configured: boolean; viaEnv: boolean; authenticatedAsAdmin: boolean }>('/api/admin/status')
      .then((res) => {
        setConfigured(res.configured);
        setViaEnv(res.viaEnv);
        if (res.authenticatedAsAdmin) {
          navigate('/admin', { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(res.user, res.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid admin credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstRunClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Please choose an admin password of at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile }>('/api/admin/claim', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(res.user, res.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete admin setup.');
    } finally {
      setSubmitting(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-sm text-[#7D6661]">
        Checking admin portal status...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="rounded-3xl bg-white border border-[#EAE0D5] p-7 sm:p-9 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#FDF2F4] border border-[#F1D8DF] flex items-center justify-center mx-auto mb-3 text-[#D66886]">
            {configured ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <h1 className="font-display text-3xl font-semibold text-[#2A211F]">
            {configured ? 'Admin Dashboard Login' : 'First-Run Admin Setup'}
          </h1>
          <p className="text-xs text-[#6D5D58] mt-1.5 leading-relaxed">
            {configured
              ? 'Sign in to manage products, stickers, orders, payments, and website content.'
              : 'No admin password has been set yet. Create your private store owner password below to lock and secure your admin portal.'}
          </p>
        </div>

        {configured ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {!viaEnv && (
              <div>
                <label className="block text-xs font-medium text-[#6D5D58] mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                {viaEnv ? 'Admin Passcode' : 'Admin Password'}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your admin password"
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#A93855] bg-[#FDF2F4] border border-[#F2C7D2] rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#2A211F] text-white py-3 text-sm font-semibold hover:bg-[#433532] transition-colors disabled:opacity-60"
            >
              {submitting ? 'Verifying...' : 'Sign In to Admin Studio'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleFirstRunClaim} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Store Owner Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Create Admin Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">
                Confirm Admin Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#A93855] bg-[#FDF2F4] border border-[#F2C7D2] rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#D66886] text-white py-3 text-sm font-semibold hover:bg-[#C05270] transition-colors disabled:opacity-60"
            >
              {submitting ? 'Securing Admin Portal...' : 'Claim Admin Access & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
