import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { supportEmail } from "@/lib/site";

export const metadata: Metadata = { title: "アカウントとデータの削除", description: "くじぐらしの匿名アカウントとランキング記録の削除方法、削除対象、保存期間をご案内します。", alternates: { canonical: "/delete-account" } };

export default function DeleteAccountPage() {
  return <><SiteHeader /><main><PageHero title="アカウント・データ削除" description="端末内のゲームデータ、匿名ランキングアカウント、公開記録の削除範囲と現在の実装状況をご案内します。" /><section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20"><div className="rounded-2xl border border-[#dfb96a] bg-[#fff4d9] p-7"><h2 className="text-2xl font-black tracking-[-.05em] text-[#6d3e0e]">現在の状況：公開前の実装・検証が必要です</h2><p className="mt-3 leading-7 text-[#6c541d]">現在のアプリには、匿名Supabaseアカウントと公開ランキング記録を利用者の依頼に正確に紐づけて削除するための、アプリ内リクエストコードまたは削除ボタンが実装されていません。そのため、本ページをGoogle Play Consoleのアカウント削除URLとして提出したり、メールだけで削除が完了すると案内したりすることはできません。</p></div><article className="page-prose mt-12"><h2>削除対象</h2><p>公開前に削除機能が実装された後、ご本人確認が完了した依頼について、次のデータを処理します。</p><ul><li>Supabaseの匿名認証アカウント</li><li>該当アカウントのプロフィールとニックネーム</li><li>公開ランキング、最近の1等記録、個人の挑戦記録</li><li>ランキング実行セッション、送信待ち・検証関連の記録</li><li>運営者が保有する、当該依頼に関するサポート識別情報</li></ul><h2>端末内のデータ</h2><p>ゲームの進行・設定・キャッシュは、Androidの設定からアプリのストレージを消去するか、アプリをアンインストールすることで端末から削除できます。この操作だけでは、サーバー上の匿名アカウントや公開ランキング記録は削除されません。</p><h2>公開前の実装基準</h2><ol><li>アプリ内で匿名アカウントを正確に識別できる削除リクエストコードまたは削除ボタンを用意します。</li><li>アプリ外からも開ける削除リクエストページと、実際の処理手順を用意します。</li><li>テストアカウントで、認証アカウントからプロフィール・ランキング・セッションデータまで処理されることを検証します。</li><li>受付確認、処理期限、バックアップ失効、ご本人確認の基準を公開文書で確定します。</li></ol><div className="mt-8 rounded-xl border border-[#e5a7a3] bg-[#fff0ef] p-5 text-[#85231e]"><p className="m-0 leading-7">上記が完了するまで、本ページをアカウント削除機能が提供されているページとして表示しません。サポートへのお問い合わせは可能ですが、現時点ではメールだけで匿名アカウントの正確な識別・削除を保証できません。</p></div><h2>お問い合わせ</h2><p>個人情報に関するお問い合わせは <a href={`mailto:${supportEmail}`}>{supportEmail}</a> までお送りください。削除機能の実装状況にかかわらず、一般のお問い合わせは受け付けています。</p></article></section></main><SiteFooter /></>;
}
