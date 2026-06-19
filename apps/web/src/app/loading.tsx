import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020617' }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#3b82f6' }} />
    </div>
  );
}
