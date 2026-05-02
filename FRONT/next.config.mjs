import path from "node:path"
import { fileURLToPath } from "node:url"
import nextEnv from "@next/env"

/** Variáveis de SMTP e CONTACT_EMAIL ficam na raiz do monorepo (../.env), sem duplicar no FRONT. */
const frontDir = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(frontDir, "..")
/** Sem o 2º argumento, o Next trata como "production" e o merge pode não bater com `next dev`. */
const isDev = process.env.NODE_ENV !== "production"
nextEnv.loadEnvConfig(monorepoRoot, isDev)

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
