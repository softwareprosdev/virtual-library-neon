'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { setToken, setUser } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertCircle, Zap, Shield, User } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Handle login requiring email verification (403 response)
      if (isLogin && data.requiresVerification) {
        localStorage.setItem('pendingVerification', JSON.stringify({
          email: data.email,
          needsVerification: true
        }));

        router.push('/verify-email');
        return;
      }

      // Handle registration with email verification required
      if (!isLogin && data.needsVerification) {
        // Store user info temporarily for verification page
        localStorage.setItem('pendingVerification', JSON.stringify({
          email: data.user.email,
          name: data.user.name,
          userId: data.user.id
        }));

        router.push('/verify-email');
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setToken(data.token);
      if (data.user) {
        setUser(data.user);
      }
      router.push('/dashboard');
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
        {/* Logo/Title */}
        <div className="text-center">
          <div className="inline-block mb-4">
            <Zap className="w-12 h-12 text-[#fcee0a] mx-auto" style={{ filter: 'drop-shadow(0 0 10px #fcee0a)' }} />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-[#fcee0a] text-glow-yellow">
            INDEXBIN
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#00f0ff]" />
            <p className="text-sm text-[#00f0ff] tracking-[0.3em] uppercase">
              Digital Knowledge Archive
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#00f0ff]" />
          </div>
        </div>

        {/* Auth Card */}
        <div className="cyber-card p-6">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-3 border border-[#00f0ff] bg-[#00f0ff]/10">
              {isLogin ? (
                <Shield className="w-6 h-6 text-[#00f0ff]" />
              ) : (
                <User className="w-6 h-6 text-[#00f0ff]" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-[#fcee0a] uppercase tracking-wider">
              {isLogin ? 'Access Terminal' : 'New User Registration'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {isLogin ? 'Enter credentials to authenticate' : 'Create your neural link profile'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 border border-[#ff003c] bg-[#ff003c]/10 text-[#ff003c] text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="uppercase tracking-wide">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#00f0ff] uppercase tracking-wider text-xs">
                  Handle / Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="V"
                  className="bg-input border-border focus:border-[#fcee0a] focus:ring-[#fcee0a]/20 placeholder:text-muted-foreground/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#00f0ff] uppercase tracking-wider text-xs">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@nightcity.net"
                className="bg-input border-border focus:border-[#fcee0a] focus:ring-[#fcee0a]/20 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#00f0ff] uppercase tracking-wider text-xs">
                Access Code
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="bg-input border-border focus:border-[#fcee0a] focus:ring-[#fcee0a]/20 placeholder:text-muted-foreground/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6 cyber-btn py-6 text-base"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  {isLogin ? 'Initialize Connection' : 'Create Profile'}
                </span>
              )}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 pt-4 border-t border-border text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#00f0ff] hover:text-[#fcee0a] transition-colors uppercase tracking-wider text-sm"
            >
              {isLogin ? "// New user? Create profile" : '// Existing user? Access terminal'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground uppercase tracking-widest">
          <span className="text-[#ff00a0]">[</span>
          Secure Connection Established
          <span className="text-[#ff00a0]">]</span>
        </div>
      </div>
    </div>
  );
}
