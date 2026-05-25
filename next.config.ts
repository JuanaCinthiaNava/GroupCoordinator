import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { securityHeaders } from './src/lib/headers/security';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // D-22: noindex + referrer policy — applied via src/lib/headers/security.ts.
  async headers() {
    return securityHeaders();
  },
};

export default withNextIntl(nextConfig);
