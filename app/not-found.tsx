import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center"><div><p className="text-sm font-black tracking-[.15em] text-lotto-violet">404</p><h1 className="mt-2 text-4xl font-black tracking-[-.06em] text-lotto-navy">페이지를 찾을 수 없습니다.</h1><Link href="/" className="mt-6 inline-flex rounded-xl bg-lotto-navy px-5 py-3 font-bold text-white">로또 인생 홈으로</Link></div></main>;
}
