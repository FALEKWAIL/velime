import { Suspense } from 'react';
import BoutiqueClient from './BoutiqueClient';

export default function BoutiquePage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Chargement...</div>}>
      <BoutiqueClient />
    </Suspense>
  );
}
