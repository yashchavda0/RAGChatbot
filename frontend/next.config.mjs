import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,

  // These workspace packages ship raw TS/TSX source (no build step) — Next.js
  // needs to be told to run them through its own compiler like local source.
  transpilePackages: ['@ragchatbot/shared-ui', '@ragchatbot/shared-types'],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  },

  // Allow fetch/axios to backend API
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Experimental features for Next.js 14
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Monorepo root so `output: 'standalone'` traces the @ragchatbot/* workspace
    // packages. When built via `npm run build --workspace=frontend`, cwd is
    // /app/frontend, so '..' points at the repo root.
    outputFileTracingRoot: path.join(process.cwd(), '..'),
  },
};

export default nextConfig;
