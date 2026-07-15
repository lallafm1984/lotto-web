import Link from "next/link";
import { publicDocuments, supportEmail } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-[#102044] py-11 text-[#bdc8e6]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-7 sm:grid-cols-[1.1fr_1fr]">
          <div><Link href="/" className="font-black text-white">로또 인생 · 4L TREE</Link><p className="mt-3 max-w-md text-sm">실제 복권 구매·당첨금 지급·환전과 무관한 무료 가상 시뮬레이션 게임입니다.</p></div>
          <div className="flex flex-wrap content-start gap-x-5 gap-y-2 sm:justify-end">{publicDocuments.map((document) => <Link key={document.href} href={document.href} className="text-sm text-[#d9e1f7] hover:text-white">{document.title}</Link>)}<a href="https://www.4ltree.com/" className="text-sm text-[#d9e1f7] hover:text-white">4L TREE</a></div>
        </div>
        <div className="mt-9 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-[#99a8c9] sm:flex-row sm:justify-between"><span>© 2026 4L TREE. All rights reserved.</span><a href={`mailto:${supportEmail}`} className="hover:text-white">문의: {supportEmail}</a></div>
      </div>
    </footer>
  );
}
