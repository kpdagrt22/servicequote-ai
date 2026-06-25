"use client";

import Link from "next/link";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href={backHref} className="text-sm font-medium text-gray-500 hover:text-gray-900">← Back to quote</Link>
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={() => window.print()}>
            Download / Print PDF
          </button>
        </div>
      </div>
    </div>
  );
}
