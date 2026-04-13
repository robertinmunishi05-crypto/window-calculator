import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WindowNode,
  WindowColor,
  ElementType,
  OpeningDirection,
  DoorFillType,
  DoorComboPosition,
  PaneConfig,
  ProductType,
  ELEMENT_TYPE_LABELS,
  OPENING_DIRECTION_LABELS,
  DOOR_FILL_LABELS,
  DOOR_COMBO_POSITION_LABELS,
  COLOR_LABELS,
  findNode,
  updateNode,
  splitNode,
  createPaneNode,
} from "@/types/configurator";
import { cn } from "@/lib/utils";
import { Edit3, Columns2, Rows2, Trash2, Plus } from "lucide-react";

interface WindowEditorProps {
  rootNode: WindowNode;
  onChange: (node: WindowNode) => void;
  color: WindowColor;
  width: number;
  height: number;
  productType: ProductType;
}

const COLOR_MAP: Record<WindowColor, { frame: string; glass: string; accent: string; panel: string }> = {
  white: { frame: '#d4d4d4', glass: '#d4e8f7', accent: '#999', panel: '#e8e8e8' },
  brown: { frame: '#6b4226', glass: '#b8d4e8', accent: '#8b6914', panel: '#8b6914' },
  black: { frame: '#2a2a2a', glass: '#a8c8e0', accent: '#666', panel: '#444' },
};

