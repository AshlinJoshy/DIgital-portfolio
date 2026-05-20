'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto pt-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="font-display text-xl">Something broke loading this view.</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p className="text-[10.5px] font-mono text-muted-foreground">
              digest: {error.digest}
            </p>
          )}
          <Button onClick={reset} variant="outline" className="mt-2">
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
