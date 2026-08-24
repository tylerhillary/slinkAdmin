import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pins tracing to this project; a lockfile higher up the tree would otherwise win.
  outputFileTracingRoot: path.join(__dirname),
  eslint: { dirs: ["app", "components", "hooks", "lib", "types"] },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "ui-avatars.com" }],
  },
};

export default nextConfig;
