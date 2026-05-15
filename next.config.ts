import type { NextConfig } from "next";

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT ??
  `build-${Date.now()}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  generateBuildId: async () => buildId,
  async headers() {
    return [
      {
        source:
          "/((?!_next/static|_next/image|favicon.png|icons/|manifest.json).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
