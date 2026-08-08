import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "dark",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("label-caps mb-4 text-[0.68rem]", tone === "dark" ? "text-gold" : "text-gold-deep")}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn("font-display text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]", tone === "dark" ? "text-warm-white" : "text-ink")}>
        {title}
      </h2>
      {description && (
        <p className={cn("mt-5 text-base leading-relaxed", tone === "dark" ? "text-ash" : "text-ink/70")}>
          {description}
        </p>
      )}
    </div>
  );
}
