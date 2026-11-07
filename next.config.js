if (process.env.NODE_ENV !== "production") {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
}

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["@upstash/redis", "uncrypto"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/terms-of-service",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/upcoming-papers",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/papers",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=900, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/selected-papers",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=1800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/related-subject",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/course-list",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/papers/count",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/((?!api/).*\\.(?:css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default config;
