import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Palette, ScanLine } from "lucide-react";
import { ConfigItem, WindowColor, COLOR_LABELS, calculateLinearMeters } from "@/types/configurator";
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
  const linearMeters = calculateLinearMeters(item);

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
              <Label>Lartësia (mm)</Label>
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
              <p className="text-lg font-semibold">{((item.width / 1000) * (item.height / 1000)).toFixed(2)} m²</p>
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
                onClick={() => onChange({ ...item, color: opt.value })}
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

      {/* Window Editor */}
      <WindowEditor
        rootNode={item.rootNode}
        onChange={(rootNode) => onChange({ ...item, rootNode })}
        color={item.color}
        width={item.width}
        height={item.height}
        productType={item.productType}
      />

      {/* Linear Meters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            Metrat Lineare të Profilit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Korniza e jashtme</span>
              <span className="font-medium">{linearMeters.outerFrame.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ndarjet e brendshme</span>
              <span className="font-medium">{linearMeters.innerDividers.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kornizat hapëse</span>
              <span className="font-medium">{linearMeters.openingFrames.toFixed(2)} m</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
              <span className="text-sm font-medium">Totali</span>
              <span className="text-xl font-bold">{linearMeters.total.toFixed(2)} m</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigPanel;
