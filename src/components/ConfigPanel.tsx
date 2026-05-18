import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, Palette, ScanLine, Maximize2, Settings2, Blinds } from "lucide-react";
import {
  ConfigItem, WindowColor, COLOR_LABELS,
  calculateLinearMeters, calculateGlassPanelSizes,
  ProfileSystem, ProfileSystemType, PROFILE_SYSTEMS, getFrameThicknessCm,
  RollerColor, ROLLER_COLOR_LABELS,
} from "@/types/configurator";
import { cn } from "@/lib/utils";
import WindowEditor from "./WindowEditor";

interface ConfigPanelProps {
  item: ConfigItem;
  onChange: (item: ConfigItem) => void;
  profileSystem: ProfileSystem;
  onProfileChange: (ps: ProfileSystem) => void;
}

const colorOptions: { value: WindowColor; colorClass: string }[] = [
  { value: 'white', colorClass: 'bg-window-white' },
  { value: 'brown', colorClass: 'bg-window-brown' },
  { value: 'black', colorClass: 'bg-window-black' },
];

const rollerColorOptions: { value: RollerColor; hex: string }[] = [
  { value: 'white', hex: '#f2f2f2' },
  { value: 'brown', hex: '#6b4226' },
  { value: 'black', hex: '#1a1a1a' },
  { value: 'gray', hex: '#9ca3af' },
  { value: 'anthracite', hex: '#383e42' },
];

const ConfigPanel = ({ item, onChange, profileSystem, onProfileChange }: ConfigPanelProps) => {
  const frameThicknessMm = getFrameThicknessCm(profileSystem) * 10;
  const linearMeters = calculateLinearMeters(item);
  const glassPanelSizes = calculateGlassPanelSizes(item.rootNode, item.width, item.height, frameThicknessMm);

  return (
    <div className="space-y-4">
      {/* Profile System */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Sistemi i Profilit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PROFILE_SYSTEMS) as ProfileSystemType[]).map(key => (
              <button
                key={key}
                onClick={() => onProfileChange({ ...profileSystem, type: key })}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs",
                  profileSystem.type === key
                    ? "border-primary bg-primary/10 font-semibold"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="font-bold text-sm">{PROFILE_SYSTEMS[key].label}</span>
                <span className="text-muted-foreground">
                  {key === 'other' && profileSystem.customFrameThicknessCm
                    ? `${profileSystem.customFrameThicknessCm} cm`
                    : `${PROFILE_SYSTEMS[key].frameThicknessCm} cm`
                  }
                </span>
              </button>
            ))}
          </div>
          {profileSystem.type === 'other' && (
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Trashësia e kornizës</Label>
              <Input
                type="number"
                value={profileSystem.customFrameThicknessCm ?? ''}
                onChange={(e) => onProfileChange({ ...profileSystem, customFrameThicknessCm: Number(e.target.value) })}
                placeholder="cm"
                className="w-24 h-8 text-xs"
                step="0.1"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Roller Shutters (Rolet) — only for windows */}
      {item.productType === 'window' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Blinds className="h-4 w-4" />
              Rolet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => onChange({ ...item, hasRoller: false, rollerColor: undefined })}
                className={cn(
                  "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                  !item.hasRoller
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                )}
              >
                Pa Rolet
              </button>
              <button
                onClick={() => onChange({ ...item, hasRoller: true, rollerColor: item.rollerColor ?? 'white' })}
                className={cn(
                  "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                  item.hasRoller
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                )}
              >
                Me Rolet
              </button>
            </div>

            {item.hasRoller && (
              <div>
                <Label className="text-xs mb-2 block">Ngjyra e Roletës</Label>
                <div className="grid grid-cols-5 gap-2">
                  {rollerColorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onChange({ ...item, rollerColor: opt.value })}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                        item.rollerColor === opt.value
                          ? "border-primary shadow-sm"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-full border"
                        style={{ backgroundColor: opt.hex }}
                      />
                      <span className="text-[10px] font-medium leading-tight text-center">
                        {ROLLER_COLOR_LABELS[opt.value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            <p className="text-[10px] text-muted-foreground mb-2">
              Automatikisht -3mm (1.5mm çdo anë) · Profili: {getFrameThicknessCm(profileSystem)} cm
            </p>
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
