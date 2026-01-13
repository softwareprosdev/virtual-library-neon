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
import { AlertCircle, Zap, Book, Users, Headphones, MessageCircle, Sparkles } from 'lucide-react';

const features = [
  { icon: Book, label: 'Read Together', desc: 'Sync pages live' },
  { icon: Users, label: 'Book Clubs', desc: 'Join the community' },
  { icon: Headphones, label: 'Audio Rooms', desc: 'Live discussions' },
  { icon: MessageCircle, label: 'Real-time Chat', desc: 'Never miss a beat' },
];

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

      if (isLogin && data.requiresVerification) {
        localStorage.setItem('pendingVerification', JSON.stringify({
          email: data.email,
          needsVerification: true
        }));
        router.push('/verify-email');
        return;
      }

      if (!isLogin && data.needsVerification) {
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-12 relative overflow-hidden bg-[#050505]">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-primary/15 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-accent/15 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo Section - Compact on mobile */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl gradient-primary mb-4 glow-primary">
            <Zap className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <GradientText variant="primary">INDEXBIN</GradientText>
          </h1>
          <p className="mt-2 text-xs text-muted-foreground tracking-[0.3em] uppercase font-medium">
            Read Together, Grow Together
          </p>
        </motion.div>

        {/* Auth Card - Premium Glass */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 25 }}
          className="glass-card p-6 md:p-8 border-white/10 bg-card/30"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1">
              {isLogin ? 'Welcome Back' : 'Join IndexBin'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isLogin ? 'Sign in to continue reading' : 'Create your free account'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4 p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Your Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Alex Reader"
                  className="bg-white/5 border-white/10 focus:border-primary rounded-xl h-12 touch-target-lg"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 focus:border-primary rounded-xl h-12 touch-target-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-white/5 border-white/10 focus:border-primary rounded-xl h-12 touch-target-lg"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary hover:opacity-90 h-12 md:h-14 text-sm md:text-base font-bold rounded-xl glow-primary transition-all active:scale-[0.98] touch-target-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-primary transition-colors text-sm touch-target"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </motion.div>

        {/* Feature Pills - Horizontal Scroll on Mobile */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-4 px-4"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex-shrink-0 glass-card p-3 flex items-center gap-2 snap-start"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <feature.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold whitespace-nowrap">{feature.label}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] text-muted-foreground uppercase tracking-widest"
        >
          Secure • Private • Open Source
        </motion.p>
      </div>
    </div>
  );
}

