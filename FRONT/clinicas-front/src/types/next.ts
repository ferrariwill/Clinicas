/**
 * Re-export Next.js types from stable declaration paths.
 * The root `"next"` typings treat the default export as runtime, so
 * `import type { Metadata } from "next"` / `NextConfig` may not resolve as expected.
 */
export type { Metadata, Viewport } from "next/dist/lib/metadata/types/metadata-interface";
export type { NextConfig } from "next/dist/server/config";
