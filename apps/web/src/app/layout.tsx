import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Impulsax',
  description: 'Control horario y actividad con enfoque en claridad y cumplimiento.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
