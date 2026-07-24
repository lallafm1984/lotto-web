import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { playStoreUrl, publicDocuments } from "@/lib/site";

export const metadata: Metadata = {
  title: "約610万分の1を体験する数字くじゲーム",
  description: "18歳以上対象。1〜43から6つを選び、1等確率1/6,096,454の6/43方式に挑戦する数字抽せんシミュレーション。現金・景品は受け取れません。",
  alternates: { canonical: "/" },
};

const playSteps = [
  ["01", "6つ選ぶ", "1〜43から好きな数字を6つ選択。空欄は自動で選べるので、すぐに始められます。"],
  ["02", "抽せんする", "赤いボタンを押して結果を確認。1口ごとの確率は、強化しても変わりません。"],
  ["03", "記録して育てる", "はずれも当せんも記録。くじ枠と自動抽せんを育て、挑戦回数を増やします。"],
] as const;

const screenshots = [
  ["/marketing/screen-01.png", "ゲーム内1等確率、約610万分の1", "抽せん結果と数字の出現回数"],
  ["/marketing/screen-04.png", "6つ選んで、いざ抽せん", "空欄は自動選択"],
  ["/marketing/screen-02.png", "挑戦回数を少しずつ育てる", "くじ枠の追加"],
  ["/marketing/screen-03.png", "抽せんは、やがて自動へ", "14種類の自動抽せんアイテム"],
  ["/marketing/screen-05.png", "ゲーム内1等まで、何回？", "結果とランキング"],
] as const;

