import { ProductType, PRODUCT_LABELS } from "@/types/configurator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSelectorProps {
  selected: ProductType | null;
  onSelect: (type: ProductType) => void;
}

const productIcons: Record<ProductType, React.ReactNode> = {
  'dritare': <WindowIcon />,
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
        <div className="grid grid-cols-2 gap-3">
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

function WindowIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="8" width="48" height="48" rx="2" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="8" y1="32" x2="56" y2="32" />
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
