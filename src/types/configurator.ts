// ===== ELEMENT TYPES =====
export type ProductType = 'window' | 'door';

export type ElementType = 'fixed' | 'opening' | 'slider' | 'door';

export type OpeningDirection = 'left' | 'right';

export type DoorFillType = 'glass' | 'panel' | 'combo';

export type DoorComboPosition = 'panel-bottom' | 'panel-top';

export type WindowColor = 'white' | 'brown' | 'black';

export type SplitDirection = 'vertical' | 'horizontal';

// ===== PROFILE SYSTEM =====
export type ProfileSystemType = 'veka' | 'aluplast' | 'other';

export const PROFILE_SYSTEMS: Record<ProfileSystemType, { label: string; frameThicknessCm: number }> = {
  veka: { label: 'VEKA', frameThicknessCm: 8.2 },
  aluplast: { label: 'ALUPLAST', frameThicknessCm: 8.5 },
  other: { label: 'Tjetër (Custom)', frameThicknessCm: 7.0 },
};

export interface ProfileSystem {
  type: ProfileSystemType;
  customFrameThicknessCm?: number;
}

export function getFrameThicknessCm(profile: ProfileSystem): number {
  if (profile.type === 'other' && profile.customFrameThicknessCm !== undefined) {
    return profile.customFrameThicknessCm;
  }
  return PROFILE_SYSTEMS[profile.type].frameThicknessCm;
}

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
  slider: 'Shiber',
  door: 'Derë',
};

export const OPENING_DIRECTION_LABELS: Record<OpeningDirection, string> = {
  left: 'Majtas',
  right: 'Djathtas',
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
    ? { elementType: 'fixed', doorFill: 'panel' as any }
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
  sizes[numParts - 1] = totalSize - partSize * (numParts - 1);

  const children: WindowNode[] = [];
  for (let i = 0; i < numParts; i++) {
    children.push(createPaneNode());
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
    if (config && (config.elementType === 'opening' || config.elementType === 'door' || config.elementType === 'slider')) {
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

// ===== GLASS / PANEL SIZE CALCULATION =====
export interface GlassPanelSize {
  label: string;
  widthCm: number;
  heightCm: number;
  widthMm: number;
  heightMm: number;
  type: 'glass' | 'panel';
}

function collectGlassPanelSizes(
  node: WindowNode,
  widthMm: number,
  heightMm: number,
  frameThicknessMm: number,
  isOuterLeft: boolean,
  isOuterRight: boolean,
  isOuterTop: boolean,
  isOuterBottom: boolean,
  acc: GlassPanelSize[],
  index: { count: number }
) {
  if (node.type === 'pane') {
    const config = node.paneConfig;
    if (!config) return;
    
    // Field (opening) = pane allocation minus frame/divider deductions
    // Outer edges: subtract frame thickness
    // Inner edges (dividers): subtract half divider (approx same as frame for simplicity)
    // But user says: field already accounts for frame. glass = field - 3mm
    // So: field_width = widthMm (the allocation) and glass = field - 3mm
    // The frame deduction is conceptual - the sizes represent the physical allocation
    // Glass tolerance: 3mm total (1.5mm each side)
    const glassTolerance = 3; // mm
    const glassW = widthMm - glassTolerance;
    const glassH = heightMm - glassTolerance;

    if (config.doorFill === 'panel') {
      index.count++;
      acc.push({
        label: `Panel ${index.count}`,
        widthMm: glassW,
        heightMm: glassH,
        widthCm: glassW / 10,
        heightCm: glassH / 10,
        type: 'panel',
      });
    } else if (config.elementType === 'door' && config.doorFill === 'combo' && config.doorComboRatio) {
      const panelRatio = config.doorComboRatio / 100;
      const panelH = heightMm * panelRatio - glassTolerance;
      const glassPartH = heightMm * (1 - panelRatio) - glassTolerance;
      index.count++;
      acc.push({
        label: `Panel ${index.count}`,
        widthMm: glassW,
        heightMm: panelH,
        widthCm: glassW / 10,
        heightCm: panelH / 10,
        type: 'panel',
      });
      index.count++;
      acc.push({
        label: `Xham ${index.count}`,
        widthMm: glassW,
        heightMm: glassPartH,
        widthCm: glassW / 10,
        heightCm: glassPartH / 10,
        type: 'glass',
      });
    } else {
      index.count++;
      acc.push({
        label: `Xham ${index.count}`,
        widthMm: glassW,
        heightMm: glassH,
        widthCm: glassW / 10,
        heightCm: glassH / 10,
        type: 'glass',
      });
    }
    return;
  }

  if (node.type === 'split' && node.children && node.sizes) {
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
      collectGlassPanelSizes(
        child, childW, childH, frameThicknessMm,
        node.direction === 'vertical' ? i === 0 && isOuterLeft : isOuterLeft,
        node.direction === 'vertical' ? i === node.children!.length - 1 && isOuterRight : isOuterRight,
        node.direction === 'horizontal' ? i === 0 && isOuterTop : isOuterTop,
        node.direction === 'horizontal' ? i === node.children!.length - 1 && isOuterBottom : isOuterBottom,
        acc, index
      );
    });
  }
}

export function calculateGlassPanelSizes(rootNode: WindowNode, widthMm: number, heightMm: number, frameThicknessMm: number = 82): GlassPanelSize[] {
  const acc: GlassPanelSize[] = [];
  collectGlassPanelSizes(rootNode, widthMm, heightMm, frameThicknessMm, true, true, true, true, acc, { count: 0 });
  return acc;
}

// ===== DESCRIBE NODE FOR PDF =====
export function describeNode(node: WindowNode): string {
  if (node.type === 'pane' && node.paneConfig) {
    const config = node.paneConfig;
    if (config.doorFill === 'panel' && config.elementType === 'fixed') return 'Panel';
    let desc = ELEMENT_TYPE_LABELS[config.elementType];
    if ((config.elementType === 'opening' || config.elementType === 'slider') && config.openingDirection) {
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
