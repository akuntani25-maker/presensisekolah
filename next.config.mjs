/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // face-api memuat modul node opsional; abaikan di browser
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, os: false, encoding: false };
    return config;
  },
  async headers() {
    return [
      {
        // izinkan kamera hanya untuk origin sendiri
        source: '/(.*)',
        headers: [{ key: 'Permissions-Policy', value: 'camera=(self)' }],
      },
    ];
  },
};
export default nextConfig;
