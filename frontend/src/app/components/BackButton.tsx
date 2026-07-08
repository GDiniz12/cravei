import Link from 'next/link';

export default function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="btn btn-outline back-button">
      ← VOLTAR
    </Link>
  );
}
