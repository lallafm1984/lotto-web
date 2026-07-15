import Link from "next/link";

type PageHeroProps = {
  title: string;
  description: string;
};

export function PageHero({ title, description }: PageHeroProps) {
  return (
    <section className="bg-gradient-to-r from-lotto-navy to-[#4144a0] py-14 text-white sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8"><p className="mb-4 text-sm text-[#cbd7fb]"><Link href="/" className="hover:text-white">홈</Link> / {title}</p><h1 className="break-keep-all text-4xl font-black tracking-[-0.07em] sm:text-6xl">{title}</h1><p className="mt-3 max-w-3xl text-[#dbe3ff]">{description}</p></div>
    </section>
  );
}
