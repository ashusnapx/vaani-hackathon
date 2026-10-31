import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// The landing page is public; the operator's pages and the API are not for search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/service-people", "/api/"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