export default function HomePage() {
  return (
    <div className="overflow-x-clip bg-[#fffaf0]">
      <SiteHeader />
      <main id="main">
        <section className="relative border-b border-[#d8b563]/45 bg-[#fff7e3] py-14 sm:py-20 lg:py-24">
          <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-8 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
            <div className="relative z-10 min-w-0 lg:col-start-1 lg:row-start-1">
              <p className="eyebrow">6/43 確率体験</p>
              <h1 className="mt-5 text-5xl font-black leading-[1.03] tracking-[-.075em] text-[#281407] sm:text-6xl lg:text-[4.25rem]">
                <span className="sm:whitespace-nowrap">610万分の1を、</span><br /><span className="text-[#b71912] sm:whitespace-nowrap">体験しよう。</span>
              </h1>
            </div>

            <div className="relative min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
              <Image src="/marketing/hero-jp.png" alt="" width={1795} height={876} priority className="h-auto w-full rounded-2xl shadow-[0_30px_80px_rgba(67,36,5,.22)]" />
            </div>

            <div className="relative z-10 min-w-0 lg:col-start-1 lg:row-start-2">
              <p className="mt-6 max-w-xl text-pretty text-lg font-medium leading-8 text-[#644d36] sm:text-xl">
                1〜43から6つを選び、抽せんして、記録する。<br />あなたは何回目で、<br className="sm:hidden" />ゲーム内1等に出会えるでしょうか。
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="button-primary w-full sm:w-auto" aria-label="Google Playでくじぐらしをインストール">Google Playでインストール</a>
                <a href="#how-to-play" className="button-secondary w-full sm:w-auto">遊び方を見る</a>
              </div>
              <dl className="mt-10 grid max-w-xl grid-cols-2 border-y border-[#d8b563] py-5 sm:grid-cols-3 sm:divide-x sm:divide-[#d8b563]">
                <div className="col-span-2 border-b border-[#d8b563] pb-4 text-center sm:col-span-1 sm:border-b-0 sm:px-4 sm:text-left"><dt className="text-xs font-bold text-[#705735]">ゲーム内1等</dt><dd className="mt-1 whitespace-nowrap text-xl font-black text-[#2a180b]">1 / 6,096,454</dd></div>
                <div className="mt-4 border-r border-[#d8b563] pr-4 sm:mt-0 sm:border-r-0 sm:px-4"><dt className="text-xs font-bold text-[#705735]">方式</dt><dd className="mt-1 text-2xl font-black text-[#2a180b]">6 / 43</dd></div>
                <div className="mt-4 pl-4 sm:mt-0"><dt className="text-xs font-bold text-[#705735]">現金・景品</dt><dd className="mt-1 text-2xl font-black text-[#2a180b]">なし</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section id="how-to-play" className="bg-[#fffaf0] py-16 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="eyebrow">遊び方</p>
              <h2 className="section-title">選んで、回して、<br />また挑む。</h2>
              <p className="section-copy">予想も、必勝法もありません。好きな数字で、長い挑戦を始めましょう。</p>
            </div>
            <div className="mt-12 grid border-y border-[#d9bd82] md:grid-cols-3 md:divide-x md:divide-[#d9bd82]">
              {playSteps.map(([number, title, description]) => (
                <article key={number} className="group border-b border-[#d9bd82] py-8 last:border-b-0 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0">
                  <span className="font-serif text-5xl font-bold text-[#a16f22]">{number}</span>
                  <h3 className="mt-5 text-2xl font-black tracking-[-.04em] text-[#281407]">{title}</h3>
                  <p className="mt-3 leading-7 text-[#715c45]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="screens" className="bg-[#0b2b65] py-16 text-white sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow !text-[#f4c85c]">ゲーム画面</p>
                <h2 className="mt-4 text-balance text-4xl font-black leading-tight tracking-[-.06em] sm:text-6xl">押すたび進む、<br />数字くじ生活。</h2>
              </div>
              <p className="max-w-md leading-7 text-[#cbd8f0]">実際のゲーム画面をご紹介します。数字選択から抽せん、育成、自動化、ランキングまで、挑戦のすべてを一つの記録に残せます。</p>
            </div>
            <p className="mt-8 text-sm font-bold text-[#cbd8f0] sm:hidden">横にスワイプして、5つの画面をご覧ください。</p>
            <div tabIndex={0} aria-label="ゲーム画面ギャラリー、全5枚" className="hide-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4c85c] sm:-mx-6 sm:mt-12 sm:px-6 lg:-mx-8 lg:px-8">
              {screenshots.map(([src, title, description], index) => (
                <figure key={src} className="w-[76vw] max-w-[330px] shrink-0 snap-center sm:w-[320px]">
                  <div className="overflow-hidden rounded-[1.75rem] border-4 border-[#e5bd5b] bg-black shadow-[0_24px_55px_rgba(0,0,0,.35)]">
                    <Image src={src} alt={`${title} — ${description}`} width={941} height={1672} sizes="(max-width: 640px) 76vw, 320px" className="h-auto w-full" />
                  </div>
                  <figcaption className="mt-5"><span className="text-xs font-black text-[#f4c85c]">0{index + 1}</span><strong className="mt-1 block text-lg">{title}</strong><span className="mt-1 block text-sm text-[#9eb3d7]">{description}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="experience" className="bg-[#15100c] py-16 text-white sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:px-8">
            <div>
              <p className="eyebrow !text-[#e8bd5d]">約610万分の1の遠さ</p>
              <h2 className="mt-4 text-balance text-4xl font-black leading-tight tracking-[-.06em] sm:text-6xl">当たらなさまで、<br />楽しもう。</h2>
            </div>
            <div className="border-l-2 border-[#b71912] pl-6 sm:pl-8">
              <p className="text-xl font-bold leading-9 text-[#f7e8cf]">強化しても、1口ごとの当たりやすさは変わりません。</p>
              <p className="mt-3 max-w-2xl leading-7 text-[#bcae9f]">増えるのは、一度に試せる口数と挑戦回数。約610万分の1という遠さと、ついにゲーム内1等が出た瞬間の驚きを、正直に楽しむゲームです。</p>
            </div>
          </div>
        </section>

        <section className="bg-[#f6ead0] py-16 sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div>
              <p className="eyebrow">確率はそのまま、挑戦回数は育つ</p>
              <h2 className="section-title">確率はそのまま。<br />挑戦回数は育つ。</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[1.5rem] border border-[#d6b66f] bg-[#fffaf0] p-7">
                <p className="text-sm font-black text-[#b71912]">くじ枠</p><h3 className="mt-3 text-2xl font-black tracking-[-.04em]">一度に試せる口数を増やす</h3><p className="mt-3 leading-7 text-[#715c45]">ゲーム内の小さな当せんを重ねて、毎回使えるくじ枠を追加できます。</p>
              </article>
              <article className="rounded-[1.5rem] border border-[#d6b66f] bg-[#fffaf0] p-7">
                <p className="text-sm font-black text-[#b71912]">自動抽せん</p><h3 className="mt-3 text-2xl font-black tracking-[-.04em]">14種類のアイテムを解放</h3><p className="mt-3 leading-7 text-[#715c45]">自動抽せんアイテムを集めると、アプリを開いている間、一定間隔で抽せんが進みます。</p>
              </article>
              <article className="rounded-[1.5rem] border border-[#d6b66f] bg-[#fffaf0] p-7 sm:col-span-2">
                <p className="text-sm font-black text-[#b71912]">ゲーム内1等のその先</p><h3 className="mt-3 text-2xl font-black tracking-[-.04em]">高速シミュレーターを解放</h3><p className="mt-3 max-w-2xl leading-7 text-[#715c45]">本編でゲーム内1等を達成すると、確率の途方もなさをさらに速く体験できるシミュレーターが開きます。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-24" id="documents">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
              <div>
                <p className="eyebrow">安心して遊ぶために</p>
                <h2 className="section-title">ゲーム内だけの<br />運だめし。</h2>
                <div className="mt-6 max-w-2xl rounded-2xl border-2 border-[#c6953c] bg-[#fff8e8] p-6 text-[#4d351f] shadow-[0_14px_35px_rgba(69,44,14,.08)]" role="note" aria-label="年齢対象とゲームの性質に関する重要なご案内">
                  <p className="font-black leading-7">※本ゲームは18歳以上の方を対象とした、ゲーム内のみの数字抽せんシミュレーションです。</p>
                  <p className="mt-3 leading-7">現金を賭ける機能はなく、現金・景品など現実の価値を持つものは獲得できません。</p>
                  <p className="mt-3 leading-7">実在の宝くじ・発行元・販売元とは無関係です。</p>
                  <p className="mt-5 border-t border-[#dbc08d] pt-4 text-sm font-bold leading-6 text-[#785b37]">遊びすぎに注意し、適度に休憩を取りながらお楽しみください。</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {publicDocuments.map((document) => (
                  <Link key={document.href} href={document.href} className="group rounded-2xl border border-[#e4d5b7] bg-[#fffaf0] p-6 transition hover:-translate-y-1 hover:border-[#bd8f35] hover:shadow-[0_18px_40px_rgba(69,44,14,.12)]">
                    <small className="text-xs font-black tracking-[.12em] text-[#b71912]">{document.eyebrow}</small>
                    <strong className="mt-2 block text-lg text-[#281407]">{document.title}</strong>
                    <span className="mt-4 block text-sm font-bold text-[#8a704f]">詳しく見る</span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-14 rounded-[1.75rem] bg-[#b71912] p-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10">
              <div><p className="text-xs font-black tracking-[.14em] text-[#ffd9b9]">ANDROID · JAPAN</p><h2 className="mt-3 text-3xl font-black tracking-[-.05em] sm:text-4xl">Google Playで配信中</h2><p className="mt-3 text-[#ffe5d4]">18歳以上対象。現金や景品を獲得できない数字抽せんシミュレーションです。</p></div>
              <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#fff3d6] px-6 font-black text-[#7b140f] transition hover:-translate-y-0.5 sm:mt-0" aria-label="Google Playでくじぐらしをインストール">Google Playでインストール</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
