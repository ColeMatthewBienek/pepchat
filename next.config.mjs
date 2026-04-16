/** @type {import('next').NextConfig} */
const nextConfig = {}

// Enable the Cloudflare dev platform in development so the app behaves
// the same as it will on Cloudflare Pages.
// Dynamic import + try/catch so the dev server works even when node_modules
// were installed on a different platform (e.g. Windows vs WSL).
if (process.env.NODE_ENV === 'development') {
  try {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev')
    await setupDevPlatform()
  } catch {
    // Platform binary mismatch (e.g. Windows node_modules on WSL) — skip silently.
    // Run `npm install` from WSL to restore full Cloudflare dev platform support.
  }
}

export default nextConfig
