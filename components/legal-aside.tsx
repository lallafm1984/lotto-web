type LegalAsideProps = {
  items: readonly { id: string; label: string }[];
};

export function LegalAside({ items }: LegalAsideProps) {
  return <aside className="sticky top-24 hidden self-start rounded-2xl border border-slate-200 bg-white p-5 lg:block"><strong className="mb-3 block text-sm text-lotto-navy">이 문서의 내용</strong>{items.map((item) => <a key={item.id} href={`#${item.id}`} className="block py-1.5 text-sm text-slate-500 hover:text-lotto-violet">{item.label}</a>)}</aside>;
}
