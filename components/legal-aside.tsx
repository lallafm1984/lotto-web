type LegalAsideProps = { items: readonly { id: string; label: string }[] };

export function LegalAside({ items }: LegalAsideProps) {
  return <><details className="order-first rounded-2xl border border-[#e4d5b7] bg-[#fffaf0] p-5 lg:hidden"><summary className="min-h-11 cursor-pointer font-bold text-[#281407]">このページの内容</summary><nav aria-label="ページ内目次" className="mt-2">{items.map((item) => <a key={item.id} href={`#${item.id}`} className="flex min-h-11 items-center border-t border-[#eee3cf] text-sm text-[#75614c] hover:text-[#b71912]">{item.label}</a>)}</nav></details><aside className="sticky top-24 hidden self-start rounded-2xl border border-[#e4d5b7] bg-[#fffaf0] p-5 lg:block"><strong className="mb-3 block text-sm text-[#281407]">このページの内容</strong>{items.map((item) => <a key={item.id} href={`#${item.id}`} className="flex min-h-10 items-center text-sm text-[#75614c] hover:text-[#b71912]">{item.label}</a>)}</aside></>;
}
