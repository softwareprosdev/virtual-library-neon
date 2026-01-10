'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Get pending verification info from localStorage
  useState(() => {
    if (typeof window !== 'undefined') {
      const pending = localStorage.getItem('pendingVerification');
      if (pending) {
        const data = JSON.parse(pending);
        setEmail(data.email);
      } else {
        router.push('/');
      }
    }
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        localStorage.removeItem('pendingVerification');
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      const res = await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setSuccess('New verification code sent to your email!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification code');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fcee0a] to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent" />

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-[#fcee0a] opacity-50" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-[#fcee0a] opacity-50" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-[#00f0ff] opacity-50" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-[#00f0ff] opacity-50" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[#00f0ff] hover:text-[#fcee0a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="uppercase tracking-wider text-sm">Back to login</span>
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="inline-block mb-4">
            <Mail className="w-12 h-12 text-[#fcee0a] mx-auto" style={{ filter: 'drop-shadow(0 0 10px #fcee0a)' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#fcee0a] text-glow-yellow">
            VERIFY EMAIL
          </h1>
          <p className="text-[#00f0ff] mt-2 uppercase tracking-wide text-sm">
            Check your inbox for verification code
          </p>
        </div>

        {/* Info Card */}
        <div className="cyber-card p-4 bg-[#00f0ff]/10 border-[#00f0ff]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#fcee0a]/20 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-[#fcee0a]" />
            </div>
            <div className="text-sm">
              <p className="text-[#fcee0a] font-semibold">Verification Code Sent</p>
              <p className="text-[#00f0ff]">{email}</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="cyber-card p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 border border-[#ff003c] bg-[#ff003c]/10 text-[#ff003c] text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="uppercase tracking-wide">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 border border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41] text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="uppercase tracking-wide">{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-[#00f0ff] uppercase tracking-wider text-xs">
                6-Digit Verification Code
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="123456"
                maxLength={6}
                className="bg-input border-border focus:border-[#fcee0a] focus:ring-[#fcee0a]/20 placeholder:text-muted-foreground/50 text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6 cyber-btn py-6 text-base"
              size="lg"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Verify Email Address
                </span>
              )}
            </Button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-[#00f0ff] text-sm mb-3 uppercase tracking-wide">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="flex items-center justify-center gap-2 mx-auto text-[#fcee0a] hover:text-[#00f0ff] transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Resend Verification Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground uppercase tracking-widest">
          <span className="text-[#ff00a0]">[</span>
          Verification Code Expires in 15 Minutes
          <span className="text-[#ff00a0]">]</span>
        </div>
      </div>
    </div>
  );
}