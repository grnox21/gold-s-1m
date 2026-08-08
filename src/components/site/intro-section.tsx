import { Reveal } from "./reveal";

export function IntroSection() {
  return (
    <section className="section-marble">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:py-32">
        <Reveal>
          <p className="label-caps mb-6 text-[0.68rem] text-gold-deep">Yusuf Demir Erkek Kuaförü</p>
          <p className="font-display text-2xl leading-relaxed text-ink sm:text-3xl lg:text-[2.15rem]">
            Her randevu, kişiye özel bir bakım deneyimidir. Klasik berberlik zanaatını modern bir
            atmosferde buluşturuyor; saç, sakal ve bakımda özenli, sakin ve konforlu bir hizmet
            sunuyoruz.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
