export type ProductType = 
  | 'dritare'
  | 'dere';

export type WindowColor = 'white' | 'brown' | 'black';

export type PaneType = 'fixed' | 'open-left' | 'open-right' | 'slider';

export interface WindowPane {
  id: string;
  type: PaneType;
}

export interface WindowStructure {
  splits: 'none' | 'vertical' | 'horizontal';
  panes: WindowPane[];
}

export interface ClientData {
  name: string;
  phone: string;
  address: string;
}

export interface ConfigItem {
  id: string;
  productType: ProductType;
  width: number;
  height: number;
  color: WindowColor;
  pricePerSqm: number;
  quantity: number;
  structure: WindowStructure;
}

export const PRODUCT_LABELS: Record<ProductType, string> = {
  'dritare': 'Dritare',
  'dere': 'Derë',
};

export const COLOR_LABELS: Record<WindowColor, string> = {
  white: 'E Bardhë',
  brown: 'Kafe',
  black: 'E Zezë',
};

export const DEFAULT_PRICES: Record<WindowColor, number> = {
  white: 85,
  brown: 95,
  black: 100,
};

export const PANE_TYPE_LABELS: Record<PaneType, string> = {
  'fixed': 'Fiks',
  'open-left': 'Hapëse Majtas',
  'open-right': 'Hapëse Djathtas',
  'slider': 'Shibër',
};

export function createDefaultStructure(): WindowStructure {
  return {
    splits: 'none',
    panes: [{ id: crypto.randomUUID(), type: 'fixed' }],
  };
}
