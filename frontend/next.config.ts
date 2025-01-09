import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["profilepicture-and-backgroundimage.s3.ap-south-1.amazonaws.com"]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
