'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { setToken, setUser } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { motion } from 'framer-motion';
import { GradientText } from '../components/ui/GradientText';
import { AlertCircle, Zap, Shield, User } from 'lucide-react';
import MatrixRain from '../components/MatrixRain';

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-[#050505]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo/Title Section */}
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-6 glow-primary"
          >
            <Zap className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold tracking-tight"
          >
            <GradientText variant="primary">INDEXBIN</GradientText>
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-sm text-muted-foreground tracking-[0.4em] uppercase font-medium"
          >
            Neural Knowledge Archive
          </motion.p>
        </div>

        {/* Auth Card - Glassmorphic */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', damping: 20 }}
          className="glass-card p-8 md:p-10 border-white/10 bg-card/30"
        >
          {/* Card Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              {isLogin ? 'Access Terminal' : 'Create Profile'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLogin ? 'Enter credentials to authenticate' : 'Join the synchronized library'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-3"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-1">
                  Handle / Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="V"
                  className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 rounded-xl h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-1">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@nightcity.net"
                className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 rounded-xl h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-1">
                Access Code
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 rounded-xl h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6 gradient-primary hover:opacity-90 py-6 text-base font-bold rounded-xl glow-primary transition-all active:scale-[0.98]"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 tracking-widest">
                  <Zap className="w-4 h-4 fill-white" />
                  {isLogin ? 'CONNECT' : 'REGISTER'}
                </span>
              )}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
            >
              {isLogin ? "New user? Create your neural link profile" : 'Already tagged? Return to access terminal'}
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="text-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold"
        >
          Secure Neural Connection Active
        </motion.div>
      </div>
    </div>
  );
}
