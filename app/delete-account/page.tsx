import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { supportEmail } from "@/lib/site";

export const metadata: Metadata = { title: "계정 및 데이터 삭제 안내", description: "로또 인생 계정 및 데이터 삭제 안내입니다.", alternates: { canonical: "/delete-account" } };

export default function DeleteAccountPage() {
  return <><SiteHeader /><main><PageHero title="계정 및 데이터 삭제 안내" description="기기 내 게임 데이터와 익명 랭킹 계정·기록의 삭제 범위와 현재 구현 상태를 안내합니다." /><section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20"><div className="rounded-2xl border border-[#f0ce9d] bg-[#fff8eb] p-7"><h2 className="text-2xl font-black tracking-[-.05em] text-[#724a00]">현재 상태: 출시 전 구현·검증 필요</h2><p className="mt-3 leading-7 text-[#6c541d]">현재 앱에는 익명 Supabase 계정과 공개 랭킹 기록을 이용자 요청과 정확히 연결해 삭제할 수 있는 앱 내 요청 코드 또는 삭제 버튼이 구현되어 있지 않습니다. 따라서 이 페이지를 Play Console의 계정 삭제 URL로 제출하거나, 이메일 문의만으로 삭제가 완료된다고 안내해서는 안 됩니다.</p></div><article className="page-prose mt-12"><h2>삭제 대상</h2><p>출시 전 삭제 기능이 구현되면 본인 확인이 끝난 요청에 대해 다음 대상을 처리해야 합니다.</p><ul><li>Supabase 익명 인증 계정</li><li>해당 계정의 프로필과 닉네임</li><li>해당 계정의 공개 랭킹, 최근 당첨자 기록, 개인 도전 기록</li><li>랭킹 실행 세션과 제출 대기·검증 관련 기록</li><li>운영자가 보유한 해당 요청의 고객지원 식별 정보</li></ul><h2>기기 내 데이터</h2><p>게임 진행·설정·캐시는 Android 설정에서 앱 저장공간을 삭제하거나 앱을 삭제하면 기기에서 제거할 수 있습니다. 이 동작만으로는 서버의 익명 계정 또는 공개 랭킹 기록이 삭제되지 않습니다.</p><h2>출시 전 구현 기준</h2><ol><li>앱 안에서 익명 계정을 정확히 식별할 수 있는 삭제 요청 코드 또는 삭제 버튼을 제공합니다.</li><li>앱 밖에서도 열리는 삭제 요청 페이지와 실제 처리 절차를 제공합니다.</li><li>테스트 계정으로 인증 계정부터 프로필·랭킹·세션 데이터까지 처리되는지 검증합니다.</li><li>접수 확인·처리 기한·백업 만료와 본인 확인 기준을 공개 문서에 확정합니다.</li></ol><div className="mt-8 grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-[#f1c3c3] bg-[#fff3f3] p-5 text-[#8a2929]"><strong>!</strong><p className="m-0 leading-7">위 항목이 완료되기 전에는 이 페이지를 계정 삭제 기능이 제공되는 페이지로 표시하지 않습니다. 문의는 고객지원으로 보낼 수 있지만, 현재 이메일만으로 익명 계정의 정확한 식별·삭제를 보장할 수 없습니다.</p></div><h2>문의</h2><p>개인정보 관련 문의는 <a href={`mailto:${supportEmail}`}>{supportEmail}</a>으로 보내 주세요. 현재 삭제 구현 상태와 별개로 일반 문의를 접수할 수 있습니다.</p></article></section></main><SiteFooter /></>;
}