const WindowEditor = ({ rootNode, onChange, color, width, height, productType }: WindowEditorProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const c = COLOR_MAP[color];

  const maxW = 500;
  const maxH = 400;
  const ratio = width / height;
  let svgW: number, svgH: number;
  if (ratio > maxW / maxH) {
    svgW = maxW; svgH = maxW / ratio;
  } else {
    svgH = maxH; svgW = maxH * ratio;
  }

  const frameT = 8;
  const dividerT = 6;

  const selectedNode = selectedId ? findNode(rootNode, selectedId) : null;

  const findParentSplit = (root: WindowNode, targetId: string): WindowNode | null => {
    if (root.type === 'split' && root.children) {
      for (const child of root.children) {
        if (child.id === targetId) return root;
        const found = findParentSplit(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSplit = (direction: 'vertical' | 'horizontal') => {
    if (!selectedId) return;
    const node = findNode(rootNode, selectedId);
    if (!node || node.type !== 'pane') return;
    const size = direction === 'vertical' ? width : height;
    const newRoot = updateNode(rootNode, selectedId, (n) => splitNode(n, direction, size, splitCount));
    onChange(newRoot);
    setSelectedId(null);
    setSplitCount(2);
  };

  const handleDeletePane = () => {
    if (!selectedId) return;
    const parent = findParentSplit(rootNode, selectedId);
    if (!parent || !parent.children || !parent.sizes) return;

    if (parent.children.length <= 2) {
      const otherChild = parent.children.find(c => c.id !== selectedId);
      if (otherChild) {
        const newRoot = updateNode(rootNode, parent.id, () => ({
          ...otherChild,
          id: parent.id,
        }));
        onChange(newRoot);
      }
    } else {
      const idx = parent.children.findIndex(c => c.id === selectedId);
      const newRoot = updateNode(rootNode, parent.id, (n) => {
        const newChildren = n.children!.filter((_, i) => i !== idx);
        const removedSize = n.sizes![idx];
        const newSizes = n.sizes!.filter((_, i) => i !== idx);
        newSizes[newSizes.length - 1] += removedSize;
        return { ...n, children: newChildren, sizes: newSizes };
      });
      onChange(newRoot);
    }
    setSelectedId(null);
  };

  const handlePaneConfigChange = (config: Partial<PaneConfig>) => {
    if (!selectedId) return;
    const newRoot = updateNode(rootNode, selectedId, (n) => ({
      ...n,
      paneConfig: { ...n.paneConfig!, ...config },
    }));
    onChange(newRoot);
  };

  // Freely editable cm inputs - no auto-adjustment
  const handleSizeChangeCm = (splitId: string, childIndex: number, newSizeCm: number) => {
    const newSizeMm = Math.round(newSizeCm * 10);
    const newRoot = updateNode(rootNode, splitId, (n) => {
      if (!n.sizes || !n.children) return n;
      const newSizes = [...n.sizes];
      newSizes[childIndex] = Math.max(10, newSizeMm);
      return { ...n, sizes: newSizes };
    });
    onChange(newRoot);
  };

  const addChildToSplit = (splitId: string) => {
    const newRoot = updateNode(rootNode, splitId, (n) => {
      if (!n.children || !n.sizes) return n;
      const totalSize = n.sizes.reduce((a, b) => a + b, 0);
      const newChildSize = Math.round(totalSize / (n.children.length + 1));
      const newSizes = [...n.sizes];
      newSizes[newSizes.length - 1] = Math.max(50, newSizes[newSizes.length - 1] - newChildSize);
      newSizes.push(newChildSize);
      return {
        ...n,
        children: [...n.children, createPaneNode()],
        sizes: newSizes,
      };
    });
    onChange(newRoot);
  };

  const isRootNode = selectedId === rootNode.id;
  const parentSplit = selectedId ? findParentSplit(rootNode, selectedId) : null;

  // Window element types (no slider, no tilt-turn)
  const windowElementTypes: ElementType[] = ['fixed', 'opening'];

  // Recursive SVG renderer
  const renderNode = (node: WindowNode, x: number, y: number, w: number, h: number): React.ReactNode => {
    if (node.type === 'pane') {
      const isSelected = selectedId === node.id;
      return (
        <g key={node.id} onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }} className="cursor-pointer">
          <PaneRenderer config={node.paneConfig!} x={x} y={y} w={w} h={h} isSelected={isSelected} colors={c} />
          <rect x={x} y={y} width={w} height={h} fill="transparent" className="hover:fill-primary/5 transition-colors" />
        </g>
      );
    }

    if (node.type === 'split' && node.children && node.sizes) {
      const totalSize = node.sizes.reduce((a, b) => a + b, 0);
      const elements: React.ReactNode[] = [];
      let offset = 0;

      node.children.forEach((child, i) => {
        const r = node.sizes![i] / totalSize;
        let cx: number, cy: number, cw: number, ch: number;
        if (node.direction === 'vertical') {
          cx = x + offset;
          cy = y;
          cw = w * r - (i < node.children!.length - 1 ? dividerT / 2 : 0) - (i > 0 ? dividerT / 2 : 0);
          ch = h;
          if (i > 0) cx += dividerT / 2;
          offset += w * r;
        } else {
          cx = x;
          cy = y + offset;
          cw = w;
          ch = h * r - (i < node.children!.length - 1 ? dividerT / 2 : 0) - (i > 0 ? dividerT / 2 : 0);
          if (i > 0) cy += dividerT / 2;
          offset += h * r;
        }
        elements.push(renderNode(child, cx, cy, cw, ch));
        if (i < node.children!.length - 1) {
          if (node.direction === 'vertical') {
            elements.push(<rect key={`div-${node.id}-${i}`} x={x + offset - dividerT / 2} y={y} width={dividerT} height={h} fill={c.frame} />);
          } else {
            elements.push(<rect key={`div-${node.id}-${i}`} x={x} y={y + offset - dividerT / 2} width={w} height={dividerT} fill={c.frame} />);
          }
        }
      });
      return <g key={node.id}>{elements}</g>;
    }
    return null;
  };

  const innerX = frameT;
  const innerY = frameT;
  const innerW = svgW - frameT * 2;
  const innerH = svgH - frameT * 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Edit3 className="h-4 w-4" />
          {productType === 'door' ? 'Editor i Derës' : 'Editor i Dritares'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG Preview */}
        <div className="flex justify-center bg-muted/30 rounded-lg p-4 overflow-x-auto">
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="drop-shadow-lg max-w-full h-auto" onClick={() => setSelectedId(null)}>
            <rect x="0" y="0" width={svgW} height={svgH} rx="3" fill={c.frame} />
            {renderNode(rootNode, innerX, innerY, innerW, innerH)}
          </svg>
        </div>

        {/* Dimensions label */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {(width / 10).toFixed(1)} × {(height / 10).toFixed(1)} cm — {((width / 1000) * (height / 1000)).toFixed(2)} m² — {COLOR_LABELS[color]}
          </p>
        </div>

        {/* Help text */}
        {!selectedNode && (
          <div className="text-center py-3 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-sm text-muted-foreground">
              👆 Kliko mbi {productType === 'door' ? 'derën' : 'dritaren'} për ta edituar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Mund ta ndash në pjesë, të zgjedhësh tipin, dhe të konfigurosh sipas dëshirës
            </p>
          </div>
        )}

        {/* PANE SELECTED */}
        {selectedNode && selectedNode.type === 'pane' && (
          <div className="space-y-4 p-3 sm:p-4 rounded-lg bg-muted/50 border-2 border-primary/30 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Editimi i Pjesës
              </p>
              {!isRootNode && (
                <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={handleDeletePane}>
                  <Trash2 className="h-3 w-3 mr-1" /> Fshi
                </Button>
              )}
            </div>

            {/* === DOOR MODE === */}
            {productType === 'door' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Drejtimi i hapjes</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['left', 'right'] as OpeningDirection[]).map(d => (
                      <Button
                        key={d}
                        variant={selectedNode.paneConfig?.openingDirection === d ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-9"
                        onClick={() => handlePaneConfigChange({ elementType: 'door', openingDirection: d })}
                      >
                        {d === 'left' ? '← Majtas' : 'Djathtas →'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Mbushja e derës</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['glass', 'panel', 'combo'] as DoorFillType[]).map(f => (
                      <Button
                        key={f}
                        variant={selectedNode.paneConfig?.doorFill === f ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-9"
                        onClick={() => handlePaneConfigChange({
                          doorFill: f,
                          doorComboRatio: f === 'combo' ? 50 : undefined,
                          doorComboPosition: f === 'combo' ? 'panel-bottom' : undefined,
                        })}
                      >
                        {DOOR_FILL_LABELS[f]}
                      </Button>
                    ))}
                  </div>

                  {selectedNode.paneConfig?.doorFill === 'combo' && (
                    <div className="space-y-2 p-3 rounded-md bg-background border">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Pozicioni i panelit</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['panel-bottom', 'panel-top'] as DoorComboPosition[]).map(pos => (
                            <Button
                              key={pos}
                              variant={selectedNode.paneConfig?.doorComboPosition === pos ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handlePaneConfigChange({ doorComboPosition: pos })}
                            >
                              {DOOR_COMBO_POSITION_LABELS[pos]}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Panel %</Label>
                        <Input
                          type="number"
                          min={10}
                          max={90}
                          value={selectedNode.paneConfig.doorComboRatio ?? 50}
                          onChange={(e) => handlePaneConfigChange({ doorComboRatio: Math.min(90, Math.max(10, Number(e.target.value))) })}
                          className="w-20 h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* === WINDOW MODE === */}
            {productType === 'window' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Çfarë tipi është kjo pjesë?</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {windowElementTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => handlePaneConfigChange({
                          elementType: t,
                          openingDirection: t === 'opening' ? 'left' : undefined,
                          doorFill: undefined,
                        })}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-md border-2 transition-all text-xs",
                          selectedNode.paneConfig?.elementType === t
                            ? "border-primary bg-primary/10 font-semibold"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <span className="text-lg">
                          {t === 'fixed' ? '✕' : '↗'}
                        </span>
                        <span>{ELEMENT_TYPE_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedNode.paneConfig?.elementType === 'opening' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Drejtimi i hapjes</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['left', 'right', 'top'] as OpeningDirection[]).map(d => (
                        <Button
                          key={d}
                          variant={selectedNode.paneConfig?.openingDirection === d ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handlePaneConfigChange({ openingDirection: d })}
                        >
                          {OPENING_DIRECTION_LABELS[d]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Split this pane */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium">Ndaj këtë pjesë në copa</Label>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-xs whitespace-nowrap">Sa pjesë?</Label>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={splitCount}
                  onChange={(e) => setSplitCount(Math.max(2, Math.min(8, Number(e.target.value))))}
                  className="w-16 h-8 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs flex-1 h-9" onClick={() => handleSplit('vertical')}>
                  <Columns2 className="h-4 w-4 mr-1.5" /> Vertikalisht
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex-1 h-9" onClick={() => handleSplit('horizontal')}>
                  <Rows2 className="h-4 w-4 mr-1.5" /> Horizontalisht
                </Button>
              </div>
            </div>

            {/* Sizes in cm - freely editable */}
            {parentSplit && parentSplit.children && parentSplit.sizes && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-medium">Madhësia e pjesëve (cm)</Label>
                <div className="space-y-1.5">
                  {parentSplit.children.map((child, i) => {
                    const isThis = child.id === selectedId;
                    const sizeCm = (parentSplit.sizes![i] / 10);
                    return (
                      <div key={child.id} className={cn("flex items-center gap-2 p-1.5 rounded", isThis && "bg-primary/5")}>
                        <span className={cn("text-xs w-14", isThis ? "font-semibold text-primary" : "text-muted-foreground")}>
                          {isThis ? "→ Kjo" : `Pjesa ${i + 1}`}
                        </span>
                        <Input
                          type="number"
                          step={0.1}
                          min={1}
                          value={sizeCm}
                          onChange={(e) => handleSizeChangeCm(parentSplit.id, i, Number(e.target.value))}
                          className="w-24 h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">cm</span>
                      </div>
                    );
                  })}
                </div>
                {parentSplit.children.length < 8 && (
                  <Button variant="outline" size="sm" className="text-xs w-full h-8" onClick={() => addChildToSplit(parentSplit.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Shto edhe një pjesë
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SPLIT NODE SELECTED */}
        {selectedNode && selectedNode.type === 'split' && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 border-2 border-primary/30">
            <p className="text-sm text-muted-foreground italic">
              Kliko mbi një pjesë individuale për ta edituar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===== PANE RENDERER (SVG) =====
function PaneRenderer({
  config, x, y, w, h, isSelected, colors,
}: {
  config: PaneConfig;
  x: number; y: number; w: number; h: number;
  isSelected: boolean;
  colors: { frame: string; glass: string; accent: string; panel: string };
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';
  const panelRatio = (config.doorComboRatio ?? 50) / 100;
  const panelOnTop = config.doorComboPosition === 'panel-top';
  const panelH = isDoorCombo ? h * panelRatio : 0;
  const glassH = isDoorCombo ? h - panelH : h;
  const isDoorPanel = config.elementType === 'door' && config.doorFill === 'panel';

  return (
    <>
      {isDoorPanel ? (
        <rect x={x} y={y} width={w} height={h} rx="1" fill={colors.panel} />
      ) : isDoorCombo ? (
        <>
          {panelOnTop ? (
            <>
              <rect x={x} y={y} width={w} height={panelH} fill={colors.panel} />
              <rect x={x} y={y + panelH} width={w} height={glassH} rx="1" fill={colors.glass} />
              <line x1={x} y1={y + panelH} x2={x + w} y2={y + panelH} stroke={colors.frame} strokeWidth="2" />
            </>
          ) : (
            <>
              <rect x={x} y={y} width={w} height={glassH} rx="1" fill={colors.glass} />
              <rect x={x} y={y + glassH} width={w} height={panelH} fill={colors.panel} />
              <line x1={x} y1={y + glassH} x2={x + w} y2={y + glassH} stroke={colors.frame} strokeWidth="2" />
            </>
          )}
        </>
      ) : (
        <rect x={x} y={y} width={w} height={h} rx="1" fill={colors.glass} />
      )}

      {isSelected && (
        <>
          <rect x={x} y={y} width={w} height={h} rx="1" fill="hsl(210, 80%, 50%)" opacity="0.15" />
          <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="1" fill="none" stroke="hsl(210, 80%, 50%)" strokeWidth="3" strokeDasharray="8 4" />
        </>
      )}

      {config.elementType === 'fixed' && (
        <>
          <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
          <line x1={x + w - 4} y1={y + 4} x2={x + 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
        </>
      )}

      {config.elementType === 'opening' && <OpeningOverlay dir={config.openingDirection || 'left'} x={x} y={y} w={w} h={h} accent={colors.accent} />}

      {config.elementType === 'door' && (
        <>
          <circle cx={config.openingDirection === 'right' ? x + 10 : x + w - 10} cy={cy} r="3" fill={colors.accent} opacity="0.7" />
          <rect x={config.openingDirection === 'right' ? x + 6 : x + w - 14} y={cy - 8} width="4" height="16" rx="2" fill={colors.accent} opacity="0.5" />
          {config.openingDirection === 'left' && (
            <path d={`M ${x + w - 6} ${y + 6} Q ${x + w * 0.3} ${y + h * 0.15} ${x + 6} ${cy}`} fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
          )}
          {config.openingDirection === 'right' && (
            <path d={`M ${x + 6} ${y + 6} Q ${x + w * 0.7} ${y + h * 0.15} ${x + w - 6} ${cy}`} fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
          )}
        </>
      )}
    </>
  );
}

function OpeningOverlay({ dir, x, y, w, h, accent }: {
  dir: OpeningDirection; x: number; y: number; w: number; h: number; accent: string;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (dir === 'left') {
    return (
      <>
        <circle cx={x + w - 5} cy={cy} r="3" fill={accent} opacity="0.6" />
        <path d={`M ${x + w - 6} ${y + 6} Q ${x + w * 0.3} ${y + h * 0.15} ${x + 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
        <path d={`M ${x + w - 6} ${y + h - 6} Q ${x + w * 0.3} ${y + h * 0.85} ${x + 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      </>
    );
  }
  if (dir === 'right') {
    return (
      <>
        <circle cx={x + 5} cy={cy} r="3" fill={accent} opacity="0.6" />
        <path d={`M ${x + 6} ${y + 6} Q ${x + w * 0.7} ${y + h * 0.15} ${x + w - 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
        <path d={`M ${x + 6} ${y + h - 6} Q ${x + w * 0.7} ${y + h * 0.85} ${x + w - 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      </>
    );
  }
  if (dir === 'top') {
    return (
      <>
        <circle cx={cx} cy={y + h - 5} r="3" fill={accent} opacity="0.6" />
        <line x1={cx} y1={cy + 6} x2={cx} y2={cy - 10} stroke={accent} strokeWidth="1.5" opacity="0.5" />
        <polygon points={`${cx - 4},${cy - 6} ${cx},${cy - 10} ${cx + 4},${cy - 6}`} fill={accent} opacity="0.5" />
      </>
    );
  }
  return null;
}

export default WindowEditor;
