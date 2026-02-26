import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AstroLogAI - Your Personal AI Astrologer',
  description: 'Personal AI astrologer with persistent memory of your birth chart',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-purple-900">
          {children}
        </div>
      </body>
    </html>
  );
}
