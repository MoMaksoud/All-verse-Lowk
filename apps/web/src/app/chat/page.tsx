import { redirect } from 'next/navigation';

// Conversations with sellers live in Messages; the assistant lives at /ai.
export default function ChatPage() {
  redirect('/ai');
}
