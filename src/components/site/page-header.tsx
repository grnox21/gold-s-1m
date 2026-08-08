export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="border-b border-border bg-ink pt-36 pb-16 lg:pt-44 lg:pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <p className="label-caps mb-5 text-[0.68rem] text-gold">{eyebrow}</p>
        <h1 className="max-w-2xl font-display text-4xl text-warm-white sm:text-5xl lg:text-6xl">{title}</h1>
        {description && <p className="mt-6 max-w-xl text-base leading-relaxed text-ash">{description}</p>}
      </div>
    </section>
  );
}
