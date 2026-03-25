/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');
const { withSentryConfig } = require('@sentry/nextjs');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  reactStrictMode: true,
};

module.exports = withSentryConfig(
  withNextIntl(nextConfig),
  {
    // Sentry org/project from env vars set in Vercel
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Auth token for source map upload (set in Vercel build env)
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Suppress build output noise
    silent: !process.env.CI,
    // Upload source maps to Sentry for readable stack traces
    widenClientFileUpload: true,
    // Hides source maps from generated client bundles
    hideSourceMaps: true,
    // Disable logger to reduce bundle size
    disableLogger: true,
  }
);
