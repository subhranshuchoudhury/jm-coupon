import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev, // 👈 disables PWA in dev, fixes the warning
});

const nextConfig = withPWA({
  reactStrictMode: true,
  turbopack: {}
});

export default nextConfig;
