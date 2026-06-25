import type { QuoteEvent } from "@/lib/types/db";
import { formatDateTime } from "@/lib/format";

const LABELS: Record<string, string> = {
  created: "Quote created",
  ai_generated: "AI draft generated",
  edited: "Quote edited",
  status_changed: "Status changed",
  pdf_generated: "Proposal PDF generated",
  customer_message_copied: "Customer message copied",
};

function describe(e: QuoteEvent): string {
  const meta = (e.metadata ?? {}) as Record<string, unknown>;
  if (e.event_type === "status_changed") return `${LABELS.status_changed}: ${meta.from} → ${meta.to}`;
  if (e.event_type === "ai_generated") {
    const conf = typeof meta.confidence === "number" ? ` · confidence ${Math.round(meta.confidence * 100)}%` : "";
    const fb = meta.used_fallback ? " · used fallback" : "";
    return `${LABELS.ai_generated}${conf}${fb}`;
  }
  return LABELS[e.event_type] ?? e.event_type;
}

export function QuoteTimeline({ events }: { events: QuoteEvent[] }) {
  if (events.length === 0) {
    return <p className="card p-5 text-sm text-gray-500">No activity yet.</p>;
  }
  return (
    <ol className="card divide-y divide-gray-100">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
          <span className="text-gray-700">{describe(e)}</span>
          <span className="text-xs text-gray-400">{formatDateTime(e.created_at)}</span>
        </li>
      ))}
    </ol>
  );
}
