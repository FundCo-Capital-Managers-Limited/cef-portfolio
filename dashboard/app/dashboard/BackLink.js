import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function BackLink({ href, children }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
      <ArrowLeft size={14} />
      {children}
    </Link>
  );
}
