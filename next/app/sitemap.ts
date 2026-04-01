import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://marketing-zeta-flame.vercel.app";
  return [
    { url: base, changefreq: "weekly", priority: 1.0 },
    { url: `${base}/privacy`, changefreq: "yearly", priority: 0.6 },
    { url: `${base}/terms`, changefreq: "yearly", priority: 0.6 },
    { url: `${base}/security`, changefreq: "yearly", priority: 0.5 },
  ];
}
