'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { setToken } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !ageVerified) {
      setError('You must confirm you are 18 or older');
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, name, ageVerified };

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setToken(data.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">V-LIBRARY</h1>
          <p className="mt-2 text-sm text-muted-foreground tracking-widest">
            ADULT NEURAL INTERFACE (18+)
          </p>
        </div>

        <Card className="w-full shadow-lg border-muted">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isLogin ? 'Authenticate' : 'Initialize Account'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin ? 'Enter your credentials to access the library' : 'Create a new identity to join the network'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Identity Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter your name"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Protocol</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passkey</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="age-verified" 
                    checked={ageVerified} 
                    onCheckedChange={(checked) => setAgeVerified(checked as boolean)} 
                  />
                  <Label htmlFor="age-verified" className="text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I certify that I am at least 18 years of age and agree to view mature content.
                  </Label>
                </div>
              )}
              
              <Button type="submit" className="w-full mt-4" size="lg">
                {isLogin ? 'Jack In' : 'Confirm Access'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-primary"
              >
                {isLogin ? 'No identity? Register' : 'Has identity? Login'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
