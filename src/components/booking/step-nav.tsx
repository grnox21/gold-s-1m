import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Devam Et",
  nextDisabled,
  nextLoading,
  hideBack,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-8">
      {!hideBack && onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="px-0">
          <ArrowLeft className="size-3.5" /> Geri
        </Button>
      ) : (
        <span />
      )}
      {onNext && (
        <Button type="button" onClick={onNext} disabled={nextDisabled || nextLoading} size="lg">
          {nextLoading ? "Yükleniyor…" : nextLabel} {!nextLoading && <ArrowRight className="size-3.5" />}
        </Button>
      )}
    </div>
  );
}
