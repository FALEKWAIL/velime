'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2rem',
          color: '#2b221a',
          marginBottom: '1rem',
          fontWeight: 400,
        }}
      >
        Velime
      </h2>
      <p style={{ color: '#7a6b5c', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '400px' }}>
        Une mise à jour a été effectuée. Cliquez ci-dessous pour actualiser la page.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            } else {
              reset();
            }
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2b221a',
            color: '#f7f4ee',
            border: 'none',
            borderRadius: '999px',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Actualiser la page
        </button>
        <a
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f7f4ee',
            color: '#2b221a',
            border: '1px solid #ded8cc',
            borderRadius: '999px',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
