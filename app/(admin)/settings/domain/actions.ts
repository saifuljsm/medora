"use server";

import dns from "dns/promises";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type ActionResult = { success: true } | { success: false; error: string };

const DomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Enter a valid domain, e.g. shop.example.com"),
});

export async function saveDomainAction(input: z.infer<typeof DomainSchema>): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = DomainSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid domain" };

  try {
    assertCan(session.user, "settings:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  try {
    // Changing the domain always resets verification — a previously
    // verified DNS pointing can't carry over to a different hostname.
    await prisma.org.update({
      where: { id: session.user.orgId },
      data: { customDomain: parsed.data.domain, domainVerifiedAt: null },
    });
  } catch {
    return { success: false, error: "That domain is already in use" };
  }

  return { success: true };
}

export async function clearDomainAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "settings:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  await prisma.org.update({ where: { id: session.user.orgId }, data: { customDomain: null, domainVerifiedAt: null } });
  return { success: true };
}

export type DnsCheckResult = { success: true; records: string[] } | { success: false; error: string };

/** A real DNS lookup so the owner can confirm their CNAME/A record is actually pointed before self-attesting it's live. */
export async function checkDomainDnsAction(domain: string): Promise<DnsCheckResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "settings:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  try {
    try {
      const cnames = await dns.resolveCname(domain);
      return { success: true, records: cnames };
    } catch {
      const addresses = await dns.resolve4(domain);
      return { success: true, records: addresses };
    }
  } catch {
    return { success: false, error: "No DNS record found for that domain yet — add a CNAME or A record and try again." };
  }
}

/** Owner/admin self-attestation once they've confirmed DNS is pointed correctly — see checkDomainDnsAction. */
export async function markDomainVerifiedAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "settings:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const org = await prisma.org.findUniqueOrThrow({ where: { id: session.user.orgId } });
  if (!org.customDomain) return { success: false, error: "Set a domain first" };

  await prisma.org.update({ where: { id: session.user.orgId }, data: { domainVerifiedAt: new Date() } });
  return { success: true };
}
