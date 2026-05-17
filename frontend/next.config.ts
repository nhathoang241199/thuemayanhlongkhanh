import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    { source: "/cameras", destination: "/book", permanent: false },
    { source: "/cameras/:id", destination: "/book", permanent: false },
  ],
};

export default nextConfig;
