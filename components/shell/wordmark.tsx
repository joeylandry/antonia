export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-lg font-semibold leading-none text-primary-foreground"
      >
        A
      </span>
      <span className="font-display text-lg font-medium tracking-tight">Antonia</span>
    </span>
  );
}
