import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const pages = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/support", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/delete-account", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-30"),
    changeFrequency,
    priority,
  }));
}
