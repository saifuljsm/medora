import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { createPresignedUpload } from "@/lib/r2";

// Staff-only for now: product images (catalog:manage) and prescription
// photos captured at the POS counter (prescription:review). The
// customer-facing prescription-order upload (Phase 2.11) needs its own
// handling once customer auth exists — a guest with no account has to be
// able to reach it, which this staff-session gate doesn't allow.
const PresignRequestSchema = z.object({
  purpose: z.enum(["product-image", "prescription-photo"]),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PresignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    if (parsed.data.purpose === "product-image") {
      assertCan(session.user, "catalog:manage");
    } else {
      assertCan(session.user, "prescription:review");
    }
  } catch {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  try {
    const presigned = await createPresignedUpload(parsed.data);
    return NextResponse.json(presigned);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to presign upload" }, { status: 500 });
  }
}
