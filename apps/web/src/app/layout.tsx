import type { Metadata } from 'next';
import { Fraunces, Space_Grotesk } from 'next/font/google';
import './globals.css';

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JobTracker Admin',
  description: 'Control horario y actividad con enfoque en claridad y cumplimiento.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${grotesk.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
