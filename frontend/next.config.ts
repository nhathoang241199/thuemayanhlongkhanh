import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000";

const aiServiceProxyTarget =
  process.env.AI_SERVICE_PROXY_TARGET ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${apiProxyTarget}/api/:path*`,
    },
    {
      source: "/ai-api/:path*",
      destination: `${aiServiceProxyTarget}/:path*`,
    },
  ],
  redirects: async () => [
    { source: "/cameras", destination: "/book", permanent: false },
    { source: "/cameras/:id", destination: "/book", permanent: false },
  ],
};

export default nextConfig;
