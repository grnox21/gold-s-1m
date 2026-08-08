export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
        <p className="label-caps text-[0.62rem] text-ash">Yükleniyor</p>
      </div>
    </div>
  );
}
