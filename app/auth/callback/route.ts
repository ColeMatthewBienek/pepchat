export const runtime = 'edge'

import { userHasPendingAccountInviteClaim } from '@/lib/invites/accountClaims'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/channels'
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) return NextResponse.redirect(`${origin}${next}`)

  const hasPendingClaim = await userHasPendingAccountInviteClaim(supabase, user.id)
  if (hasPendingClaim) {
    return NextResponse.redirect(`${origin}/setup-profile?next=${encodeURIComponent(next)}`)
  }

  await supabase.auth.signOut()
  return NextResponse.redirect(`${origin}/login?invite_required=1`)
}
