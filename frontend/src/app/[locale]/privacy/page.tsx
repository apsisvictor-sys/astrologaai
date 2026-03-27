import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';

export const metadata = {
  title: 'Privacy Policy | AstroLogAI',
  description: 'Privacy Policy for AstroLogAI — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-deep text-text-primary">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-3xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: March 2025</p>

        <section className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Introduction</h2>
            <p>
              AstroLogAI ("we", "us", "our") is committed to protecting your personal data. This Privacy
              Policy explains how we collect, use, store, and protect information when you use our Service
              at astrologa.bg. We comply with the EU General Data Protection Regulation (GDPR) and applicable
              Bulgarian data protection law.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Data Controller</h2>
            <p>
              The data controller for your personal data is AstroLogAI. For data protection inquiries,
              contact us at:{' '}
              <a href="mailto:privacy@astrologa.bg" className="text-primary hover:underline">
                privacy@astrologa.bg
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Data We Collect</h2>
            <p className="mb-2">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">Account data:</strong> Email address, name (optional),
                password (hashed — never stored in plain text)
              </li>
              <li>
                <strong className="text-text-primary">Birth data:</strong> Date, time, and place of birth —
                required to generate accurate natal charts. This is sensitive data used solely to provide
                astrological calculations.
              </li>
              <li>
                <strong className="text-text-primary">Usage data:</strong> Pages visited, features used,
                session duration — collected via PostHog analytics to improve the Service.
              </li>
              <li>
                <strong className="text-text-primary">Payment data:</strong> Transaction records processed
                by Stripe. We do not store card details — these are handled entirely by Stripe.
              </li>
              <li>
                <strong className="text-text-primary">Communications:</strong> Support emails and in-app
                messages you send to us.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Legal Basis for Processing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Contract performance:</strong> Processing your birth data to generate charts and readings you request</li>
              <li><strong className="text-text-primary">Legitimate interests:</strong> Analytics to improve the Service, fraud prevention, security</li>
              <li><strong className="text-text-primary">Legal obligation:</strong> Retaining transaction records as required by law</li>
              <li><strong className="text-text-primary">Consent:</strong> Marketing communications (you may withdraw consent at any time)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Generate natal charts, horoscopes, and astrological readings</li>
              <li>Manage your account and subscription</li>
              <li>Send transactional emails (account verification, payment receipts)</li>
              <li>Improve the Service through aggregated usage analytics</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Data Sharing</h2>
            <p className="mb-2">We share your data only with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Supabase:</strong> Authentication and database hosting (EU region)</li>
              <li><strong className="text-text-primary">Stripe:</strong> Payment processing (GDPR-compliant)</li>
              <li><strong className="text-text-primary">PostHog:</strong> Privacy-friendly analytics</li>
              <li><strong className="text-text-primary">Resend:</strong> Transactional email delivery</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where retention is required by law
              (e.g., financial records retained for 5 years per Bulgarian accounting law).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Your Rights (GDPR)</h2>
            <p className="mb-2">Under GDPR, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text-primary">Access:</strong> Request a copy of your personal data</li>
              <li><strong className="text-text-primary">Rectification:</strong> Correct inaccurate data</li>
              <li><strong className="text-text-primary">Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong className="text-text-primary">Restriction:</strong> Limit processing of your data</li>
              <li><strong className="text-text-primary">Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong className="text-text-primary">Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong className="text-text-primary">Withdraw consent:</strong> For any processing based on consent</li>
            </ul>
            <p className="mt-2">
              To exercise your rights, email{' '}
              <a href="mailto:privacy@astrologa.bg" className="text-primary hover:underline">
                privacy@astrologa.bg
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with the
              Bulgarian Commission for Personal Data Protection (CPDP) at cpdp.bg.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">9. Cookies</h2>
            <p>
              We use essential cookies for authentication session management and analytics cookies (PostHog)
              to understand how the Service is used. You can control analytics cookies through your browser
              settings or by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">10. Data Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, hashed passwords,
              and access controls. No method of transmission over the internet is 100% secure; we cannot
              guarantee absolute security but take reasonable steps to protect your data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">11. Children's Privacy</h2>
            <p>
              The Service is not directed to individuals under 16. We do not knowingly collect personal data
              from children under 16. If you believe we have collected such data, contact us immediately.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy. We will notify you of significant changes by email and
              post the updated policy with a new "Last updated" date. Continued use of the Service after
              changes constitutes acceptance.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">13. Contact</h2>
            <p>
              For privacy questions or to exercise your rights:{' '}
              <a href="mailto:privacy@astrologa.bg" className="text-primary hover:underline">
                privacy@astrologa.bg
              </a>
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
