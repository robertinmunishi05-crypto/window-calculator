import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  WindowStructure,
  WindowPane,
  PaneType,
  WindowColor,
  PANE_TYPE_LABELS,
  COLOR_LABELS,
} from "@/types/configurator";
import { cn } from "@/lib/utils";
import { Columns2, Rows2, Plus, Minus, Edit3 } from "lucide-react";

interface WindowEditorProps {
  structure: WindowStructure;
  onChange: (structure: WindowStructure) => void;
  color: WindowColor;
  width: number;
  height: number;
}

const COLOR_MAP: Record<WindowColor, { frame: string; glass: string; accent: string }> = {
  white: { frame: '#d4d4d4', glass: '#d4e8f7', accent: '#b0b0b0' },
  brown: { frame: '#6b4226', glass: '#b8d4e8', accent: '#8b6914' },
  black: { frame: '#2a2a2a', glass: '#a8c8e0', accent: '#555' },
};

const WindowEditor = ({ structure, onChange, color, width, height }: WindowEditorProps) => {
  const [selectedPaneId, setSelectedPaneId] = useState<string | null>(null);
  const c = COLOR_MAP[color];

  // Calculate SVG dimensions maintaining aspect ratio
  const maxW = 400;
  const maxH = 300;
  const ratio = width / height;
  let svgW: number, svgH: number;
  if (ratio > maxW / maxH) {
    svgW = maxW;
    svgH = maxW / ratio;
  } else {
    svgH = maxH;
    svgW = maxH * ratio;
  }

  const frameThickness = 8;
  const dividerThickness = 6;

  const handleSplitChange = (type: 'none' | 'vertical' | 'horizontal') => {
    if (type === 'none') {
      onChange({ splits: 'none', panes: [{ id: crypto.randomUUID(), type: 'fixed' }] });
    } else if (structure.splits !== type) {
      onChange({
        splits: type,
        panes: [
          { id: crypto.randomUUID(), type: 'fixed' },
          { id: crypto.randomUUID(), type: 'fixed' },
        ],
      });
    }
    setSelectedPaneId(null);
  };

  const addPane = () => {
    if (structure.splits === 'none') return;
    onChange({
      ...structure,
      panes: [...structure.panes, { id: crypto.randomUUID(), type: 'fixed' }],
    });
  };

  const removePane = () => {
    if (structure.panes.length <= 2) return;
    const newPanes = structure.panes.slice(0, -1);
    if (selectedPaneId && !newPanes.find(p => p.id === selectedPaneId)) {
      setSelectedPaneId(null);
    }
    onChange({ ...structure, panes: newPanes });
  };

  const changePaneType = (paneId: string, type: PaneType) => {
    onChange({
      ...structure,
      panes: structure.panes.map(p => p.id === paneId ? { ...p, type } : p),
    });
  };

  const selectedPane = structure.panes.find(p => p.id === selectedPaneId);

  // Calculate pane rectangles
  const getPaneRects = () => {
    const innerX = frameThickness;
    const innerY = frameThickness;
    const innerW = svgW - frameThickness * 2;
    const innerH = svgH - frameThickness * 2;
    const count = structure.panes.length;

    if (structure.splits === 'none' || count === 1) {
      return [{ x: innerX, y: innerY, w: innerW, h: innerH, pane: structure.panes[0] }];
    }

    const totalDividers = (count - 1) * dividerThickness;

    if (structure.splits === 'vertical') {
      const paneW = (innerW - totalDividers) / count;
      return structure.panes.map((pane, i) => ({
        x: innerX + i * (paneW + dividerThickness),
        y: innerY,
        w: paneW,
        h: innerH,
        pane,
      }));
    } else {
      const paneH = (innerH - totalDividers) / count;
      return structure.panes.map((pane, i) => ({
        x: innerX,
        y: innerY + i * (paneH + dividerThickness),
        w: innerW,
        h: paneH,
        pane,
      }));
    }
  };

  const rects = getPaneRects();
  const area = ((width / 1000) * (height / 1000)).toFixed(2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Edit3 className="h-4 w-4" />
          Editor i Dritares
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Split controls */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Ndarja</p>
          <div className="flex gap-2">
            <Button
              variant={structure.splits === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSplitChange('none')}
            >
              1 Pjesë
            </Button>
            <Button
              variant={structure.splits === 'vertical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSplitChange('vertical')}
            >
              <Columns2 className="h-4 w-4 mr-1" />
              Vertikale
            </Button>
            <Button
              variant={structure.splits === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSplitChange('horizontal')}
            >
              <Rows2 className="h-4 w-4 mr-1" />
              Horizontale
            </Button>
          </div>

          {structure.splits !== 'none' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={removePane} disabled={structure.panes.length <= 2}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium min-w-[3ch] text-center">{structure.panes.length}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={addPane} disabled={structure.panes.length >= 6}>
                <Plus className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">pjesë</span>
            </div>
          )}
        </div>

        {/* SVG Preview */}
        <div className="flex justify-center">
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="drop-shadow-lg cursor-pointer"
          >
            {/* Frame */}
            <rect x="0" y="0" width={svgW} height={svgH} rx="3" fill={c.frame} />

            {/* Panes */}
            {rects.map(({ x, y, w, h, pane }) => (
              <g key={pane.id} onClick={() => setSelectedPaneId(pane.id)} className="cursor-pointer">
                {/* Glass */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx="1"
                  fill={c.glass}
                  stroke={selectedPaneId === pane.id ? 'hsl(25, 30%, 32%)' : 'transparent'}
                  strokeWidth={selectedPaneId === pane.id ? 3 : 0}
                  strokeDasharray={selectedPaneId === pane.id ? '6 3' : ''}
                />

                {/* Selection highlight overlay */}
                {selectedPaneId === pane.id && (
                  <rect x={x} y={y} width={w} height={h} rx="1" fill="hsl(25, 30%, 32%)" opacity="0.08" />
                )}

                {/* Pane type indicators */}
                <PaneTypeOverlay type={pane.type} x={x} y={y} w={w} h={h} accent={c.accent} frame={c.frame} />
              </g>
            ))}
          </svg>
        </div>

        {/* Dimensions label */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {width} × {height} mm — {area} m² — {COLOR_LABELS[color]}
          </p>
        </div>

        {/* Pane type editor */}
        {selectedPane && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-primary/20">
            <p className="text-xs font-medium text-muted-foreground">
              Tipi i pjesës së selektuar:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PANE_TYPE_LABELS) as PaneType[]).map((type) => (
                <Button
                  key={type}
                  variant={selectedPane.type === type ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => changePaneType(selectedPane.id, type)}
                >
                  <PaneTypeIcon type={type} />
                  {PANE_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!selectedPane && structure.panes.length > 0 && (
          <p className="text-xs text-muted-foreground text-center italic">
            Kliko mbi një pjesë të dritares për ta edituar
          </p>
        )}
      </CardContent>
    </Card>
  );
};

function PaneTypeOverlay({ type, x, y, w, h, accent, frame }: {
  type: PaneType; x: number; y: number; w: number; h: number; accent: string; frame: string;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  switch (type) {
    case 'fixed':
      return (
        <>
          <line x1={x + w * 0.15} y1={y + h * 0.15} x2={x + w * 0.85} y2={y + h * 0.85} stroke={frame} strokeWidth="1.5" opacity="0.3" />
          <line x1={x + w * 0.85} y1={y + h * 0.15} x2={x + w * 0.15} y2={y + h * 0.85} stroke={frame} strokeWidth="1.5" opacity="0.3" />
        </>
      );
    case 'open-left':
      return (
        <>
          {/* Hinge on right */}
          <circle cx={x + w - 6} cy={cy} r="3" fill={accent} opacity="0.7" />
          {/* Arrow pointing left */}
          <line x1={cx + 8} y1={cy} x2={cx - 12} y2={cy} stroke={accent} strokeWidth="2" opacity="0.6" />
          <polyline points={`${cx - 8},${cy - 5} ${cx - 12},${cy} ${cx - 8},${cy + 5}`} fill="none" stroke={accent} strokeWidth="2" opacity="0.6" />
          {/* Opening arc */}
          <path d={`M ${x + w - 8} ${y + 8} Q ${x + w * 0.3} ${y + h * 0.15} ${x + 8} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
          <path d={`M ${x + w - 8} ${y + h - 8} Q ${x + w * 0.3} ${y + h * 0.85} ${x + 8} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
        </>
      );
    case 'open-right':
      return (
        <>
          {/* Hinge on left */}
          <circle cx={x + 6} cy={cy} r="3" fill={accent} opacity="0.7" />
          {/* Arrow pointing right */}
          <line x1={cx - 8} y1={cy} x2={cx + 12} y2={cy} stroke={accent} strokeWidth="2" opacity="0.6" />
          <polyline points={`${cx + 8},${cy - 5} ${cx + 12},${cy} ${cx + 8},${cy + 5}`} fill="none" stroke={accent} strokeWidth="2" opacity="0.6" />
          {/* Opening arc */}
          <path d={`M ${x + 8} ${y + 8} Q ${x + w * 0.7} ${y + h * 0.15} ${x + w - 8} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
          <path d={`M ${x + 8} ${y + h - 8} Q ${x + w * 0.7} ${y + h * 0.85} ${x + w - 8} ${cy}`} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
        </>
      );
    case 'slider':
      return (
        <>
          {/* Slider rails */}
          <line x1={x + 10} y1={cy - 1} x2={x + w - 10} y2={cy - 1} stroke={accent} strokeWidth="1.5" opacity="0.4" />
          <line x1={x + 10} y1={cy + 1} x2={x + w - 10} y2={cy + 1} stroke={accent} strokeWidth="1.5" opacity="0.4" />
          {/* Arrows */}
          <polyline points={`${cx - 4},${cy - 5} ${cx - 10},${cy} ${cx - 4},${cy + 5}`} fill="none" stroke={accent} strokeWidth="2" opacity="0.5" />
          <polyline points={`${cx + 4},${cy - 5} ${cx + 10},${cy} ${cx + 4},${cy + 5}`} fill="none" stroke={accent} strokeWidth="2" opacity="0.5" />
        </>
      );
    default:
      return null;
  }
}

function PaneTypeIcon({ type }: { type: PaneType }) {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="1.5">
      {type === 'fixed' && (
        <>
          <rect x="3" y="3" width="14" height="14" rx="1" />
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </>
      )}
      {type === 'open-left' && (
        <>
          <rect x="3" y="3" width="14" height="14" rx="1" />
          <path d="M13 6 L7 10 L13 14" />
        </>
      )}
      {type === 'open-right' && (
        <>
          <rect x="3" y="3" width="14" height="14" rx="1" />
          <path d="M7 6 L13 10 L7 14" />
        </>
      )}
      {type === 'slider' && (
        <>
          <rect x="3" y="3" width="14" height="14" rx="1" />
          <line x1="6" y1="10" x2="14" y2="10" />
          <polyline points="7,8 5,10 7,12" />
          <polyline points="13,8 15,10 13,12" />
        </>
      )}
    </svg>
  );
}

export default WindowEditor;
