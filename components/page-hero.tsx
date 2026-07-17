import Link from "next/link";

type PageHeroProps = { title: string; description: string };

export function PageHero({ title, description }: PageHeroProps) {
  return (
    <section id="main" className="border-b border-[#d8b563] bg-[#25170d] py-14 text-white sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"><p className="mb-5 text-sm font-bold text-[#d8b563]"><Link href="/" className="hover:text-white">ホーム</Link> / {title}</p><h1 className="text-balance font-serif text-4xl font-black tracking-[-.06em] sm:text-6xl">{title}</h1><p className="mt-4 max-w-3xl leading-7 text-[#ddd0c2]">{description}</p></div>
    </section>
  );
}
