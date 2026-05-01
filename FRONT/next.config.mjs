import path from "node:path"
import { fileURLToPath } from "node:url"
import nextEnv from "@next/env"

/** Variáveis de SMTP e CONTACT_EMAIL ficam na raiz do monorepo (../.env), sem duplicar no FRONT. */
const frontDir = path.dirname(fileURLToPath(import.meta.url))
nextEnv.loadEnvConfig(path.join(frontDir, ".."))

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ]
  },
}

export default nextConfig
