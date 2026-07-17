import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName}｜数字くじ確率体験`, template: `%s｜${siteName}` },
  description: "6/43、1等確率は6,096,454分の1。選んで、回して、記録する数字抽せんシミュレーション。",
  openGraph: { type: "website", locale: "ja_JP", siteName },
  icons: { icon: "/marketing/app-icon.png", apple: "/marketing/app-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
