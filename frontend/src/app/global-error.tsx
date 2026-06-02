'use client'; // Error boundaries must be Client Components

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // global-error replaces the root layout when active, so it must render its
  // own <html> and <body> and cannot rely on globals.css being applied.
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#060608',
          color: '#f8fafc',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            padding: 32,
            textAlign: 'center',
            borderRadius: 16,
            background: 'rgba(15, 17, 23, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
            A critical error occurred while loading the application.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#475569',
                marginBottom: 24,
                fontFamily: 'monospace',
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              cursor: 'pointer',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              background: 'linear-gradient(to right, #7c3aed, #4f46e5)',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
