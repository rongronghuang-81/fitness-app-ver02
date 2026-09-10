import { redirect } from 'next/navigation'

export default function RootPage() {
  // Middleware sends signed-out visitors to /login before this runs.
  redirect('/dashboard')
}
