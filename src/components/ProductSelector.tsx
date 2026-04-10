import { ProductType, PRODUCT_LABELS } from "@/types/configurator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSelectorProps {
  selected: ProductType | null;
  onSelect: (type: ProductType) => void;
}

const productIcons: Record<ProductType, React.ReactNode> = {
  'dritare-fikse': <FixedWindowIcon />,
  'dritare-dy-krahe': <TwoWingIcon />,
  'nje-krahe-fiks': <OneWingFixIcon />,
  'dy-krahe-hapese': <TwoWingOpenIcon />,
  'shiber': <SliderIcon />,
  'hibishiber': <HibiSliderIcon />,
  'dere': <DoorIcon />,
};

const ProductSelector = ({ selected, onSelect }: ProductSelectorProps) => {
  const products = Object.keys(PRODUCT_LABELS) as ProductType[];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <LayoutGrid className="h-5 w-5" />
          Lloji i Produktit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:shadow-md",
                selected === type
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="w-16 h-16 flex items-center justify-center">
                {productIcons[type]}
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {PRODUCT_LABELS[type]}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

function FixedWindowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="8" y1="32" x2="56" y2="32" />
    </svg>
  );
}

function TwoWingIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="8" y1="32" x2="32" y2="32" />
      <line x1="32" y1="32" x2="56" y2="32" />
      <path d="M10 30 L10 34" strokeWidth="3" />
      <path d="M54 30 L54 34" strokeWidth="3" />
    </svg>
  );
}

function OneWingFixIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="8" y1="32" x2="32" y2="32" />
      <path d="M10 30 L10 34" strokeWidth="3" />
    </svg>
  );
}

function TwoWingOpenIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <path d="M10 30 L10 34" strokeWidth="3" />
      <path d="M54 30 L54 34" strokeWidth="3" />
      <path d="M14 12 L30 32 L14 52" strokeDasharray="3 3" opacity="0.4" />
      <path d="M50 12 L34 32 L50 52" strokeDasharray="3 3" opacity="0.4" />
    </svg>
  );
}

function SliderIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <path d="M36 28 L44 28" strokeWidth="3" />
      <path d="M36 36 L44 36" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

function HibiSliderIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="24" y1="8" x2="24" y2="56" />
      <line x1="40" y1="8" x2="40" y2="56" />
      <path d="M26 30 L26 34" strokeWidth="3" />
      <path d="M38 30 L38 34" strokeWidth="3" />
    </svg>
  );
}

function DoorIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="14" y="4" width="36" height="56" rx="2" />
      <circle cx="42" cy="34" r="2" fill="currentColor" />
      <path d="M14 60 L50 60" strokeWidth="2" />
    </svg>
  );
}

export default ProductSelector;
