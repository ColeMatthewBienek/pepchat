import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

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

  return supabaseResponse
}

function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function redirectToPath(request: NextRequest, path: string) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  return NextResponse.redirect(url)
}

function redirectWithNext(request: NextRequest, targetPath: string, nextPath: string) {
  const url = request.nextUrl.clone()
  url.pathname = targetPath
  url.search = ''
  url.searchParams.set('next', nextPath)
  return NextResponse.redirect(url)
}

async function userHasProfile(supabase: ReturnType<typeof createServerClient>, userId: string) {
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
