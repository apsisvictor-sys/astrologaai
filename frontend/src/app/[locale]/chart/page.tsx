import { Link } from '@/i18n/routing';

export default function ChartPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)', color: '#F8FAFC' }}>
      <div className="max-w-xl w-full rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
        <h1 className="text-2xl font-semibold mb-2">Natal Chart</h1>
        <p style={{ color: '#CBD5E1' }} className="mb-4">Your chart tools are being polished. You can still use Chat and Forecast right now.</p>
        <div className="flex gap-3">
          <Link href="/chat" className="px-4 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>Open Chat</Link>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl border" style={{ borderColor: '#1A1A3A', color: '#CBD5E1' }}>Back to dashboard</Link>
        </div>
      </div>
    </main>
  );
}
