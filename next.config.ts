import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las imágenes se suben desde el navegador directo a Storage. La única acción con archivo es
  // contratar una corrección (texto del cliente, máx. 4 MB; Vercel no recibe más de 4,5 MB).
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
