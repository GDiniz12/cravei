'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button className="btn btn-outline back-button" onClick={() => router.back()}>
      ← VOLTAR
    </button>
  );
}
