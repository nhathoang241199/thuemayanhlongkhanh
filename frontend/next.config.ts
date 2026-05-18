import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${apiProxyTarget}/api/:path*`,
    },
  ],
  redirects: async () => [
    { source: "/cameras", destination: "/book", permanent: false },
    { source: "/cameras/:id", destination: "/book", permanent: false },
  ],
};

export default nextConfig;
