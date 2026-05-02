import fs from "node:fs"
import path from "node:path"
import { loadEnvConfig } from "@next/env"

const silentLog = { info: () => {}, error: () => {} }

let loaded = false

/**
 * Garante variáveis do `.env` na raiz do monorepo (pasta acima de `FRONT/`).
 * O `loadEnvConfig` só no `next.config` nem sempre chega às Route Handlers com Turbopack.
 */
export function loadMonorepoEnvOnce(): void {
  if (loaded) return
  loaded = true
  const dev = process.env.NODE_ENV !== "production"
  const dirs = [path.resolve(process.cwd(), ".."), process.cwd()]
  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, ".env"))) {
      loadEnvConfig(dir, dev, silentLog, true)
      return
    }
  }
}
