export function GradientMesh({ variant = 'hero' }: { variant?: 'hero' | 'card' | 'spiral' }) {
  if (variant === 'spiral') {
    return (
      <div className="gradient-spiral-wrap" aria-hidden>
        <div className="gradient-spiral" />
        <div className="gradient-spiral gradient-spiral--b" />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="gradient-card-infusion" aria-hidden>
        <div className="gradient-card-blob gradient-card-blob--a" />
        <div className="gradient-card-blob gradient-card-blob--b" />
      </div>
    );
  }

  return (
    <div className="gradient-mesh-wrap" aria-hidden>
      <div className="gradient-mesh gradient-mesh--a" />
      <div className="gradient-mesh gradient-mesh--b" />
      <div className="gradient-mesh gradient-mesh--c" />
    </div>
  );
}

export function CreditCardMini({
  issuer,
  name,
  last4,
  variant = 'gold',
}: {
  issuer: string;
  name: string;
  last4: string;
  variant?: 'gold' | 'navy' | 'forest';
}) {
  const gradients = {
    gold: 'linear-gradient(135deg, #8b6914 0%, #c9a227 45%, #6b5416 100%)',
    navy: 'linear-gradient(135deg, #0a1628 0%, #1a365d 50%, #0d2137 100%)',
    forest: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #0f2922 100%)',
  };

  return (
    <div className="credit-card-mini" style={{ background: gradients[variant] }}>
      <div className="credit-card-mini__sheen" />
      <div className="credit-card-mini__content">
        <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/55">{issuer}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-white">{name}</p>
        <p className="mt-3 font-mono text-[9px] tracking-[0.18em] text-white/75">•••• {last4}</p>
      </div>
    </div>
  );
}
