"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { href: "/#how-to-play", label: "ゲーム紹介" },
  { href: "/#screens", label: "ゲーム画面" },
  { href: "/#documents", label: "安心・安全" },
  { href: "/support", label: "サポート" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">本文へ移動</a>
      <div className="bg-[#21140b] px-4 py-2 text-center text-xs font-bold tracking-[.04em] text-[#f5d88e] sm:text-sm">
        日本向けAndroid版を準備中です
      </div>
      <header className="sticky top-0 z-40 border-b border-[#dfcda9] bg-[#fffaf0]/95 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-[4.75rem] w-full max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8" aria-label="メインメニュー">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="くじぐらし ホーム">
            <Image src="/marketing/app-icon.png" alt="" width={44} height={44} className="size-11 rounded-xl border border-[#d8b563]" />
            <span className="font-serif text-xl font-black tracking-[-.05em] text-[#281407]">くじぐらし<small className="block font-sans text-[.58rem] font-black tracking-[.16em] text-[#9a7440]">BY 4L TREE</small></span>
          </Link>
          <button ref={menuButtonRef} type="button" className="min-h-11 rounded-full border border-[#c9aa6b] px-4 py-2 text-sm font-black text-[#3b2513] lg:hidden" aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"} aria-controls="mobile-menu" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>{isOpen ? "閉じる" : "メニュー"}</button>
          <div id="mobile-menu" className={`${isOpen ? "grid" : "hidden"} absolute left-4 right-4 top-[4.4rem] gap-1 rounded-2xl border border-[#dfcda9] bg-[#fffaf0] p-3 shadow-[0_18px_45px_rgba(48,31,12,.16)] lg:static lg:flex lg:items-center lg:gap-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
            {navigation.map((item) => {
              const current = item.href === pathname;
              return <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} onClick={() => setIsOpen(false)} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-colors ${current ? "text-[#b71912]" : "text-[#644d36] hover:bg-[#f4e6c9] hover:text-[#b71912]"}`}>{item.label}</Link>;
            })}
          </div>
          <Link href="/support" className="hidden rounded-full bg-[#b71912] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#95110c] lg:inline-flex">お問い合わせ</Link>
        </nav>
      </header>
    </>
  );
}
