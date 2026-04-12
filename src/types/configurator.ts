// ===== ELEMENT TYPES =====
export type ElementType = 'fixed' | 'opening' | 'slider' | 'tilt-turn' | 'door';

export type OpeningDirection = 'left' | 'right' | 'top' | 'side' | 'tilt-turn';

export type DoorFillType = 'glass' | 'panel' | 'combo';

export type WindowColor = 'white' | 'brown' | 'black';

export type SplitDirection = 'vertical' | 'horizontal';

// ===== PANE CONFIG =====
export interface PaneConfig {
  elementType: ElementType;
  openingDirection?: OpeningDirection;
  doorFill?: DoorFillType;
  doorComboRatio?: number; // percentage of panel from bottom (0-100)
}

// ===== RECURSIVE WINDOW NODE =====
export interface WindowNode {
  id: string;
  type: 'pane' | 'split';
  // Split properties
  direction?: SplitDirection;
  children?: WindowNode[];
  sizes?: number[]; // mm for each child
  // Pane properties
  paneConfig?: PaneConfig;
}

// ===== CLIENT DATA =====
export interface ClientData {
  name: string;
  phone: string;
  address: string;
}

// ===== CONFIG ITEM =====
export interface ConfigItem {
  id: string;
  width: number;  // mm
  height: number; // mm
  color: WindowColor;
  quantity: number;
  rootNode: WindowNode;
}

// ===== LABELS =====
export const COLOR_LABELS: Record<WindowColor, string> = {
  white: 'E Bardhë',
  brown: 'Kafe',
  black: 'E Zezë',
};

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  fixed: 'Fiks',
  opening: 'Hapëse',
  slider: 'Shibër',
  'tilt-turn': 'Hibishibër',
  door: 'Derë',
};

export const OPENING_DIRECTION_LABELS: Record<OpeningDirection, string> = {
  left: 'Majtas',
  right: 'Djathtas',
  top: 'Kiper (Nga Lart)',
  side: 'Anash',
  'tilt-turn': 'Anash + Kiper',
};

export const DOOR_FILL_LABELS: Record<DoorFillType, string> = {
  glass: 'Vetëm Xham',
  panel: 'Vetëm Panel',
  combo: 'Panel + Xham',
};

// ===== HELPERS =====
export function createDefaultPaneConfig(): PaneConfig {
  return { elementType: 'fixed' };
}

export function createPaneNode(): WindowNode {
  return {
    id: crypto.randomUUID(),
    type: 'pane',
    paneConfig: createDefaultPaneConfig(),
  };
}

export function createDefaultRootNode(): WindowNode {
  return createPaneNode();
}

export function createDefaultItem(): ConfigItem {
  return {
    id: crypto.randomUUID(),
    width: 1200,
    height: 1400,
    color: 'white',
    quantity: 1,
    rootNode: createDefaultRootNode(),
  };
}

// ===== NODE UTILITIES =====
export function findNode(root: WindowNode, id: string): WindowNode | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateNode(root: WindowNode, id: string, updater: (node: WindowNode) => WindowNode): WindowNode {
  if (root.id === id) return updater(root);
  if (root.children) {
    return {
      ...root,
      children: root.children.map(child => updateNode(child, id, updater)),
    };
  }
  return root;
}

export function splitNode(node: WindowNode, direction: SplitDirection, totalSize: number): WindowNode {
  const halfSize = Math.round(totalSize / 2);
  return {
    id: node.id,
    type: 'split',
    direction,
    sizes: [halfSize, totalSize - halfSize],
    children: [
      node.type === 'pane' ? { ...node, id: crypto.randomUUID() } : createPaneNode(),
      createPaneNode(),
    ],
  };
}

// ===== LINEAR METERS CALCULATION =====
export interface LinearMeterResult {
  outerFrame: number;
  innerDividers: number;
  openingFrames: number;
  total: number;
}

function collectLinearMeters(
  node: WindowNode,
  widthMm: number,
  heightMm: number,
  acc: { dividers: number; openingFrames: number }
) {
  if (node.type === 'pane') {
    const config = node.paneConfig;
    if (config && (config.elementType === 'opening' || config.elementType === 'tilt-turn' || config.elementType === 'door')) {
      // Opening pane has its own frame
      const perimeter = 2 * (widthMm + heightMm);
      acc.openingFrames += perimeter;
    }
    if (config?.elementType === 'door' && config.doorFill === 'combo' && config.doorComboRatio) {
      // Combo door has a horizontal divider
      acc.dividers += widthMm;
    }
    return;
  }

  if (node.type === 'split' && node.children && node.sizes) {
    const count = node.children.length;
    // Add dividers (count - 1)
    const dividerCount = count - 1;
    if (node.direction === 'vertical') {
      acc.dividers += dividerCount * heightMm;
    } else {
      acc.dividers += dividerCount * widthMm;
    }

    // Recurse into children
    const totalSize = node.sizes.reduce((a, b) => a + b, 0);
    node.children.forEach((child, i) => {
      const childSize = node.sizes![i] || 0;
      let childW: number, childH: number;
      if (node.direction === 'vertical') {
        childW = childSize;
        childH = heightMm;
      } else {
        childW = widthMm;
        childH = childSize;
      }
      collectLinearMeters(child, childW, childH, acc);
    });
  }
}

export function calculateLinearMeters(item: ConfigItem): LinearMeterResult {
  const outerFrame = 2 * (item.width + item.height); // mm
  const acc = { dividers: 0, openingFrames: 0 };
  collectLinearMeters(item.rootNode, item.width, item.height, acc);

  const outerM = outerFrame / 1000;
  const dividersM = acc.dividers / 1000;
  const openingM = acc.openingFrames / 1000;

  return {
    outerFrame: outerM,
    innerDividers: dividersM,
    openingFrames: openingM,
    total: outerM + dividersM + openingM,
  };
}

// ===== DESCRIBE NODE FOR PDF =====
export function describeNode(node: WindowNode): string {
  if (node.type === 'pane' && node.paneConfig) {
    const config = node.paneConfig;
    let desc = ELEMENT_TYPE_LABELS[config.elementType];
    if (config.elementType === 'opening' && config.openingDirection) {
      desc += ` (${OPENING_DIRECTION_LABELS[config.openingDirection]})`;
    }
    if (config.elementType === 'door' && config.doorFill) {
      desc += ` - ${DOOR_FILL_LABELS[config.doorFill]}`;
    }
    return desc;
  }
  if (node.type === 'split' && node.children) {
    const dir = node.direction === 'vertical' ? 'V' : 'H';
    return `[${dir}: ${node.children.map(c => describeNode(c)).join(' | ')}]`;
  }
  return '';
}
