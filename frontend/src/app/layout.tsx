import type { Metadata } from 'next';
import { Anton, Archivo } from 'next/font/google';
import Header from './components/Header';
import './globals.css';

const display = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

const body = Archivo({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'CRAVEI - Palpites de Futebol',
  description: 'Dê seus palpites nos principais campeonatos de futebol, crie competições e desafie seus amigos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
