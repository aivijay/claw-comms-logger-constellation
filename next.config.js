/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'chokidar', 'simple-git', 'node-cron'],
  turbopack: {},
};

module.exports = nextConfig;