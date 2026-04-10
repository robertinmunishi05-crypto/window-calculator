export type ProductType = 
  | 'dritare-fikse'
  | 'dritare-dy-krahe'
  | 'nje-krahe-fiks'
  | 'dy-krahe-hapese'
  | 'shiber'
  | 'hibishiber'
  | 'dere';

export type WindowColor = 'white' | 'brown' | 'black';

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
}

export const PRODUCT_LABELS: Record<ProductType, string> = {
  'dritare-fikse': 'Dritare Fikse',
  'dritare-dy-krahe': 'Dritare me Dy Krahë',
  'nje-krahe-fiks': 'Një Krahë + Fiks',
  'dy-krahe-hapese': 'Dy Krahë Hapëse',
  'shiber': 'Shibër',
  'hibishiber': 'Hibishibër',
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
