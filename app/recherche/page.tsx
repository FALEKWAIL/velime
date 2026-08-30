import { Suspense } from 'react';
import RechercheClient from './RechercheClient';

export default function RecherchePage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Chargement...</div>}>
      <RechercheClient />
    </Suspense>
  );
}
