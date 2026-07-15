"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/#features", label: "게임 소개" },
  { href: "/#documents", label: "공개 문서" },
  { href: "/support", label: "고객지원" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <div className="bg-[#fff3d8] px-4 py-2 text-center text-xs font-medium text-[#654100] sm:text-sm">
        출시 준비 중인 안내 사이트입니다. 개인정보와 계정 삭제 기능은 앱 공개 전 최종 검토가 필요합니다.
      </div>
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8" aria-label="주요 메뉴">
          <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold tracking-[-0.04em]" aria-label="로또 인생 홈">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-lotto-violet to-lotto-blue text-sm font-black text-white shadow-lg shadow-lotto-violet/25">L</span>
            <span className="text-[1.05rem]">로또 인생<small className="block text-[0.64rem] font-bold tracking-[0.12em] text-slate-500">4L TREE</small></span>
          </Link>
          <button type="button" className="grid size-10 place-items-center rounded-lg text-lotto-navy hover:bg-slate-100 md:hidden" aria-label="메뉴 열기" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>☰</button>
          <div className={`${isOpen ? "grid" : "hidden"} absolute left-4 right-4 top-16 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-card md:static md:flex md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
            {navigation.map((item) => {
              const current = item.href === pathname;
              return <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} onClick={() => setIsOpen(false)} className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${current ? "text-lotto-violet" : "text-slate-600 hover:bg-slate-50 hover:text-lotto-violet"}`}>{item.label}</Link>;
            })}
          </div>
          <Link href="/support" className="hidden rounded-xl bg-lotto-navy px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg md:inline-flex">문의하기</Link>
        </nav>
      </header>
    </>
  );
}
