import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native module (password hashing): load it from node_modules, don't bundle it
  serverExternalPackages: ["@node-rs/argon2"],
  // The Developer CRM moved to /admin/promotores (old links and bookmarks keep working)
  async redirects() {
    return [
      // The old public developers page: now "Para promotoras"
      { source: "/developers", destination: "/promotoras", permanent: false },
      { source: "/:locale(en|pl)/developers", destination: "/:locale/promotoras", permanent: false },
      { source: "/admin/promotores/:id/projects/new", destination: "/admin/promotores/:id/promociones/new", permanent: true },
      { source: "/:locale(en|pl)/admin/promotores/:id/projects/new", destination: "/:locale/admin/promotores/:id/promociones/new", permanent: true },
      { source: "/admin/developers/:id/projects/new", destination: "/admin/promotores/:id/promociones/new", permanent: true },
      { source: "/:locale(en|pl)/admin/developers/:id/projects/new", destination: "/:locale/admin/promotores/:id/promociones/new", permanent: true },
      { source: "/admin/developers/:id/edit", destination: "/admin/promotores/:id/perfil", permanent: true },
      { source: "/:locale(en|pl)/admin/developers/:id/edit", destination: "/:locale/admin/promotores/:id/perfil", permanent: true },
      { source: "/admin/developers/:path*", destination: "/admin/promotores/:path*", permanent: true },
      { source: "/:locale(en|pl)/admin/developers/:path*", destination: "/:locale/admin/promotores/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withNextIntl(nextConfig);