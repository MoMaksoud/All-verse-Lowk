import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
        {/* Glow backdrop */}
        <div
          className="absolute w-[500px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* 404 number */}
          <p
            className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
            }}
          >
            404
          </p>

          {/* Label */}
          <h1 className="text-xl sm:text-2xl font-semibold mt-2 mb-3" style={{ color: 'var(--text)' }}>
            Page not found
          </h1>

          <p className="text-sm sm:text-base mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#2563eb')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent)')}
            >
              Go home
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border-med)',
              }}
            >
              Browse listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
