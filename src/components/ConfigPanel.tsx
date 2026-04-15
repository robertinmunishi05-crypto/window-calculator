import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Palette, ScanLine, Maximize2 } from "lucide-react";
import { ConfigItem, WindowColor, COLOR_LABELS, calculateLinearMeters, calculateGlassPanelSizes, WindowNode } from "@/types/configurator";
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
  const glassPanelSizes = calculateGlassPanelSizes(item.rootNode, item.width, item.height);

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
              <Label>Gjerësia (cm)</Label>
              <Input
                type="number"
                value={item.width / 10 || ''}
                onChange={(e) => onChange({ ...item, width: Number(e.target.value) * 10 })}
                placeholder="p.sh. 120"
              />
            </div>
            <div className="space-y-2">
              <Label>Lartësia (cm)</Label>
              <Input
                type="number"
                value={item.height / 10 || ''}
                onChange={(e) => onChange({ ...item, height: Number(e.target.value) * 10 })}
                placeholder="p.sh. 150"
              />
            </div>
          </div>
          <div className="mt-3">
            <Label>Sasia</Label>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })}
              className="w-20 mt-1"
            />
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
            Metrat Lineare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">L — Rama (korniza)</span>
              <span className="font-bold text-base">{linearMeters.outerFrame.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ndarjet e brendshme</span>
              <span className="font-medium">{linearMeters.innerDividers.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Z — Hapësirat (dritaret)</span>
              <span className="font-bold text-base">{linearMeters.openingFrames.toFixed(2)} m</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
              <span className="text-sm font-medium">Totali</span>
              <span className="text-xl font-bold">{linearMeters.total.toFixed(2)} m</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Glass & Panel Sizes */}
      {glassPanelSizes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Maximize2 className="h-4 w-4" />
              Përmasat e Xhamit / Panelit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground mb-2">Automatikisht -3mm (1.5mm çdo anë)</p>
            <div className="space-y-1.5">
              {glassPanelSizes.map((g, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className="font-semibold">{g.widthCm.toFixed(2)} × {g.heightCm.toFixed(2)} cm</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConfigPanel;
