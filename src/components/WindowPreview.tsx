import { ProductType, WindowColor, PRODUCT_LABELS, COLOR_LABELS } from "@/types/configurator";

interface WindowPreviewProps {
  productType: ProductType;
  color: WindowColor;
  width: number;
  height: number;
}

const COLOR_MAP: Record<WindowColor, { frame: string; glass: string; bg: string }> = {
  white: { frame: '#e5e5e5', glass: '#d4e8f7', bg: '#f0f0f0' },
  brown: { frame: '#6b4226', glass: '#b8d4e8', bg: '#8b6914' },
  black: { frame: '#2a2a2a', glass: '#a8c8e0', bg: '#1a1a1a' },
};

const WindowPreview = ({ productType, color, width, height }: WindowPreviewProps) => {
  const c = COLOR_MAP[color];
  const area = ((width / 1000) * (height / 1000)).toFixed(2);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-lg">
        {productType === 'dere' ? (
          <DoorSVG c={c} />
        ) : (
          <WindowSVG type={productType} c={c} />
        )}
      </svg>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">{PRODUCT_LABELS[productType]}</p>
        <p className="text-xs text-muted-foreground">
          {width} × {height} mm — {area} m² — {COLOR_LABELS[color]}
        </p>
      </div>
    </div>
  );
};

function WindowSVG({ type, c }: { type: ProductType; c: typeof COLOR_MAP.white }) {
  const hasMiddle = ['dritare-dy-krahe', 'nje-krahe-fiks', 'dy-krahe-hapese', 'hibishiber'].includes(type);
  const hasThree = type === 'hibishiber';
  
  return (
    <>
      <rect x="20" y="20" width="160" height="160" rx="4" fill={c.frame} />
      {!hasThree && !hasMiddle && (
        <rect x="28" y="28" width="144" height="144" rx="2" fill={c.glass} />
      )}
      {hasMiddle && !hasThree && (
        <>
          <rect x="28" y="28" width="68" height="144" rx="2" fill={c.glass} />
          <rect x="104" y="28" width="68" height="144" rx="2" fill={c.glass} />
        </>
      )}
      {hasThree && (
        <>
          <rect x="28" y="28" width="44" height="144" rx="2" fill={c.glass} />
          <rect x="78" y="28" width="44" height="144" rx="2" fill={c.glass} />
          <rect x="128" y="28" width="44" height="144" rx="2" fill={c.glass} />
        </>
      )}
      {type === 'shiber' && (
        <>
          <rect x="28" y="28" width="68" height="144" rx="2" fill={c.glass} />
          <rect x="104" y="28" width="68" height="144" rx="2" fill={c.glass} opacity="0.7" />
          <line x1="108" y1="95" x2="130" y2="95" stroke={c.frame} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {type === 'dritare-fikse' && (
        <>
          <line x1="100" y1="28" x2="100" y2="172" stroke={c.frame} strokeWidth="3" />
          <line x1="28" y1="100" x2="172" y2="100" stroke={c.frame} strokeWidth="3" />
        </>
      )}
      {(type === 'dy-krahe-hapese') && (
        <>
          <circle cx="34" cy="100" r="3" fill={c.frame} stroke={c.bg} strokeWidth="1" />
          <circle cx="166" cy="100" r="3" fill={c.frame} stroke={c.bg} strokeWidth="1" />
        </>
      )}
      {(type === 'dritare-dy-krahe' || type === 'nje-krahe-fiks') && (
        <circle cx="34" cy="100" r="3" fill={c.frame} stroke={c.bg} strokeWidth="1" />
      )}
    </>
  );
}

function DoorSVG({ c }: { c: typeof COLOR_MAP.white }) {
  return (
    <>
      <rect x="40" y="10" width="120" height="180" rx="4" fill={c.frame} />
      <rect x="48" y="18" width="104" height="100" rx="2" fill={c.glass} />
      <rect x="48" y="126" width="104" height="56" rx="2" fill={c.frame} opacity="0.8" />
      <circle cx="140" cy="130" r="5" fill={c.bg} />
    </>
  );
}

export default WindowPreview;
