'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GradientMesh } from './Visuals';

export function StripeCta() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
    try {
      const res = await fetch(`${base}/public/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { data?: { message: string }; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed');
      setStatus('done');
      setMsg(json.data?.message ?? 'You are on the waitlist.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <section className="section section--surface">
      <GradientMesh variant="spiral" />
      <div className="wrap relative">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="h-section mb-4">Ready to get started?</h2>
            <p className="body-lg mb-8">
              Create an account instantly and send your first route request in minutes. Or contact us to
              design a custom package with dedicated support and SLA guarantees.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn--primary fur-btn px-6 py-3">
                Start now
              </Link>
              <Link href="/pricing" className="btn btn--secondary px-6 py-3">
                See pricing
              </Link>
            </div>
          </div>
          <div className="panel panel--infusion relative overflow-hidden p-7">
            <GradientMesh variant="card" />
            <div className="relative">
              <p className="text-sm font-medium text-[#0a2540]">Join the waitlist</p>
              <p className="mt-1 text-sm text-[#8898aa]">
                Early access, onboarding support, and priority catalog updates when issuers change terms.
              </p>
              <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-col gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="rounded-lg border border-[#e6ebf1] px-3 py-2.5 text-sm text-[#0a2540] outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20"
                />
                <button type="submit" className="btn btn--primary fur-btn py-2.5" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Joining…' : 'Join waitlist'}
                </button>
                {msg && <p className="text-sm text-[#425466]">{msg}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
