import { Product, Category, StockVariant, StockStatus } from '@/types';

export interface ColorDefinition {
  name: string;
  hex: string;
  border?: boolean;
}

export const COLOR_PALETTE: ColorDefinition[] = [
  { name: 'Noir', hex: '#18181B' },
  { name: 'Blanc', hex: '#FFFFFF', border: true },
  { name: 'Beige', hex: '#D8C3A5' },
  { name: 'Ivoire', hex: '#FAF6EE', border: true },
  { name: 'Sauge', hex: '#8F9E8B' },
  { name: 'Camel', hex: '#C19A6B' },
  { name: 'Mocha', hex: '#5E4A3B' },
  { name: 'Bordeaux', hex: '#6A1B29' },
  { name: 'Bleu Marine', hex: '#1E293B' },
  { name: 'Terracotta', hex: '#C46851' },
  { name: 'Kaki', hex: '#596047' },
  { name: 'Rose Poudré', hex: '#E8C5C8' },
  { name: 'Jaune Pastel', hex: '#F6E58D' },
];

export const getColorHex = (colorName: string): string => {
  const found = COLOR_PALETTE.find(
    (c) => c.name.toLowerCase() === colorName.trim().toLowerCase()
  );
  if (found) return found.hex;
  const lower = colorName.toLowerCase().trim();
  if (lower.includes('noir') || lower.includes('black')) return '#18181B';
  if (lower.includes('blanc') || lower.includes('white')) return '#FFFFFF';
  if (lower.includes('beige') || lower.includes('creme') || lower.includes('crème')) return '#D8C3A5';
  if (lower.includes('ivoire') || lower.includes('ivory')) return '#FAF6EE';
  if (lower.includes('sauge') || lower.includes('sage') || lower.includes('vert')) return '#8F9E8B';
  if (lower.includes('camel') || lower.includes('marron')) return '#C19A6B';
  if (lower.includes('mocha') || lower.includes('chocolat')) return '#5E4A3B';
  if (lower.includes('bordeaux') || lower.includes('rouge')) return '#6A1B29';
  if (lower.includes('bleu') || lower.includes('navy')) return '#1E293B';
  if (lower.includes('rose')) return '#E8C5C8';
  if (lower.includes('jaune')) return '#F6E58D';
  return '#A1A1AA';
};

// ============================================================
// STOCK MATRIX UTILITIES
// ============================================================

export function generateDefaultStockMatrix(
  sizes: string[],
  colors: string[],
  defaultInStock = true
): StockVariant[] {
  const matrix: StockVariant[] = [];
  const effectiveColors = colors.length > 0 ? colors : ['Unique'];
  const effectiveSizes = sizes.length > 0 ? sizes : ['Taille Unique'];

  for (const color of effectiveColors) {
    for (const size of effectiveSizes) {
      matrix.push({
        size,
        color,
        inStock: defaultInStock,
      });
    }
  }
  return matrix;
}

export function isVariantInStock(product: Product, size: string, color?: string): boolean {
  if (product.stockStatus === 'total_out' || !product.inStock) return false;

  const targetColor = color || (product.colors && product.colors.length > 0 ? product.colors[0] : 'Unique');

  if (product.stockMatrix && product.stockMatrix.length > 0) {
    const variant = product.stockMatrix.find(
      (v) => v.size === size && (v.color === targetColor || v.color === 'Unique' || !color)
    );
    if (variant !== undefined) return variant.inStock;
  }

  // Fallback to separate sizes and colors
  if (product.stockStatus === 'partial_out') {
    const sizeOk = !product.availableSizes || product.availableSizes.includes(size);
    const colorOk = !color || !product.availableColors || product.availableColors.includes(color);
    return sizeOk && colorOk;
  }

  return true;
}

export function getAvailableSizesForColor(product: Product, color?: string): string[] {
  if (product.stockStatus === 'total_out' || !product.inStock) return [];
  if (!product.sizes || product.sizes.length === 0) return [];

  return product.sizes.filter((size) => isVariantInStock(product, size, color));
}

export function getAvailableColorsForSize(product: Product, size?: string): string[] {
  if (product.stockStatus === 'total_out' || !product.inStock) return [];
  if (!product.colors || product.colors.length === 0) return [];

  if (!size) {
    return product.availableColors && product.availableColors.length > 0
      ? product.availableColors
      : product.colors;
  }

  return product.colors.filter((color) => isVariantInStock(product, size, color));
}

export function computeStockStatusFromMatrix(matrix: StockVariant[]): StockStatus {
  if (!matrix || matrix.length === 0) return 'in_stock';
  const availableCount = matrix.filter((v) => v.inStock).length;
  if (availableCount === 0) return 'total_out';
  if (availableCount === matrix.length) return 'in_stock';
  return 'partial_out';
}

export const defaultCategories: Category[] = [];

export const products: Product[] = [];

export const categories = ['Toutes'];

export const formatPrice = (price: any): string => {
  const num = Number(price);
  if (isNaN(num) || price === null || price === undefined) {
    return '0,00 د.ج';
  }
  return num.toLocaleString('de-DE') + ',00 د.ج';
};

export const getBestSellers = (): Product[] => [];

export const getNewArrivals = (): Product[] => [];

export const getProductBySlug = (_slug: string): Product | undefined => undefined;

