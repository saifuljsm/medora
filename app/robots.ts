import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/account", "/order-confirmation", "/api/"],
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL ?? "https://medora.example"}/sitemap.xml`,
  };
}
