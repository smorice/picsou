import { redirect } from 'next/navigation';

export default function LegacyPostfixRouteRedirect() {
  redirect('/tools/roundcube');
}