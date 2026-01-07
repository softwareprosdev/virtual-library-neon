'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import MainLayout from '../../../../components/MainLayout';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Loader2 } from 'lucide-react';

interface Recap {
  summary: string;
  highlights: string[];
  createdAt: string;
}

export default function RecapPage() {
  const { id: roomId } = useParams() as { id: string };
  const router = useRouter();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/ai/recap/${roomId}`);
        if (res.ok) {
          setRecap(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <p className="text-sm tracking-[0.2em] text-primary uppercase mb-2">POST_SESSION_RECAP</p>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">ARCHIVE_SYNTHESIS</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !recap ? (
          <div className="p-8 text-center bg-muted/10 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No synthesis data detected for this frequency.</p>
            <Button onClick={() => router.push('/dashboard')}>Return to Hub</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Summary */}
            <Card className="bg-background border-l-4 border-l-primary border-y border-r border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary font-bold">NEURAL_SUMMARY</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-foreground/90">
                  {recap.summary}
                </p>
              </CardContent>
            </Card>

            {/* AI Highlights */}
            <Card className="bg-muted/5 border border-border">
              <CardHeader>
                <CardTitle className="text-secondary-foreground font-bold">SESSION_HIGHLIGHTS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recap.highlights.map((point, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <span className="text-secondary-foreground font-mono font-bold">[0{i+1}]</span>
                      <p className="text-muted-foreground text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="text-center pt-8">
               <Button size="lg" onClick={() => router.push('/dashboard')}>DISCONNECT_LINK</Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
