// ===== ELEMENT TYPES =====
export type ProductType = 'window' | 'door';

export type ElementType = 'fixed' | 'opening' | 'door';

export type OpeningDirection = 'left' | 'right' | 'top';

export type DoorFillType = 'glass' | 'panel' | 'combo';

export type DoorComboPosition = 'panel-bottom' | 'panel-top';

export type WindowColor = 'white' | 'brown' | 'black';

export type SplitDirection = 'vertical' | 'horizontal';

// ===== PANE CONFIG =====
export interface PaneConfig {
  elementType: ElementType;
  openingDirection?: OpeningDirection;
  doorFill?: DoorFillType;
  doorComboRatio?: number;
  doorComboPosition?: DoorComboPosition;
}

// ===== RECURSIVE WINDOW NODE =====
export interface WindowNode {
  id: string;
  type: 'pane' | 'split';
  direction?: SplitDirection;
  children?: WindowNode[];
  sizes?: number[]; // mm for each child
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
  productType: ProductType;
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
  door: 'Derë',
};

export const OPENING_DIRECTION_LABELS: Record<OpeningDirection, string> = {
  left: 'Majtas',
  right: 'Djathtas',
  top: 'Kiper (Nga Lart)',
};

export const DOOR_FILL_LABELS: Record<DoorFillType, string> = {
  glass: 'Vetëm Xham',
  panel: 'Vetëm Panel',
  combo: 'Panel + Xham',
};

export const DOOR_COMBO_POSITION_LABELS: Record<DoorComboPosition, string> = {
  'panel-bottom': 'Paneli Poshtë',
  'panel-top': 'Paneli Lart',
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  window: 'Dritare',
  door: 'Derë',
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

export function createDefaultItem(productType: ProductType = 'window'): ConfigItem {
  const defaultPaneConfig: PaneConfig = productType === 'door'
    ? { elementType: 'door', openingDirection: 'left', doorFill: 'glass' }
    : { elementType: 'fixed' };
  return {
    id: crypto.randomUUID(),
    productType,
    width: productType === 'door' ? 900 : 1200,
    height: productType === 'door' ? 2100 : 1400,
    color: 'white',
    quantity: 1,
    rootNode: {
      id: crypto.randomUUID(),
      type: 'pane',
      paneConfig: defaultPaneConfig,
    },
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

export function splitNode(node: WindowNode, direction: SplitDirection, totalSize: number, numParts: number = 2): WindowNode {
  const partSize = Math.round(totalSize / numParts);
  const sizes = Array(numParts).fill(partSize);
  // Adjust last to account for rounding
  sizes[numParts - 1] = totalSize - partSize * (numParts - 1);

  const children: WindowNode[] = [];
  for (let i = 0; i < numParts; i++) {
    if (i === 0 && node.type === 'pane') {
      children.push({ ...node, id: crypto.randomUUID() });
    } else {
      children.push(createPaneNode());
    }
  }

  return {
    id: node.id,
    type: 'split',
    direction,
    sizes,
    children,
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
    if (config && (config.elementType === 'opening' || config.elementType === 'door')) {
      const perimeter = 2 * (widthMm + heightMm);
      acc.openingFrames += perimeter;
    }
    if (config?.elementType === 'door' && config.doorFill === 'combo' && config.doorComboRatio) {
      acc.dividers += widthMm;
    }
    return;
  }

  if (node.type === 'split' && node.children && node.sizes) {
    const count = node.children.length;
    const dividerCount = count - 1;
    if (node.direction === 'vertical') {
      acc.dividers += dividerCount * heightMm;
    } else {
      acc.dividers += dividerCount * widthMm;
    }

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
  const outerFrame = 2 * (item.width + item.height);
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
