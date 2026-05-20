'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

type NextThemesProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: NextThemesProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
