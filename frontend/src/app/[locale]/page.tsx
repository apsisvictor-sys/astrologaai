import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';

const copy = {
  bg: {
    badge: 'AI астрология, създадена за реалния живот',
    title: 'Опознай себе си чрез',
    titleAccent: 'персонален космически анализ',
    subtitle:
      'AstroLogAI комбинира модерна астрология и AI, за да получаваш ясни насоки за връзки, кариера, енергия и важни решения.',
    ctaPrimary: 'Регистрация',
    ctaSecondary: 'Вход',
    valueTitle: 'Защо AstroLogAI?',
    values: [
      'Персонализирани тълкувания на натална карта и транзити',
      'AI чат с контекст за твоя профил и въпроси',
      'Прогнози и партньорска съвместимост на едно място'
    ],
    featuresTitle: 'Какво получаваш',
    features: [
      { title: 'AI Астролог 24/7', text: 'Питай за любов, работа, здраве и посока.' },
      { title: 'Натална карта + анализ', text: 'Ясни обяснения без сложен астрологичен жаргон.' },
      { title: 'Прогнози и транзити', text: 'Дневни и седмични насоки за по-добри решения.' }
    ],
    pricingTitle: 'Планове за всеки етап',
    pricingText: 'Започни безплатно. Надгради, когато искаш повече дълбочина, прогнози и неограничен чат.',
    trustTitle: 'Доверие и прозрачност',
    trustText: 'Използваме защитена автентикация и запазваме контрола върху данните в твоите ръце.',
    faqTitle: 'Често задавани въпроси',
    faq: [
      { q: 'Трябва ли да знам астрология?', a: 'Не. Получаваш обяснения на разбираем език.' },
      { q: 'Мога ли да сменя езика?', a: 'Да, с един клик между български и английски.' },
      { q: 'Има ли безплатен достъп?', a: 'Да, можеш да започнеш с безплатен план и да тестваш.' }
    ]
  },
  en: {
    badge: 'AI astrology for real life decisions',
    title: 'Understand yourself with',
    titleAccent: 'personal cosmic guidance',
    subtitle:
      'AstroLogAI blends modern astrology and AI so you get clear insights for relationships, career, energy and timing.',
    ctaPrimary: 'Register',
    ctaSecondary: 'Login',
    valueTitle: 'Why AstroLogAI?',
    values: [
      'Personalized natal chart and transit interpretations',
      'AI chat that remembers your profile context',
      'Forecasts and relationship compatibility in one place'
    ],
    featuresTitle: 'What you get',
    features: [
      { title: '24/7 AI Astrologer', text: 'Ask about love, career, health and direction.' },
      { title: 'Natal chart + interpretation', text: 'Clear guidance without heavy astrology jargon.' },
      { title: 'Forecasts and transits', text: 'Daily and weekly insights for better decisions.' }
    ],
    pricingTitle: 'Plans for every stage',
    pricingText: 'Start free. Upgrade anytime for deeper analysis, forecasts and unlimited chat.',
    trustTitle: 'Built for trust',
    trustText: 'Secure authentication and transparent data handling keep you in control.',
    faqTitle: 'FAQ',
    faq: [
      { q: 'Do I need astrology knowledge?', a: 'No. Explanations are written in clear plain language.' },
      { q: 'Can I switch language?', a: 'Yes, instantly between Bulgarian and English.' },
      { q: 'Is there a free plan?', a: 'Yes, you can start free and upgrade later.' }
    ]
  }
} as const;

export default function LandingPage({ params: { locale } }: { params: { locale: 'bg' | 'en' } }) {
  const c = copy[locale] ?? copy.bg;

  return (
    <main
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at top, #1A1A2E 0%, #050510 50%, #000000 100%)', color: '#F8FAFC' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex justify-end mb-8">
          <LanguageSwitcher />
        </div>

        <section className="text-center py-12 sm:py-20">
          <p className="text-sm mb-4" style={{ color: '#CBD5E1' }}>{c.badge}</p>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            {c.title}{' '}
            <span style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {c.titleAccent}
            </span>
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-xl mb-8" style={{ color: '#CBD5E1' }}>{c.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-6 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' }}>
              {c.ctaPrimary}
            </Link>
            <Link href="/login" className="px-6 py-3 rounded-xl font-semibold border" style={{ borderColor: '#1A1A3A', color: '#CBD5E1' }}>
              {c.ctaSecondary}
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-4">{c.valueTitle}</h2>
            <ul className="space-y-3" style={{ color: '#CBD5E1' }}>
              {c.values.map((item) => <li key={item}>✦ {item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-4">{c.pricingTitle}</h2>
            <p style={{ color: '#CBD5E1' }}>{c.pricingText}</p>
            <Link href="/pricing" className="inline-block mt-4 text-sm font-medium" style={{ color: '#8B5CF6' }}>
              View pricing →
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">{c.featuresTitle}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {c.features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border p-5" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p style={{ color: '#CBD5E1' }}>{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6 pb-16">
          <div className="rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-3">{c.trustTitle}</h2>
            <p style={{ color: '#CBD5E1' }}>{c.trustText}</p>
          </div>
          <div className="rounded-2xl border p-6" style={{ background: '#0A0A1F', borderColor: '#1A1A3A' }}>
            <h2 className="text-xl font-semibold mb-3">{c.faqTitle}</h2>
            <div className="space-y-3">
              {c.faq.map((item) => (
                <div key={item.q}>
                  <p className="font-medium">{item.q}</p>
                  <p style={{ color: '#CBD5E1' }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
