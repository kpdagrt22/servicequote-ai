import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-bold text-gray-900 ${className}`}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        {/* Document-with-check mark */}
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="m9 13 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-lg tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
