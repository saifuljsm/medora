import { NextResponse } from "next/server";
import { z } from "zod";
import { createPresignedUpload } from "@/lib/r2";

// Deliberately unauthenticated — a guest with no account (customer auth
// doesn't exist yet) still needs to be able to upload a prescription photo,
// either standalone (Phase 2.11) or from checkout (Phase 2.5). Separate
// route from /api/upload/presign (staff-only) so the two auth models never
// get tangled — this one is hardcoded to prescription-photo only.
const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = PresignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const presigned = await createPresignedUpload({ purpose: "prescription-photo", ...parsed.data });
    return NextResponse.json(presigned);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to presign upload" }, { status: 500 });
  }
}
