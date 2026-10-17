import type { NextConfig } from "next";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Proxy all /api calls to the NestJS backend (keeps the browser same-origin,
  // so the httpOnly session cookie flows without CORS in dev).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/api/:path*`,
      },
      {
        // Health is mounted at root on the API (excluded from the /api prefix).
        source: "/health",
        destination: `${API_BASE_URL}/health`,
      },
    ];
  },
};

export default nextConfig;
