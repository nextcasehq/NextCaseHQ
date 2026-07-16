import { redirect } from 'next/navigation';

/**
 * NCHQ: System Administration Route Redirection
 * Handles redirection from /system to the canonical /admin Platform Administration Console.
 */
export default function SystemRedirectPage() {
  redirect('/admin');
}
