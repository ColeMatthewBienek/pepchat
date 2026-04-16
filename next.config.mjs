import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

/** @type {import('next').NextConfig} */
const nextConfig = {}

// Enable the Cloudflare dev platform in development so the app behaves
// the same as it will on Cloudflare Pages.
if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform()
}

export default nextConfig
