import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request)

  // Refresh session — must happen before any redirect logic
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/setup-profile') ||
    pathname.startsWith('/check-email') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/auth/callback')

  // Unauthenticated user trying to access protected route
  if (!user && !isAuthRoute) {
    return redirectWithNext(request, '/login', currentPath)
  }

  // Authenticated user hitting auth pages — send them into the app
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const nextPath = safeRedirectPath(request.nextUrl.searchParams.get('next')) ?? '/channels'
    const hasProfile = await userHasProfile(supabase, user.id)
    if (!hasProfile) return redirectWithNext(request, '/setup-profile', nextPath)
    return redirectToPath(request, nextPath)
  }

  if (user && !isAuthRoute) {
    const hasProfile = await userHasProfile(supabase, user.id)
    if (!hasProfile) return redirectWithNext(request, '/setup-profile', currentPath)
  }

  return getResponse()
}

function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function redirectToPath(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  const destination = new URL(path, request.nextUrl.origin)
  url.pathname = destination.pathname
  url.search = destination.search
  return NextResponse.redirect(url)
}

function redirectWithNext(request: NextRequest, targetPath: string, nextPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = targetPath
  url.search = ''
  url.searchParams.set('next', nextPath)
  return NextResponse.redirect(url)
}

async function userHasProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  return Boolean(profile)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
