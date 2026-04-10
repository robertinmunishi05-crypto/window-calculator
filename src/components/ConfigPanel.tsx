import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Palette, Calculator } from "lucide-react";
import { ConfigItem, WindowColor, COLOR_LABELS, DEFAULT_PRICES } from "@/types/configurator";
import { cn } from "@/lib/utils";
import WindowPreview from "./WindowPreview";

interface ConfigPanelProps {
  item: ConfigItem;
  onChange: (item: ConfigItem) => void;
}

const colorOptions: { value: WindowColor; colorClass: string }[] = [
  { value: 'white', colorClass: 'bg-window-white' },
  { value: 'brown', colorClass: 'bg-window-brown' },
  { value: 'black', colorClass: 'bg-window-black' },
];

const ConfigPanel = ({ item, onChange }: ConfigPanelProps) => {
  const area = (item.width / 1000) * (item.height / 1000);
  const totalPrice = area * item.pricePerSqm * item.quantity;

  const handleColorChange = (color: WindowColor) => {
    onChange({ ...item, color, pricePerSqm: DEFAULT_PRICES[color] });
  };

  return (
    <div className="space-y-4">
      {/* Dimensions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4" />
            Dimensionet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gjerësia (mm)</Label>
              <Input
                type="number"
                value={item.width || ''}
                onChange={(e) => onChange({ ...item, width: Number(e.target.value) })}
                placeholder="p.sh. 1200"
              />
            </div>
            <div className="space-y-2">
              <Label>Gjatësia (mm)</Label>
              <Input
                type="number"
                value={item.height || ''}
                onChange={(e) => onChange({ ...item, height: Number(e.target.value) })}
                placeholder="p.sh. 1500"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="space-y-1">
              <Label>Sasia</Label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onChange({ ...item, quantity: Math.max(1, Number(e.target.value)) })}
                className="w-20"
              />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Sipërfaqja</p>
              <p className="text-lg font-semibold">{area.toFixed(2)} m²</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Ngjyra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {colorOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleColorChange(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all flex-1",
                  item.color === opt.value
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/40"
                )}
              >
                <div className={cn("w-8 h-8 rounded-full border", opt.colorClass)} />
                <span className="text-xs font-medium">{COLOR_LABELS[opt.value]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="pt-6">
          <WindowPreview
            productType={item.productType}
            color={item.color}
            width={item.width}
            height={item.height}
          />
        </CardContent>
      </Card>

      {/* Price */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Çmimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">€/m²</Label>
              <Input
                type="number"
                value={item.pricePerSqm || ''}
                onChange={(e) => onChange({ ...item, pricePerSqm: Number(e.target.value) })}
                className="w-24"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-sm font-medium">Totali</span>
              <span className="text-xl font-bold">€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigPanel;
