/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // packages/shared (workspace, TS kaynak) Next tarafından transpile edilsin.
  transpilePackages: ['@motogroup/shared'],
};

export default nextConfig;
