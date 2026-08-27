import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "**/*": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
