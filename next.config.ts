import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev.db is opened at runtime by path (better-sqlite3), not imported, so
  // Next's build-time file tracing won't see it — without this, Vercel's
  // serverless function bundle for /api/players wouldn't include the DB file.
  outputFileTracingIncludes: {
    "/api/**/*": ["./dev.db"],
  },
};

export default nextConfig;
