'use client';

// Global error boundary required by App Router (per Next.js docs).
// Rendered ONLY when the root layout itself throws — the next-intl provider
// may not have mounted, so this file is the documented allowlist exception
// to the no-hardcoded-strings rule (see biome.json overrides + plan task 1).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Intentionally render a hardcoded Spanish fallback — i18n provider may be unavailable.
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          color: '#09090b',
          padding: '16px',
        }}
      >
        <main style={{ maxWidth: 480, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
            Algo salió mal. Inténtalo en un momento.
          </h1>
          <p style={{ color: '#52525b', fontSize: 16, marginBottom: 24 }}>
            Si el problema persiste, recarga la página o vuelve más tarde.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#047857',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
