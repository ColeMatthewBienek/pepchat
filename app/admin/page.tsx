import { redirect } from 'next/navigation'

export const runtime = 'edge'

export default function AdminRoot() {
  redirect('/admin/overview')
}
