export function AdminPageHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl text-warm-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ash">{description}</p>}
      </div>
      {action}
    </div>
  );
}
