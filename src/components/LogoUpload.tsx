"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Optional logo upload. Uploads to the public `logos` bucket when Supabase
 * Storage is available and reports the public URL via `onChange`. Falls back to
 * a plain URL input when storage isn't configured, so it always works.
 */
export function LogoUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Storage not configured — paste a logo URL instead.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop() || "png";
      const path = `${user?.id ?? "anon"}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Logo preview" className="h-14 w-14 rounded-lg border border-gray-200 object-contain" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            Logo
          </div>
        )}
        <label className="btn-secondary cursor-pointer">
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <button type="button" className="btn-ghost text-sm" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      <input
        type="url"
        className="input"
        placeholder="…or paste a logo image URL"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
