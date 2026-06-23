import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
};

export default nextConfig;
