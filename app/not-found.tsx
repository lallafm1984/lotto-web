import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#fffaf0] p-6 text-center"><div><p className="text-sm font-black tracking-[.15em] text-[#b71912]">404</p><h1 className="mt-2 font-serif text-4xl font-black tracking-[-.06em] text-[#281407]">ページが見つかりません。</h1><Link href="/" className="button-primary mt-6">くじぐらし ホームへ</Link></div></main>;
}
