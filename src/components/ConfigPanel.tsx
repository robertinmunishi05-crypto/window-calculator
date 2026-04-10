import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Palette, Calculator } from "lucide-react";
import { ConfigItem, WindowColor, COLOR_LABELS, DEFAULT_PRICES } from "@/types/configurator";
import { cn } from "@/lib/utils";
import WindowEditor from "./WindowEditor";

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

      {/* Interactive Window Editor */}
      {item.productType === 'dritare' && (
        <WindowEditor
          structure={item.structure}
          onChange={(structure) => onChange({ ...item, structure })}
          color={item.color}
          width={item.width}
          height={item.height}
        />
      )}

      {/* Door preview for doors */}
      {item.productType === 'dere' && (
        <Card>
          <CardContent className="pt-6">
            <DoorPreview color={item.color} width={item.width} height={item.height} />
          </CardContent>
        </Card>
      )}

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

function DoorPreview({ color, width, height }: { color: WindowColor; width: number; height: number }) {
  const COLOR_MAP: Record<WindowColor, { frame: string; glass: string; bg: string }> = {
    white: { frame: '#e5e5e5', glass: '#d4e8f7', bg: '#f0f0f0' },
    brown: { frame: '#6b4226', glass: '#b8d4e8', bg: '#8b6914' },
    black: { frame: '#2a2a2a', glass: '#a8c8e0', bg: '#1a1a1a' },
  };
  const c = COLOR_MAP[color];
  const area = ((width / 1000) * (height / 1000)).toFixed(2);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-lg">
        <rect x="40" y="10" width="120" height="180" rx="4" fill={c.frame} />
        <rect x="48" y="18" width="104" height="100" rx="2" fill={c.glass} />
        <rect x="48" y="126" width="104" height="56" rx="2" fill={c.frame} opacity="0.8" />
        <circle cx="140" cy="130" r="5" fill={c.bg} />
      </svg>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Derë</p>
        <p className="text-xs text-muted-foreground">
          {width} × {height} mm — {area} m²
        </p>
      </div>
    </div>
  );
}

export default ConfigPanel;
