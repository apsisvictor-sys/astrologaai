import { PublicNav } from '@/components/home/public-nav';
import { PublicFooter } from '@/components/home/public-footer';

export const metadata = {
  title: 'Terms of Service | AstroLogAI',
  description: 'Terms of Service for AstroLogAI — your AI-powered astrology platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-deep text-text-primary">
      <PublicNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-3xl font-display font-bold mb-2">Terms of Service</h1>
        <p className="text-text-muted text-sm mb-10">Last updated: March 2025</p>

        <section className="space-y-8 text-sm leading-relaxed text-text-secondary">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AstroLogAI ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree, please do not use the Service. These terms apply to all visitors, users,
              and others who access the Service.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Description of Service</h2>
            <p>
              AstroLogAI is an AI-powered astrology platform that provides natal chart calculations, horoscopes,
              compatibility readings, and other astrological insights. The Service is provided for entertainment
              and personal reflection purposes only. Astrological content does not constitute professional advice
              of any kind (legal, financial, medical, or psychological).
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. User Accounts</h2>
            <p className="mb-2">
              To access certain features, you must create an account. You are responsible for maintaining the
              confidentiality of your account credentials and for all activity that occurs under your account.
            </p>
            <p>
              You must be at least 16 years old to use this Service. By creating an account, you confirm that
              you meet this age requirement.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Subscriptions and Payments</h2>
            <p className="mb-2">
              Some features of the Service require a paid subscription (PREMIUM). Subscriptions are billed
              monthly or annually as selected at purchase. All payments are processed securely via Stripe.
            </p>
            <p className="mb-2">
              You may cancel your subscription at any time. Cancellation takes effect at the end of the current
              billing period. Refunds are issued in accordance with our Refund Policy.
            </p>
            <p>
              We reserve the right to change subscription pricing with 30 days' notice to registered users.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Credit System</h2>
            <p>
              The Service includes a credit-based system for certain AI features. Credits are consumed per
              query and do not expire within the billing period. Credits are non-transferable and have no
              cash value.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Prohibited Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Reproduce, distribute, or create derivative works without written permission</li>
              <li>Use automated tools to scrape or harvest data from the Service</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service — including text, graphics, logos, and
              AI-generated astrological content — are the exclusive property of AstroLogAI and its licensors.
              Your personal birth chart data and readings are yours; we do not claim ownership over user-provided data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. AstroLogAI makes no representations
              regarding the accuracy, completeness, or reliability of astrological interpretations. Results are
              generated by AI and should not be relied upon for making important life decisions.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, AstroLogAI shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
              Our total liability to you shall not exceed the amount you paid us in the 12 months
              preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">10. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Bulgaria and applicable European Union
              regulations. Any disputes shall be resolved in the courts of Sofia, Bulgaria, except where
              EU consumer protection law grants you rights in your country of residence.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. We will notify registered users by email of material
              changes at least 14 days before they take effect. Continued use of the Service after changes
              constitutes acceptance of the new Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{' '}
              <a href="mailto:legal@astrologa.bg" className="text-primary hover:underline">
                legal@astrologa.bg
              </a>
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
