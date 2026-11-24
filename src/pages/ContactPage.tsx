import React, { useState } from 'react';
import { Instagram, Mail, Send } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePageMeta, useStore } from '../context/StoreContext';

export function ContactPage() {
  const { site } = useStore();
  usePageMeta(
    "Contact Us – Tote'Alley Yours",
    'Reach out to Tote’Alley Yours on Instagram @totealleyours1 or email totealleyy1@gmail.com for custom orders and inquiries.'
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      setFeedback({ ok: true, text: res.message });
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-2">
          Get in Touch
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#2A211F]">
          Contact {site.business.name}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-[#5C4D49]">
          Questions about custom sticker layouts, bulk gifting, or an existing order? Reach us directly or send a note below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#FDF2F4] border border-[#F1D8DF] p-6">
            <Instagram className="w-6 h-6 text-[#D66886] mb-3" />
            <h2 className="text-lg font-semibold text-[#2A211F] mb-1">Instagram DM (Fastest)</h2>
            <p className="text-sm text-[#5C4D49] mb-4">
              For confirming orders, discussing custom artwork, and tracking deliveries.
            </p>
            <a
              href={site.business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#D66886] text-white px-5 py-2.5 text-xs font-semibold hover:bg-[#C05270] transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>Message {site.business.instagram_handle}</span>
            </a>
          </div>

          <div className="rounded-2xl bg-white border border-[#EAE0D5] p-6">
            <Mail className="w-6 h-6 text-[#7D6661] mb-3" />
            <h2 className="text-lg font-semibold text-[#2A211F] mb-1">Email Studio</h2>
            <a
              href={`mailto:${site.business.email}`}
              className="text-sm font-medium text-[#B55470] hover:underline break-all"
            >
              {site.business.email}
            </a>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:col-span-7 rounded-2xl bg-white border border-[#EAE0D5] p-6 sm:p-8 space-y-4"
        >
          <h2 className="font-display text-2xl font-semibold text-[#2A211F]">Send Us a Note</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Phone / Instagram Handle</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D5D58] mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Bulk order, custom idea..."
                className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6D5D58] mb-1">Message *</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#D66886]"
            />
          </div>

          {feedback && (
            <p
              className={`text-xs rounded-xl px-3 py-2 ${
                feedback.ok
                  ? 'bg-[#EEF5EE] text-[#355A38] border border-[#C8DEC9]'
                  : 'bg-[#FDF2F4] text-[#A93855] border border-[#F2C7D2]'
              }`}
            >
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-full bg-[#2A211F] text-white px-7 py-3 text-sm font-semibold hover:bg-[#433532] transition-colors disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
