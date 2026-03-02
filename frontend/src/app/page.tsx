import Link from 'next/link';

export default function RootPage() {
  return (
    <main className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)', color: '#F8FAFC' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex justify-end gap-2 mb-8 text-sm">
          <Link href="/bg" className="px-3 py-1 rounded-lg border" style={{ borderColor: '#1A1A3A' }}>BG</Link>
          <Link href="/en" className="px-3 py-1 rounded-lg border" style={{ borderColor: '#1A1A3A' }}>EN</Link>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-4">AstroLogAI</h1>
        <p className="text-lg mb-8" style={{ color: '#CBD5E1' }}>Вашият личен AI астролог за по-ясни решения в любов, кариера и ежедневие.</p>
        <div className="flex gap-4">
          <Link href="/register" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>Регистрация</Link>
          <Link href="/login" className="px-6 py-3 rounded-xl border" style={{ borderColor: '#1A1A3A', color: '#CBD5E1' }}>Вход</Link>
        </div>
      </div>
    </main>
  );
}
