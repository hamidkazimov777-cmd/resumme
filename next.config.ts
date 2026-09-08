import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/api/pdf/**": ["./public/fonts/**/*"],
  },
  experimental: {},
};

export default nextConfig;
