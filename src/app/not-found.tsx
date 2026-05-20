import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
      <div className="font-display text-6xl text-accent">404</div>
      <h1 className="font-display text-2xl">Nothing here.</h1>
      <p className="text-sm text-muted-foreground">
        The customer, page, or report you were looking for doesn't exist.
      </p>
      <Button asChild variant="outline">
        <Link href="/">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to overview
        </Link>
      </Button>
    </div>
  );
}
