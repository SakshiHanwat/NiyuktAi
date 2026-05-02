export function DotGrid() {
  return (
    <>
      <div className="dot-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      {/* Soft radial fade so dots don't compete with the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 30%, #0a0a0a 80%)",
        }}
      />
    </>
  )
}
