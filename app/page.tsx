import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicDocuments, supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const features = [
  ["01", "가상 번호 선택", "게임 안에서 번호를 고르고 매주 결과를 확인하세요. 실제 복권 구매나 결제는 포함하지 않습니다."],
  ["02", "나만의 진행 기록", "게임 진행, 구매 통계, 튜토리얼 상태와 설정을 기기 안에 저장하고 이어서 즐길 수 있습니다."],
  ["03", "익명 랭킹", "원할 때 닉네임으로 가상 게임 기록을 공유하고 다른 이용자의 기록을 살펴볼 수 있습니다."],
] as const;

const steps = [
  ["01", "번호 선택", "원하는 번호를 고르고 게임 속 가상 티켓을 준비합니다."],
  ["02", "결과 확인", "매주 진행되는 게임 결과와 나의 기록 변화를 확인합니다."],
  ["03", "기록 이어가기", "통계와 랭킹을 살펴보며 다음 가상 도전을 이어갑니다."],
] as const;

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">본문으로 건너뛰기</a>
      <SiteHeader />
      <main id="main">
        <section className="bg-[radial-gradient(circle_at_14%_10%,rgba(89,111,245,.25),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(255,216,75,.18),transparent_30%),linear-gradient(135deg,#101c40_0%,#1d2d64_47%,#544cc8_100%)] py-20 text-white sm:py-24 lg:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:px-8">
            <div><p className="inline-flex items-center gap-2 text-sm font-extrabold tracking-[.05em] text-[#d9d9ff]"><span className="h-0.5 w-6 bg-lotto-yellow" />4L TREE · LOTTO LIFE</p><h1 className="mt-4 break-keep-all text-5xl font-black leading-[1.08] tracking-[-.07em] sm:text-6xl lg:text-7xl">번호를 고르고,<br /><span className="text-lotto-yellow">나만의 기록</span>을<br />만들어 보세요.</h1><p className="mt-6 max-w-xl break-keep-all text-lg leading-8 text-[#dce4ff]">로또 인생은 실제 복권 구매·당첨금 지급·환전과 무관한 무료 가상 시뮬레이션 게임입니다. 매주 번호를 선택하고, 게임 속 기록과 랭킹을 즐겨보세요.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#how-to-play" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-lotto-yellow px-5 font-extrabold text-lotto-navy transition hover:-translate-y-0.5 hover:shadow-lg">게임 알아보기 ↓</a><Link href="/support" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/35 bg-white/5 px-5 font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg">고객지원</Link></div><ul className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#c5d2ff]"><li>✓ 무료 가상 게임</li><li>✓ 실제 금전 거래 없음</li><li>✓ Android 출시 준비 중</li></ul></div>
            <div className="ticket-shine relative mx-auto min-h-[390px] w-full max-w-[430px] rotate-0 overflow-hidden rounded-[30px] border border-white/30 p-7 shadow-ticket sm:rotate-[2.2deg]"><div className="absolute -right-16 -top-24 size-64 rounded-full border-[44px] border-lotto-yellow/15" /><div className="relative flex items-center justify-between text-xs font-extrabold tracking-[.08em]"><span>LOTTO LIFE</span><strong className="text-base text-lotto-yellow">WEEK 52</strong></div><h2 className="relative mt-7 text-2xl font-black leading-tight tracking-[-.05em]">오늘의 번호를<br />선택해 보세요</h2><p className="relative mt-2 text-sm text-[#d5dfff]">게임 안에서 만들어지는 가상 번호와 기록입니다.</p><div className="relative mt-7 grid max-w-[310px] grid-cols-3 gap-3" aria-label="예시 번호 4, 12, 19, 27, 33, 41">{["4", "12", "19", "27", "33", "41"].map((number, index) => <span key={number} className={`grid aspect-square w-[72px] place-items-center rounded-full text-2xl font-black shadow-lg shadow-slate-950/20 ${index === 1 ? "bg-[#3d8ce8] text-white" : index === 2 ? "bg-lotto-yellow text-[#3e3100]" : index === 4 ? "bg-[#f16a6a] text-white" : "bg-white text-lotto-navy"}`}>{number}</span>)}</div><div className="absolute inset-x-7 bottom-6 flex justify-between border-t border-dashed border-white/40 pt-4 text-xs text-[#e5ebff]"><span>MY LOTTO RECORD</span><strong className="text-lotto-yellow">가상 1등 도전</strong></div></div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24" id="features"><div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"><SectionHeading label="게임 소개" title={<>가볍게 시작해도,<br />기록은 꾸준히 쌓입니다.</>} description="번호 선택부터 게임 진행, 나만의 통계와 랭킹 기록까지. 짧게 즐겨도 다음 주가 기다려지는 흐름을 만들었습니다." /><div className="grid gap-4 md:grid-cols-3">{features.map(([number, title, description]) => <article key={number} className="rounded-[18px] border border-slate-200 bg-white p-7 shadow-sm"><span className="grid size-11 place-items-center rounded-[14px] bg-gradient-to-br from-lotto-violet to-lotto-blue text-sm font-black text-white">{number}</span><h3 className="mt-5 text-lg font-black tracking-[-.04em]">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}</div><div className="mx-auto mt-10 grid max-w-5xl grid-cols-[auto_1fr] gap-4 rounded-2xl border border-[#e8d998] bg-[#fff9df] p-5 text-[#644d00]"><strong className="text-lg">!</strong><p className="text-sm leading-6"><b>안내</b> 로또 인생의 금액·번호·당첨 기록은 모두 게임 안에서 생성되는 가상 정보입니다. 실제 복권 발행·판매 기관과 제휴하거나 이를 대리하지 않습니다.</p></div></div></section>

        <section className="bg-[#f0f3fb] py-20 sm:py-24" id="how-to-play"><div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"><SectionHeading label="즐기는 방법" title={<>세 단계로<br />바로 시작하세요.</>} description="복잡한 절차 없이 게임을 열고, 번호를 선택하고, 가상 기록을 쌓아 보세요." /><div className="grid gap-5 md:grid-cols-3">{steps.map(([number, title, description]) => <article key={number} className="rounded-[18px] bg-white p-7"><span className="grid size-9 place-items-center rounded-full bg-[#eeecff] text-xs font-black text-lotto-violet">{number}</span><h3 className="mt-5 text-lg font-black tracking-[-.04em]">{title}</h3><p className="mt-2 text-slate-500">{description}</p></article>)}</div></div></section>

        <section className="bg-white py-20 sm:py-24" id="documents"><div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"><SectionHeading label="공개 문서" title={<>서비스 이용에 필요한<br />안내를 투명하게 제공합니다.</>} description="개인정보 처리, 이용약관, 고객지원과 계정·데이터 삭제에 관한 내용을 확인할 수 있습니다." /><div className="grid gap-4 sm:grid-cols-2">{publicDocuments.map((document) => <Link key={document.href} href={document.href} className="group flex min-h-28 items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-lotto-violet/40 hover:shadow-card"><span><small className="block text-xs font-black tracking-[.1em] text-lotto-violet">{document.eyebrow}</small><strong className="mt-1 block text-lg tracking-[-.04em]">{document.title}</strong></span><span className="text-xl text-lotto-violet transition group-hover:translate-x-1">→</span></Link>)}</div></div></section>

        <section className="bg-[#f0f3fb] py-20 sm:py-24"><div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"><div className="grid gap-6 rounded-[28px] bg-gradient-to-br from-[#142550] to-[#3d46a5] p-8 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:p-10"><div><h2 className="break-keep-all text-3xl font-black tracking-[-.06em]">도움이 필요하신가요?</h2><p className="mt-2 text-[#ced7fa]">앱 사용, 광고, 랭킹, 개인정보 관련 문의를 고객지원으로 보내 주세요.</p></div><a href={`mailto:${supportEmail}?subject=%5B%EB%A1%9C%EB%98%90%20%EC%9D%B8%EC%83%9D%20%EB%AC%B8%EC%9D%98%5D`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-lotto-yellow px-5 font-extrabold text-lotto-navy transition hover:-translate-y-0.5 hover:shadow-lg">이메일 문의하기</a></div></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionHeading({ label, title, description }: { label: string; title: ReactNode; description: string }) {
  return <div className="mb-10 max-w-2xl"><p className="text-xs font-black tracking-[.1em] text-lotto-violet">{label}</p><h2 className="mt-2 break-keep-all text-3xl font-black leading-tight tracking-[-.06em] sm:text-5xl">{title}</h2><p className="mt-4 break-keep-all text-slate-500">{description}</p></div>;
}
