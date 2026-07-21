import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  swcMinify: true,

  // These workspace packages ship raw TS/TSX source (no build step) — Next.js
  // needs to be told to run them through its own compiler like local source.
  transpilePackages: ["@ragchatbot/shared-ui", "@ragchatbot/shared-types"],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
  },

  // Allow fetch/axios to backend API
  async rewrites() {
    // WebSocket upgrades are proxied via rewrite; destination must use http://
    // (Next.js passes the Upgrade header through automatically).
    const wsUpstreamHttp = (
      process.env.INTERNAL_BACKEND_WS_URL ||
      process.env.BACKEND_WS_URL ||
      process.env.NEXT_PUBLIC_WS_URL ||
      "ws://localhost:8000"
    ).replace(/^ws(s?):\/\//, "http$1://");

    return [
      // NOTE: HTTP /api/* is handled by the Next.js route handler at
      // src/app/api/[...path]/route.ts — no rewrite needed for HTTP.
      // WebSocket upgrades cannot be handled by route handlers, so we
      // keep a rewrite for /ws/* only.
      {
        source: "/ws/:path*",
        destination: `${wsUpstreamHttp}/:path*`,
      },
    ];
  },

  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental features for Next.js 14
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    // Monorepo root so `output: 'standalone'` traces the @ragchatbot/* workspace
    // packages. When built via `npm run build --workspace=frontend`, cwd is
    // /app/frontend, so '..' points at the repo root.
    outputFileTracingRoot: path.join(process.cwd(), ".."),
  },
};

export default nextConfig;
