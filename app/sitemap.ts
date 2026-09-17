import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL ?? "https://medora.example";
  const org = await getOrg();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { orgId: org.id, active: true }, select: { slug: true } }),
    prisma.product.findMany({ where: { slug: { not: null } }, select: { slug: true } }),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/search`, changeFrequency: "weekly", priority: 0.5 },
    ...categories.map((c) => ({ url: `${base}/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/medicines/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
