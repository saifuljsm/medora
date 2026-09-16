"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";

export function PrescriptionUpload({ onUploaded }: { onUploaded: (publicUrl: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      const presignRes = await fetch("/api/storefront/prescription-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error ?? "Failed to get upload URL");

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed — please try again");

      setUploadedName(file.name);
      onUploaded(presignData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
          uploadedName ? "border-success bg-success-tint" : "border-border-strong bg-primary-tint hover:border-primary"
        }`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {uploadedName ? (
          <>
            <Check className="h-5 w-5 text-success" strokeWidth={2} />
            <span className="text-xs font-semibold text-success">Uploaded — {uploadedName}</span>
            <span className="text-[10.5px] text-success/80">Tap to replace</span>
          </>
        ) : (
          <>
            <Camera className="h-5 w-5 text-primary" strokeWidth={2} />
            <span className="text-xs font-semibold text-foreground">{isUploading ? "Uploading…" : "Upload prescription photo"}</span>
            <span className="text-[10.5px] text-muted-text">JPG, PNG, or WEBP</span>
          </>
        )}
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
