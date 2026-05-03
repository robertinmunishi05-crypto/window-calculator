import { useState, useCallback, useRef, useEffect } from "react";
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
import { Edit3, Trash2, Plus, Undo2, MousePointerClick, Move, ArrowLeftRight, ArrowUpDown, X as XIcon, Square, DoorOpen as DoorIcon, RectangleHorizontal } from "lucide-react";

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

interface DragState {
  splitId: string;
  dividerIndex: number;
  direction: 'vertical' | 'horizontal';
  startPos: number;
  startSizes: number[];
  totalPixels: number;
  totalMm: number;
}

const WindowEditor = ({ rootNode, onChange, color, width, height, productType }: WindowEditorProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<WindowNode[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
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

  const pushHistory = () => {
    setHistory(prev => [...prev.slice(-20), rootNode]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    onChange(prev);
    setSelectedId(null);
  };

  const applyChange = (newRoot: WindowNode) => {
    pushHistory();
    onChange(newRoot);
  };

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

  const handleSplitWithCount = (direction: 'vertical' | 'horizontal', count: number) => {
    if (!selectedId) return;
    const node = findNode(rootNode, selectedId);
    if (!node || node.type !== 'pane') return;
    const size = direction === 'vertical' ? width : height;
    const newRoot = updateNode(rootNode, selectedId, (n) => splitNode(n, direction, size, count));
    applyChange(newRoot);
  };

  const handleResplit = (splitId: string, newCount: number) => {
    if (newCount < 2) return;
    const splitNodeFound = findNode(rootNode, splitId);
    if (!splitNodeFound || splitNodeFound.type !== 'split') return;
    const dir = splitNodeFound.direction!;
    const totalSize = splitNodeFound.sizes!.reduce((a, b) => a + b, 0);
    const partSize = Math.round(totalSize / newCount);
    const sizes = Array(newCount).fill(partSize);
    sizes[newCount - 1] = totalSize - partSize * (newCount - 1);
    const children: WindowNode[] = [];
    for (let i = 0; i < newCount; i++) {
      if (i < splitNodeFound.children!.length) {
        children.push(splitNodeFound.children![i]);
      } else {
        children.push(createPaneNode());
      }
    }
    const newRoot = updateNode(rootNode, splitId, () => ({
      id: splitId,
      type: 'split' as const,
      direction: dir,
      sizes,
      children,
    }));
    applyChange(newRoot);
  };

  const handleDeletePane = () => {
    if (!selectedId) return;
    const parent = findParentSplit(rootNode, selectedId);
    if (!parent || !parent.children || !parent.sizes) return;

    pushHistory();
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
    pushHistory();
    const newRoot = updateNode(rootNode, selectedId, (n) => ({
      ...n,
      paneConfig: { ...n.paneConfig!, ...config },
    }));
    onChange(newRoot);
  };

  const handleSizeChangeCm = (splitId: string, childIndex: number, newSizeCm: number) => {
    const splitNodeFound = findNode(rootNode, splitId);
    if (!splitNodeFound || !splitNodeFound.sizes) return;
    
    const newSizeMm = Math.round(newSizeCm * 10);
    const oldSizeMm = splitNodeFound.sizes[childIndex];
    const diff = newSizeMm - oldSizeMm;
    
    // Find a neighbor to take the difference
    const newSizes = [...splitNodeFound.sizes];
    newSizes[childIndex] = newSizeMm;
    
    // Distribute difference to next sibling, or previous if last
    if (childIndex < newSizes.length - 1) {
      newSizes[childIndex + 1] = Math.max(10, newSizes[childIndex + 1] - diff);
    } else if (childIndex > 0) {
      newSizes[childIndex - 1] = Math.max(10, newSizes[childIndex - 1] - diff);
    }
    
    const newRoot = updateNode(rootNode, splitId, (n) => ({
      ...n,
      sizes: newSizes,
    }));
    onChange(newRoot);
  };

  const addChildToSplit = (splitId: string) => {
    pushHistory();
    const newRoot = updateNode(rootNode, splitId, (n) => {
      if (!n.children || !n.sizes) return n;
      const totalSize = n.sizes.reduce((a, b) => a + b, 0);
      const newChildSize = Math.round(totalSize / (n.children.length + 1));
      const newSizes = [...n.sizes];
      newSizes[newSizes.length - 1] = newSizes[newSizes.length - 1] - newChildSize;
      newSizes.push(newChildSize);
      return {
        ...n,
        children: [...n.children, createPaneNode()],
        sizes: newSizes,
      };
    });
    onChange(newRoot);
  };

  // ===== DRAG TO RESIZE =====
  const handleDividerMouseDown = (
    e: React.MouseEvent,
    splitId: string,
    dividerIndex: number,
    direction: 'vertical' | 'horizontal',
    totalPixels: number,
    sizes: number[],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    pushHistory();
    const totalMm = sizes.reduce((a, b) => a + b, 0);
    setDragState({
      splitId,
      dividerIndex,
      direction,
      startPos: direction === 'vertical' ? e.clientX : e.clientY,
      startSizes: [...sizes],
      totalPixels,
      totalMm,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = dragState.direction === 'vertical' ? e.clientX : e.clientY;
      const deltaPixels = currentPos - dragState.startPos;
      const deltaMm = (deltaPixels / dragState.totalPixels) * dragState.totalMm;

      const idx = dragState.dividerIndex;
      const newSizes = [...dragState.startSizes];
      const newLeft = dragState.startSizes[idx] + deltaMm;
      const newRight = dragState.startSizes[idx + 1] - deltaMm;

      // Minimum 2cm (20mm) per section
      const minSize = 20;
      if (newLeft >= minSize && newRight >= minSize) {
        newSizes[idx] = Math.round(newLeft);
        newSizes[idx + 1] = Math.round(newRight);

        const newRoot = updateNode(rootNode, dragState.splitId, (n) => ({
          ...n,
          sizes: newSizes,
        }));
        onChange(newRoot);
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, rootNode, onChange]);

  // Touch support for mobile drag
  useEffect(() => {
    if (!dragState) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const currentPos = dragState.direction === 'vertical' ? touch.clientX : touch.clientY;
      const deltaPixels = currentPos - dragState.startPos;
      const deltaMm = (deltaPixels / dragState.totalPixels) * dragState.totalMm;

      const idx = dragState.dividerIndex;
      const newSizes = [...dragState.startSizes];
      const newLeft = dragState.startSizes[idx] + deltaMm;
      const newRight = dragState.startSizes[idx + 1] - deltaMm;

      const minSize = 20;
      if (newLeft >= minSize && newRight >= minSize) {
        newSizes[idx] = Math.round(newLeft);
        newSizes[idx + 1] = Math.round(newRight);

        const newRoot = updateNode(rootNode, dragState.splitId, (n) => ({
          ...n,
          sizes: newSizes,
        }));
        onChange(newRoot);
      }
    };

    const handleTouchEnd = () => {
      setDragState(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState, rootNode, onChange]);

  const isRootNode = selectedId === rootNode.id;
  const parentSplit = selectedId ? findParentSplit(rootNode, selectedId) : null;

  const windowElementTypes: ElementType[] = ['fixed', 'opening', 'slider'];

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
      const totalPx = node.direction === 'vertical' ? w : h;

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

        // Draggable divider
        if (i < node.children!.length - 1) {
          const divHitSize = 14; // larger hit area
          if (node.direction === 'vertical') {
            const divX = x + offset - dividerT / 2;
            elements.push(
              <g key={`div-${node.id}-${i}`}>
                <rect x={divX} y={y} width={dividerT} height={h} fill={c.frame} />
                <rect
                  x={divX - (divHitSize - dividerT) / 2}
                  y={y}
                  width={divHitSize}
                  height={h}
                  fill="transparent"
                  className="cursor-col-resize"
                  onMouseDown={(e) => handleDividerMouseDown(e, node.id, i, 'vertical', totalPx, [...node.sizes!])}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.stopPropagation();
                    pushHistory();
                    setDragState({
                      splitId: node.id,
                      dividerIndex: i,
                      direction: 'vertical',
                      startPos: touch.clientX,
                      startSizes: [...node.sizes!],
                      totalPixels: totalPx,
                      totalMm: node.sizes!.reduce((a, b) => a + b, 0),
                    });
                  }}
                />
              </g>
            );
          } else {
            const divY = y + offset - dividerT / 2;
            elements.push(
              <g key={`div-${node.id}-${i}`}>
                <rect x={x} y={divY} width={w} height={dividerT} fill={c.frame} />
                <rect
                  x={x}
                  y={divY - (divHitSize - dividerT) / 2}
                  width={w}
                  height={divHitSize}
                  fill="transparent"
                  className="cursor-row-resize"
                  onMouseDown={(e) => handleDividerMouseDown(e, node.id, i, 'horizontal', totalPx, [...node.sizes!])}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.stopPropagation();
                    pushHistory();
                    setDragState({
                      splitId: node.id,
                      dividerIndex: i,
                      direction: 'horizontal',
                      startPos: touch.clientY,
                      startSizes: [...node.sizes!],
                      totalPixels: totalPx,
                      totalMm: node.sizes!.reduce((a, b) => a + b, 0),
                    });
                  }}
                />
              </g>
            );
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
          {history.length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1" onClick={handleUndo}>
              <Undo2 className="h-3.5 w-3.5" /> Kthim
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG Preview */}
        <div className="flex justify-center bg-muted/30 rounded-lg p-4 overflow-x-auto">
          <svg
            ref={svgRef}
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className={cn("drop-shadow-lg max-w-full h-auto", dragState && "select-none")}
            onClick={() => !dragState && setSelectedId(null)}
          >
            <rect x="0" y="0" width={svgW} height={svgH} rx="3" fill={c.frame} />
            {renderNode(rootNode, innerX, innerY, innerW, innerH)}
          </svg>
        </div>

        {/* Dimensions label */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {(width / 10).toFixed(1)} × {(height / 10).toFixed(1)} cm — {COLOR_LABELS[color]}
          </p>
          {dragState && (
            <p className="text-xs text-primary font-medium mt-1 animate-pulse">
              🔄 Duke ndryshuar madhësinë... lësho për të konfirmuar
            </p>
          )}
        </div>

        {/* Help text */}
        {!selectedNode && !dragState && (
          <div className="text-center py-3 rounded-lg border border-dashed border-muted-foreground/30">
            <p className="text-sm text-muted-foreground">
              👆 Kliko mbi {productType === 'door' ? 'derën' : 'dritaren'} për ta edituar
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              ↔ Tërhiq ndarjet për të ndryshuar madhësinë
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
                  <Label className="text-xs font-medium">Tipi i kësaj pjese</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['panel', 'glass', 'door'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          if (t === 'door') {
                            handlePaneConfigChange({
                              elementType: 'door',
                              openingDirection: selectedNode.paneConfig?.openingDirection || 'left',
                              doorFill: 'glass',
                            });
                          } else if (t === 'glass') {
                            handlePaneConfigChange({ elementType: 'fixed', doorFill: undefined });
                          } else {
                            handlePaneConfigChange({ elementType: 'fixed', doorFill: 'panel' as any });
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-md border-2 transition-all text-xs",
                          (t === 'panel' && selectedNode.paneConfig?.doorFill === 'panel') ||
                          (t === 'glass' && selectedNode.paneConfig?.elementType === 'fixed' && selectedNode.paneConfig?.doorFill !== 'panel') ||
                          (t === 'door' && selectedNode.paneConfig?.elementType === 'door')
                            ? "border-primary bg-primary/10 font-semibold"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <span className="text-lg">{t === 'panel' ? '▬' : t === 'glass' ? '◻' : '🚪'}</span>
                        <span>{t === 'panel' ? 'Panel' : t === 'glass' ? 'Xham' : 'Derë'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedNode.paneConfig?.elementType === 'door' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Drejtimi i hapjes</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['left', 'right'] as OpeningDirection[]).map(d => (
                        <Button
                          key={d}
                          variant={selectedNode.paneConfig?.openingDirection === d ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-9"
                          onClick={() => handlePaneConfigChange({ openingDirection: d })}
                        >
                          {d === 'left' ? '← Majtas' : 'Djathtas →'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* === WINDOW MODE === */}
            {productType === 'window' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Çfarë tipi është kjo pjesë?</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {windowElementTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => handlePaneConfigChange({
                          elementType: t,
                          openingDirection: (t === 'opening' || t === 'slider') ? 'left' : undefined,
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
                          {t === 'fixed' ? '✕' : t === 'slider' ? '↔' : '↗'}
                        </span>
                        <span>{ELEMENT_TYPE_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedNode.paneConfig?.elementType === 'opening' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Drejtimi i hapjes</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['left', 'right'] as OpeningDirection[]).map(d => (
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

                {selectedNode.paneConfig?.elementType === 'slider' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Drejtimi i shiberit</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['left', 'right'] as OpeningDirection[]).map(d => (
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

            {/* Split this pane - preset buttons */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium">Ndaj këtë pjesë</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-6">↕</span>
                  <div className="flex gap-1 flex-1">
                    {[2, 3, 4].map(n => (
                      <Button key={n} variant="outline" size="sm" className="text-xs flex-1 h-8" onClick={() => handleSplitWithCount('vertical', n)}>
                        {n}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      placeholder="+"
                      className="w-14 h-8 text-xs text-center"
                      min={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = Number((e.target as HTMLInputElement).value);
                          if (val >= 2) handleSplitWithCount('vertical', val);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-6">↔</span>
                  <div className="flex gap-1 flex-1">
                    {[2, 3, 4].map(n => (
                      <Button key={n} variant="outline" size="sm" className="text-xs flex-1 h-8" onClick={() => handleSplitWithCount('horizontal', n)}>
                        {n}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      placeholder="+"
                      className="w-14 h-8 text-xs text-center"
                      min={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = Number((e.target as HTMLInputElement).value);
                          if (val >= 2) handleSplitWithCount('horizontal', val);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sizes in cm - freely editable */}
            {parentSplit && parentSplit.children && parentSplit.sizes && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Madhësia e pjesëve (cm)</Label>
                  <div className="flex gap-1">
                    {[2, 3, 4].map(n => (
                      <Button
                        key={n}
                        variant={parentSplit.children!.length === n ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-6 w-6 p-0"
                        onClick={() => handleResplit(parentSplit.id, n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
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

  const isDoorPanel = config.doorFill === 'panel';
  const isDoorCombo = config.elementType === 'door' && config.doorFill === 'combo';
  const panelRatio = (config.doorComboRatio ?? 50) / 100;
  const panelOnTop = config.doorComboPosition === 'panel-top';
  const panelH = isDoorCombo ? h * panelRatio : 0;
  const glassH = isDoorCombo ? h - panelH : h;

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

      {config.elementType === 'fixed' && !isDoorPanel && (
        <>
          <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
          <line x1={x + w - 4} y1={y + 4} x2={x + 4} y2={y + h - 4} stroke={colors.frame} strokeWidth="1" opacity="0.25" />
        </>
      )}

      {config.elementType === 'opening' && <OpeningOverlay dir={config.openingDirection || 'left'} x={x} y={y} w={w} h={h} accent={colors.accent} />}

      {config.elementType === 'slider' && <SliderOverlay dir={config.openingDirection || 'left'} x={x} y={y} w={w} h={h} accent={colors.accent} />}

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
  return null;
}

function SliderOverlay({ dir, x, y, w, h, accent }: {
  dir: OpeningDirection; x: number; y: number; w: number; h: number; accent: string;
}) {
  const cy = y + h / 2;
  if (dir === 'left') {
    return (
      <>
        <line x1={x + w * 0.7} y1={cy} x2={x + w * 0.3} y2={cy} stroke={accent} strokeWidth="2" opacity="0.5" />
        <polygon points={`${x + w * 0.3},${cy} ${x + w * 0.35},${cy - 4} ${x + w * 0.35},${cy + 4}`} fill={accent} opacity="0.5" />
      </>
    );
  }
  if (dir === 'right') {
    return (
      <>
        <line x1={x + w * 0.3} y1={cy} x2={x + w * 0.7} y2={cy} stroke={accent} strokeWidth="2" opacity="0.5" />
        <polygon points={`${x + w * 0.7},${cy} ${x + w * 0.65},${cy - 4} ${x + w * 0.65},${cy + 4}`} fill={accent} opacity="0.5" />
      </>
    );
  }
  return null;
}

export default WindowEditor;
