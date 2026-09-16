"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  purpose: "product-image" | "prescription-photo";
  onUploaded: (publicUrl: string) => void;
  label?: string;
}

export function ImageUpload({ purpose, onUploaded, label = "Upload image" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to get upload URL");

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      onUploaded(presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex w-fit cursor-pointer items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
          <span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            {isUploading ? "Uploading…" : label}
          </span>
        </Button>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
