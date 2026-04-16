import { redirect } from 'next/navigation'

/**
 * Root page — redirects to login or app depending on auth state.
 * Actual routing handled by middleware and auth logic in later steps.
 */
export default function Home() {
  redirect('/login')
}
