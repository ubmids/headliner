/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Fixtures are read from disk at runtime; make sure they ship in the standalone bundle.
  outputFileTracingIncludes: { "/api/**": ["./fixtures/**/*"] },
};
export default nextConfig;
