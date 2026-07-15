import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} | 무료 가상 로또 시뮬레이션`, template: `%s | ${siteName}` },
  description: "로또 인생은 실제 복권과 무관한 무료 가상 로또 시뮬레이션 게임입니다.",
  openGraph: { type: "website", locale: "ko_KR", siteName },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
