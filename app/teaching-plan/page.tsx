import type { Metadata } from "next";
import { headers } from "next/headers";
import { PlanViewer } from "./plan-viewer";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const imageUrl = host ? `${protocol}://${host}/og.png` : "/og.png";
  const title = "교수학습 및 평가 운영계획";
  const description = "2026학년도 1학년 2학기 과목별·월별 교수학습 및 평가 운영계획";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      images: [{ url: imageUrl, width: 1731, height: 909, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function TeachingPlanPage() {
  return <PlanViewer />;
}
