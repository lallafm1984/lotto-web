import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName}｜ロト風数字くじシミュレーション`, template: `%s｜${siteName}` },
  description: "1〜43から6つを選び、約610万分の1を体験するロト風の数字くじシミュレーション。現金・景品は受け取れません。",
  openGraph: { type: "website", locale: "ja_JP", siteName },
  icons: { icon: "/marketing/app-icon.png", apple: "/marketing/app-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
