/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker/Fly use the standalone server; Vercel builds its own output.
  output: process.env.VERCEL ? undefined : "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Read from disk at runtime: recorded fixtures and baselines, plus seed/runs (live runs recorded before deploy, never committed).
  outputFileTracingIncludes: { "/**": ["./fixtures/**/*", "./seed/runs/**/*"] },
};
export default nextConfig;
