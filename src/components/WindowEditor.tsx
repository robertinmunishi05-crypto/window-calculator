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
  PaneConfig,
  ELEMENT_TYPE_LABELS,
  OPENING_DIRECTION_LABELS,
  DOOR_FILL_LABELS,
  COLOR_LABELS,
  findNode,
  updateNode,
  splitNode,
  createPaneNode,
} from "@/types/configurator";
import { cn } from "@/lib/utils";
import { Edit3, Columns2, Rows2, Trash2 } from "lucide-react";

interface WindowEditorProps {
  rootNode: WindowNode;
  onChange: (node: WindowNode) => void;
  color: WindowColor;
  width: number;
  height: number;
}

const COLOR_MAP: Record<WindowColor, { frame: string; glass: string; accent: string; panel: string }> = {
  white: { frame: '#d4d4d4', glass: '#d4e8f7', accent: '#999', panel: '#e8e8e8' },
  brown: { frame: '#6b4226', glass: '#b8d4e8', accent: '#8b6914', panel: '#8b6914' },
  black: { frame: '#2a2a2a', glass: '#a8c8e0', accent: '#666', panel: '#444' },
};

const WindowEditor = ({ rootNode, onChange, color, width, height }: WindowEditorProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const c = COLOR_MAP[color];

  const maxW = 450;
  const maxH = 350;
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

  const handleSplit = (direction: 'vertical' | 'horizontal') => {
    if (!selectedId) return;
    const node = findNode(rootNode, selectedId);
    if (!node || node.type !== 'pane') return;
    // Calculate the available size for this node
    const size = direction === 'vertical' ? width : height;
    const newRoot = updateNode(rootNode, selectedId, (n) => splitNode(n, direction, size));
    onChange(newRoot);
    setSelectedId(null);
  };

  const handleUnsplit = () => {
    if (!selectedId) return;
    const node = findNode(rootNode, selectedId);
    if (!node || node.type !== 'split') return;
    const newRoot = updateNode(rootNode, selectedId, () => createPaneNode());
    onChange(newRoot);
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

  const handleSizeChange = (nodeId: string, childIndex: number, newSizeMm: number) => {
    const newRoot = updateNode(rootNode, nodeId, (n) => {
      if (!n.sizes || !n.children) return n;
      const newSizes = [...n.sizes];
      const oldTotal = newSizes.reduce((a, b) => a + b, 0);
      const diff = newSizeMm - newSizes[childIndex];
      newSizes[childIndex] = newSizeMm;
      // Adjust the next sibling
      if (childIndex < newSizes.length - 1) {
        newSizes[childIndex + 1] = Math.max(50, newSizes[childIndex + 1] - diff);
      }
      return { ...n, sizes: newSizes };
    });
    onChange(newRoot);
  };

  const addChildToSplit = (splitId: string) => {
    const newRoot = updateNode(rootNode, splitId, (n) => {
      if (!n.children || !n.sizes) return n;
      const totalSize = n.sizes.reduce((a, b) => a + b, 0);
      const newChildSize = Math.round(totalSize / (n.children.length + 1));
      // Reduce last child
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

  const removeChildFromSplit = (splitId: string, childIndex: number) => {
    const newRoot = updateNode(rootNode, splitId, (n) => {
      if (!n.children || !n.sizes || n.children.length <= 2) return n;
      const removedSize = n.sizes[childIndex];
      const newChildren = n.children.filter((_, i) => i !== childIndex);
      const newSizes = n.sizes.filter((_, i) => i !== childIndex);
      // Distribute removed size to last child
      newSizes[newSizes.length - 1] += removedSize;
      return { ...n, children: newChildren, sizes: newSizes };
    });
    onChange(newRoot);
    if (selectedId && !findNode(newRoot, selectedId)) setSelectedId(null);
  };

  // Recursive SVG renderer
  const renderNode = (node: WindowNode, x: number, y: number, w: number, h: number): React.ReactNode => {
    if (node.type === 'pane') {
      return (
        <g key={node.id} onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }} className="cursor-pointer">
          <PaneRenderer
            config={node.paneConfig!}
            x={x} y={y} w={w} h={h}
            isSelected={selectedId === node.id}
            colors={c}
          />
        </g>
      );
    }

    if (node.type === 'split' && node.children && node.sizes) {
      const totalSize = node.sizes.reduce((a, b) => a + b, 0);
      const elements: React.ReactNode[] = [];
      let offset = 0;

      node.children.forEach((child, i) => {
        const ratio = node.sizes![i] / totalSize;
        let childX: number, childY: number, childW: number, childH: number;

        if (node.direction === 'vertical') {
          childX = x + offset;
          childY = y;
          childW = w * ratio - (i < node.children!.length - 1 ? dividerT / 2 : 0) - (i > 0 ? dividerT / 2 : 0);
          childH = h;
          if (i > 0) childX += dividerT / 2;
          offset += w * ratio;
        } else {
          childX = x;
          childY = y + offset;
          childW = w;
          childH = h * ratio - (i < node.children!.length - 1 ? dividerT / 2 : 0) - (i > 0 ? dividerT / 2 : 0);
          if (i > 0) childY += dividerT / 2;
          offset += h * ratio;
        }

        elements.push(renderNode(child, childX, childY, childW, childH));

        // Draw divider
        if (i < node.children!.length - 1) {
          if (node.direction === 'vertical') {
            elements.push(
              <rect key={`div-${node.id}-${i}`} x={x + offset - dividerT / 2} y={y} width={dividerT} height={h} fill={c.frame} />
            );
          } else {
            elements.push(
              <rect key={`div-${node.id}-${i}`} x={x} y={y + offset - dividerT / 2} width={w} height={dividerT} fill={c.frame} />
            );
          }
        }
      });

      // Make the split node itself clickable for management
      elements.push(
        <rect
          key={`split-click-${node.id}`}
          x={x} y={y} width={w} height={h}
          fill="transparent"
          onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
          className="cursor-pointer"
          pointerEvents="fill"
          opacity={0}
        />
      );

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
          Editor i Dritares/Derës
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG Preview */}
        <div className="flex justify-center">
          <svg
            width={svgW} height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="drop-shadow-lg"
            onClick={() => setSelectedId(null)}
          >
            {/* Outer frame */}
            <rect x="0" y="0" width={svgW} height={svgH} rx="3" fill={c.frame} />
            {/* Render tree */}
            {renderNode(rootNode, innerX, innerY, innerW, innerH)}
          </svg>
        </div>

        {/* Dimensions label */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {width} × {height} mm — {((width / 1000) * (height / 1000)).toFixed(2)} m² — {COLOR_LABELS[color]}
          </p>
        </div>

        {/* Controls */}
        {!selectedNode && (
          <p className="text-xs text-muted-foreground text-center italic">
            Kliko mbi një pjesë për ta edituar, ose kliko dritaren për të filluar
          </p>
        )}

        {selectedNode && selectedNode.type === 'pane' && (
          <PaneEditor
            config={selectedNode.paneConfig!}
            onChange={handlePaneConfigChange}
            onSplit={handleSplit}
          />
        )}

        {selectedNode && selectedNode.type === 'split' && (
          <SplitEditor
            node={selectedNode}
            onUnsplit={handleUnsplit}
            onAddChild={() => addChildToSplit(selectedNode.id)}
            onRemoveChild={(i) => removeChildFromSplit(selectedNode.id, i)}
            onSizeChange={(i, v) => handleSizeChange(selectedNode.id, i, v)}
          />
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

  // Door combo split
  const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';
  const panelRatio = (config.doorComboRatio ?? 50) / 100;
  const panelH = isDoorCombo ? h * panelRatio : 0;
  const glassH = isDoorCombo ? h - panelH : h;

  const isDoorPanel = config.elementType === 'door' && config.doorFill === 'panel';

  return (
    <>
      {/* Glass or panel background */}
      {isDoorPanel ? (
        <rect x={x} y={y} width={w} height={h} rx="1" fill={colors.panel} />
      ) : isDoorCombo ? (
        <>
          <rect x={x} y={y} width={w} height={glassH} rx="1" fill={colors.glass} />
          <rect x={x} y={y + glassH} width={w} height={panelH} fill={colors.panel} />
          <line x1={x} y1={y + glassH} x2={x + w} y2={y + glassH} stroke={colors.frame} strokeWidth="2" />
        </>
      ) : (
        <rect x={x} y={y} width={w} height={h} rx="1" fill={colors.glass} />
      )}

      {/* Selection highlight */}
      {isSelected && (
        <>
          <rect x={x} y={y} width={w} height={h} rx="1" fill="hsl(210, 80%, 50%)" opacity="0.12" />
          <rect x={x} y={y} width={w} height={h} rx="1" fill="none" stroke="hsl(210, 80%, 50%)" strokeWidth="2.5" strokeDasharray="6 3" />
        </>
      )}

      {/* Type-specific overlays */}
      {config.elementType === 'fixed' && (
        <>
          <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
          <line x1={x + w - 4} y1={y + 4} x2={x + 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
        </>
      )}

      {config.elementType === 'opening' && <OpeningOverlay dir={config.openingDirection || 'left'} x={x} y={y} w={w} h={h} accent={colors.accent} />}

      {config.elementType === 'tilt-turn' && (
        <>
          <OpeningOverlay dir="side" x={x} y={y} w={w} h={h} accent={colors.accent} />
          {/* Top tilt indicator */}
          <line x1={x + 4} y1={y + 4} x2={cx} y2={y + h * 0.3} stroke={colors.accent} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
          <line x1={x + w - 4} y1={y + 4} x2={cx} y2={y + h * 0.3} stroke={colors.accent} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
          <polygon points={`${cx - 4},${y + h * 0.3 + 2} ${cx},${y + h * 0.3 - 4} ${cx + 4},${y + h * 0.3 + 2}`} fill={colors.accent} opacity="0.5" />
        </>
      )}

      {config.elementType === 'slider' && (
        <>
          <line x1={x + 8} y1={cy} x2={x + w - 8} y2={cy} stroke={colors.accent} strokeWidth="2" opacity="0.4" />
          <polygon points={`${x + 12},${cy - 4} ${x + 8},${cy} ${x + 12},${cy + 4}`} fill={colors.accent} opacity="0.5" />
          <polygon points={`${x + w - 12},${cy - 4} ${x + w - 8},${cy} ${x + w - 12},${cy + 4}`} fill={colors.accent} opacity="0.5" />
        </>
      )}

      {config.elementType === 'door' && (
        <>
          {/* Door handle */}
          <circle cx={x + w - 10} cy={cy} r="3" fill={colors.accent} opacity="0.7" />
          <rect x={x + w - 14} y={cy - 8} width="4" height="16" rx="2" fill={colors.accent} opacity="0.5" />
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
        <line x1={cx + 6} y1={cy} x2={cx - 10} y2={cy} stroke={accent} strokeWidth="1.5" opacity="0.5" />
        <polygon points={`${cx - 6},${cy - 4} ${cx - 10},${cy} ${cx - 6},${cy + 4}`} fill={accent} opacity="0.5" />
        <path d={`M ${x + w - 6} ${y + 6} Q ${x + w * 0.3} ${y + h * 0.15} ${x + 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
        <path d={`M ${x + w - 6} ${y + h - 6} Q ${x + w * 0.3} ${y + h * 0.85} ${x + 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
      </>
    );
  }
  if (dir === 'right') {
    return (
      <>
        <circle cx={x + 5} cy={cy} r="3" fill={accent} opacity="0.6" />
        <line x1={cx - 6} y1={cy} x2={cx + 10} y2={cy} stroke={accent} strokeWidth="1.5" opacity="0.5" />
        <polygon points={`${cx + 6},${cy - 4} ${cx + 10},${cy} ${cx + 6},${cy + 4}`} fill={accent} opacity="0.5" />
        <path d={`M ${x + 6} ${y + 6} Q ${x + w * 0.7} ${y + h * 0.15} ${x + w - 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
        <path d={`M ${x + 6} ${y + h - 6} Q ${x + w * 0.7} ${y + h * 0.85} ${x + w - 6} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.3" />
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
  if (dir === 'side') {
    return (
      <>
        <circle cx={x + 5} cy={cy} r="3" fill={accent} opacity="0.6" />
        <path d={`M ${x + 6} ${y + 6} L ${x + w - 6} ${cy} L ${x + 6} ${y + h - 6}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      </>
    );
  }
  // tilt-turn - handled in parent
  return null;
}

// ===== PANE EDITOR PANEL =====
function PaneEditor({
  config,
  onChange,
  onSplit,
}: {
  config: PaneConfig;
  onChange: (partial: Partial<PaneConfig>) => void;
  onSplit: (dir: 'vertical' | 'horizontal') => void;
}) {
  const elementTypes: ElementType[] = ['fixed', 'opening', 'slider', 'tilt-turn', 'door'];
  const openingDirs: OpeningDirection[] = ['left', 'right', 'top', 'side', 'tilt-turn'];
  const doorFills: DoorFillType[] = ['glass', 'panel', 'combo'];

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editimi i Pjesës</p>

      {/* Element type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipi</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {elementTypes.map(t => (
            <Button
              key={t}
              variant={config.elementType === t ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-8"
              onClick={() => onChange({ elementType: t, openingDirection: t === 'opening' ? 'left' : undefined, doorFill: t === 'door' ? 'glass' : undefined })}
            >
              {ELEMENT_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>

      {/* Opening direction */}
      {(config.elementType === 'opening') && (
        <div className="space-y-1.5">
          <Label className="text-xs">Drejtimi i Hapjes</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {openingDirs.filter(d => d !== 'tilt-turn').map(d => (
              <Button
                key={d}
                variant={config.openingDirection === d ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => onChange({ openingDirection: d })}
              >
                {OPENING_DIRECTION_LABELS[d]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Door fill */}
      {config.elementType === 'door' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mbushja e Derës</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {doorFills.map(f => (
              <Button
                key={f}
                variant={config.doorFill === f ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => onChange({ doorFill: f, doorComboRatio: f === 'combo' ? 50 : undefined })}
              >
                {DOOR_FILL_LABELS[f]}
              </Button>
            ))}
          </div>
          {config.doorFill === 'combo' && (
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-xs whitespace-nowrap">Panel %</Label>
              <Input
                type="number"
                min={10}
                max={90}
                value={config.doorComboRatio ?? 50}
                onChange={(e) => onChange({ doorComboRatio: Math.min(90, Math.max(10, Number(e.target.value))) })}
                className="w-20 h-8 text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* Split actions */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <Label className="text-xs">Ndaj këtë pjesë</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onSplit('vertical')}>
            <Columns2 className="h-3 w-3 mr-1" /> Vertikalisht
          </Button>
          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onSplit('horizontal')}>
            <Rows2 className="h-3 w-3 mr-1" /> Horizontalisht
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== SPLIT EDITOR PANEL =====
function SplitEditor({
  node,
  onUnsplit,
  onAddChild,
  onRemoveChild,
  onSizeChange,
}: {
  node: WindowNode;
  onUnsplit: () => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onSizeChange: (index: number, value: number) => void;
}) {
  if (!node.children || !node.sizes) return null;

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ndarje {node.direction === 'vertical' ? 'Vertikale' : 'Horizontale'}
        </p>
        <Button variant="destructive" size="sm" className="text-xs h-7" onClick={onUnsplit}>
          <Trash2 className="h-3 w-3 mr-1" /> Hiq Ndarjen
        </Button>
      </div>

      {/* Size controls for each child */}
      <div className="space-y-2">
        {node.children.map((child, i) => (
          <div key={child.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Pjesa {i + 1}</span>
            <Input
              type="number"
              value={node.sizes![i]}
              onChange={(e) => onSizeChange(i, Math.max(50, Number(e.target.value)))}
              className="w-24 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">mm</span>
            {node.children!.length > 2 && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRemoveChild(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {node.children.length < 6 && (
        <Button variant="outline" size="sm" className="text-xs w-full" onClick={onAddChild}>
          + Shto Pjesë
        </Button>
      )}

      <p className="text-xs text-muted-foreground italic">
        Kliko mbi një pjesë individuale për të edituar tipin e saj
      </p>
    </div>
  );
}

export default WindowEditor;
