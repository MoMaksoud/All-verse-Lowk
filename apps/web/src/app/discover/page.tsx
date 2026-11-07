import { redirect } from 'next/navigation';

// Browsing is handled by the listings page for now.
export default function DiscoverPage() {
  redirect('/listings');
}
