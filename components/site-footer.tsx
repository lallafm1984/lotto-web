import Image from "next/image";
import Link from "next/link";
import { publicDocuments, supportEmail } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-[#160f0a] py-12 text-[#cdbda9]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-white"><Image src="/marketing/app-icon.png" alt="" width={42} height={42} className="size-10 rounded-xl" /><span className="font-serif text-xl font-black">くじぐらし</span></Link>
            <p className="mt-4 max-w-lg text-sm leading-6">1〜43から6つを選び、ゲーム内1等までの道のりを楽しむ数字抽せんシミュレーションです。</p>
            <p className="mt-2 max-w-lg text-xs leading-5 text-[#9f8d7b]">実在の宝くじとは無関係です。ゲーム内の金額と抽せん結果はすべて仮想で、購入・換金、現金や景品の獲得はできません。</p>
          </div>
          <div className="flex flex-wrap content-start gap-x-5 gap-y-3 sm:justify-end">{publicDocuments.map((document) => <Link key={document.href} href={document.href} className="text-sm text-[#e4d7c7] hover:text-white">{document.title}</Link>)}<a href="https://www.4ltree.com/" className="text-sm text-[#e4d7c7] hover:text-white">4L TREE</a></div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-[#958575] sm:flex-row sm:justify-between"><span>© 2026 4L TREE. All rights reserved.</span><a href={`mailto:${supportEmail}`} className="hover:text-white">お問い合わせ：{supportEmail}</a></div>
      </div>
    </footer>
  );
}
