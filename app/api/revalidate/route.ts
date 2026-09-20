import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Revalidate the root layout (covers every page that shares it)
    revalidatePath('/', 'layout');
    // Explicitly revalidate the key public pages so Edge cache is purged immediately
    revalidatePath('/boutique');
    revalidatePath('/produit/[slug]', 'page');
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ revalidated: false, error: err?.message }, { status: 500 });
  }
}
