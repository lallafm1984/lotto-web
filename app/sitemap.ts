import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const paths = ["", "/privacy", "/terms", "/support", "/delete-account"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({ url: `${siteUrl}${path}`, lastModified: new Date("2026-07-14") }));
}
