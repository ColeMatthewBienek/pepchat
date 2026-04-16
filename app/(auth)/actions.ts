'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Signs the user in with email + password.
 * Returns an error string on failure; redirects on success.
 */
export async function login(
  formData: FormData
): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  // If the user has no profile yet, send them to setup
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) redirect('/setup-profile')
  }

  redirect('/channels')
}

/**
 * Creates a new account with email + password.
 * Returns an error string on failure; redirects on success.
 */
export async function signup(
  formData: FormData
): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }

  // New user always needs to pick a username
  redirect('/setup-profile')
}

/**
 * Creates the public profile row with the chosen username.
 * Returns an error string on failure; redirects on success.
 */
export async function setupProfile(
  formData: FormData
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const username = (formData.get('username') as string).trim()

  if (!username || username.length < 2) {
    return { error: 'Username must be at least 2 characters.' }
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { error: 'Username may only contain letters, numbers, _, . and -' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) return { error: 'That username is already taken.' }

  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    username,
  })

  if (error) return { error: error.message }

  redirect('/channels')
}

/**
 * Signs the user out and redirects to the login page.
 */
export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
