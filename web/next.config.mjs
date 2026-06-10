import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this folder so Next doesn't pick up a stray
  // lockfile from a parent directory during the build.
  outputFileTracingRoot: path.resolve(),
};

export default nextConfig;
