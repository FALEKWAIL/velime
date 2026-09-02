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

export const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Robes', slug: 'robes', description: 'Robes fluides, satinées et élégantes', image: '/images/p1.jpg' },
  { id: 'cat-2', name: 'Chemises', slug: 'chemises', description: 'Chemises et blouses chic', image: '/images/p3.jpg' },
  { id: 'cat-3', name: 'Ensembles', slug: 'ensembles', description: 'Ensembles deux pièces sophistiqués', image: '/images/p4.jpg' },
  { id: 'cat-4', name: 'Combinaisons', slug: 'combinaisons', description: 'Combinaisons modernes et raffinées', image: '/images/p7.jpg' },
  { id: 'cat-5', name: 'Manteaux', slug: 'manteaux', description: 'Manteaux chauds et vestes structurées', image: '/images/p5.jpg' },
];

export const products: Product[] = [
  {
    id: '1',
    slug: 'robe-noire-satin',
    name: 'Robe Noire Satin',
    price: 7800,
    image: '/images/p1.jpg',
    images: ['/images/p1.jpg', '/images/p4.jpg', '/images/hero-fabric.jpg'],
    category: 'Robes',
    description: 'Une robe en satin noir élégante et intemporelle, parfaite pour toutes les occasions. Coupe midi avec manches longues et décolleté en V.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Noir', 'Bordeaux', 'Beige'],
    availableColors: ['Noir', 'Bordeaux', 'Beige'],
    stockMatrix: generateDefaultStockMatrix(['XS', 'S', 'M', 'L', 'XL'], ['Noir', 'Bordeaux', 'Beige'], true),
    inStock: true,
    stockStatus: 'in_stock',
    isBestSeller: true,
  },
  {
    id: '2',
    slug: 'robe-florale-jaune',
    name: 'Robe Florale Jaune',
    price: 6500,
    image: '/images/p2.jpg',
    images: ['/images/p2.jpg', '/images/p6.jpg', '/images/hero.jpg'],
    category: 'Robes',
    description: 'Magnifique robe maxi à fleurs jaunes avec des manches bouffantes. Légère et féminine, idéale pour les journées estivales.',
    sizes: ['XS', 'S', 'M', 'L'],
    availableSizes: ['S', 'M'],
    colors: ['Jaune Pastel', 'Blanc', 'Rose Poudré'],
    availableColors: ['Jaune Pastel', 'Blanc'],
    // Sample matrix: Jaune Pastel has S and M, Blanc has S, Rose Poudré is fully out
    stockMatrix: [
      { size: 'XS', color: 'Jaune Pastel', inStock: false },
      { size: 'S', color: 'Jaune Pastel', inStock: true },
      { size: 'M', color: 'Jaune Pastel', inStock: true },
      { size: 'L', color: 'Jaune Pastel', inStock: false },
      { size: 'XS', color: 'Blanc', inStock: false },
      { size: 'S', color: 'Blanc', inStock: true },
      { size: 'M', color: 'Blanc', inStock: false },
      { size: 'L', color: 'Blanc', inStock: false },
      { size: 'XS', color: 'Rose Poudré', inStock: false },
      { size: 'S', color: 'Rose Poudré', inStock: false },
      { size: 'M', color: 'Rose Poudré', inStock: false },
      { size: 'L', color: 'Rose Poudré', inStock: false },
    ],
    inStock: true,
    stockStatus: 'partial_out',
    badge: 'Stock Limité',
    isNew: true,
  },
  {
    id: '3',
    slug: 'chemise-imprimee-loov',
    name: 'Chemise Imprimée Loov',
    price: 4800,
    image: '/images/p3.jpg',
    images: ['/images/p3.jpg', '/images/p5.jpg'],
    category: 'Chemises',
    description: 'Chemise bohème aux tons chauds avec des imprimés abstraits. Ample et confortable, parfaite pour un look décontracté chic.',
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: [],
    colors: ['Camel', 'Ivoire'],
    availableColors: [],
    stockMatrix: generateDefaultStockMatrix(['S', 'M', 'L', 'XL'], ['Camel', 'Ivoire'], false),
    inStock: false,
    stockStatus: 'total_out',
    badge: 'Rupture de Stock',
    isBestSeller: true,
  },
  {
    id: '4',
    slug: 'ensemble-dalida',
    name: 'Ensemble Dalida',
    price: 8200,
    image: '/images/p4.jpg',
    images: ['/images/p4.jpg', '/images/p1.jpg', '/images/p6.jpg'],
    category: 'Ensembles',
    description: 'Ensemble deux pièces en lin ivoire — haut relaxé et pantalon large. Un look épuré et sophistiqué pour toutes les saisons.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    availableSizes: [],
    colors: ['Ivoire', 'Noir'],
    availableColors: [],
    stockMatrix: generateDefaultStockMatrix(['XS', 'S', 'M', 'L', 'XL'], ['Ivoire', 'Noir'], false),
    inStock: false,
    stockStatus: 'total_out',
    badge: 'Rupture de Stock',
    isBestSeller: true,
  },
  {
    id: '5',
    slug: 'manteau-mocha',
    name: 'Manteau Mocha',
    price: 14500,
    image: '/images/p5.jpg',
    images: ['/images/p5.jpg', '/images/p3.jpg', '/images/p7.jpg'],
    category: 'Manteaux',
    description: 'Long manteau en laine mocha — coupe droite classique et raffinée. Un investissement mode pour votre garde-robe hivernale.',
    sizes: ['XS', 'S', 'M', 'L'],
    availableSizes: ['XS', 'S', 'M', 'L'],
    colors: ['Mocha', 'Noir', 'Camel'],
    availableColors: ['Mocha', 'Noir', 'Camel'],
    stockMatrix: generateDefaultStockMatrix(['XS', 'S', 'M', 'L'], ['Mocha', 'Noir', 'Camel'], true),
    inStock: true,
    stockStatus: 'in_stock',
    isNew: true,
  },
  {
    id: '6',
    slug: 'ensemble-lin-beige',
    name: 'Ensemble Lin Beige',
    price: 9800,
    image: '/images/p6.jpg',
    images: ['/images/p6.jpg', '/images/p4.jpg', '/images/p2.jpg'],
    category: 'Ensembles',
    description: 'Ensemble blazer et pantalon en lin beige naturel. Style parisien par excellence, alliant confort et élégance.',
    sizes: ['S', 'M', 'L', 'XL'],
    availableSizes: ['M', 'L'],
    colors: ['Beige', 'Blanc', 'Sauge'],
    availableColors: ['Beige', 'Sauge'],
    stockMatrix: [
      { size: 'S', color: 'Beige', inStock: false },
      { size: 'M', color: 'Beige', inStock: true },
      { size: 'L', color: 'Beige', inStock: true },
      { size: 'XL', color: 'Beige', inStock: false },
      { size: 'S', color: 'Blanc', inStock: false },
      { size: 'M', color: 'Blanc', inStock: false },
      { size: 'L', color: 'Blanc', inStock: false },
      { size: 'XL', color: 'Blanc', inStock: false },
      { size: 'S', color: 'Sauge', inStock: true },
      { size: 'M', color: 'Sauge', inStock: true },
      { size: 'L', color: 'Sauge', inStock: false },
      { size: 'XL', color: 'Sauge', inStock: false },
    ],
    inStock: true,
    stockStatus: 'partial_out',
    badge: 'Stock Limité',
    isBestSeller: true,
  },
  {
    id: '7',
    slug: 'combinaison-sauge',
    name: 'Combinaison Sauge',
    price: 7200,
    image: '/images/p7.jpg',
    images: ['/images/p7.jpg', '/images/p1.jpg'],
    category: 'Combinaisons',
    description: 'Combinaison large en sauge doux avec ceinture assortie. Chic et polyvalente, pour un look tout-en-un impeccable.',
    sizes: ['XS', 'S', 'M', 'L'],
    availableSizes: ['XS', 'S', 'M', 'L'],
    colors: ['Sauge', 'Noir', 'Terracotta'],
    availableColors: ['Sauge', 'Noir', 'Terracotta'],
    stockMatrix: generateDefaultStockMatrix(['XS', 'S', 'M', 'L'], ['Sauge', 'Noir', 'Terracotta'], true),
    inStock: true,
    stockStatus: 'in_stock',
    isNew: true,
  },
  {
    id: '8',
    slug: 'blouse-soie-sauge',
    name: 'Blouse Soie Sauge',
    price: 5500,
    originalPrice: 6800,
    image: '/images/hero.jpg',
    images: ['/images/hero.jpg', '/images/hero-fabric.jpg', '/images/p3.jpg'],
    category: 'Chemises',
    description: 'Blouse en soie sauge à col drapé — légère et luxueuse. La pièce parfaite pour sublimer votre quotidien.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Sauge', 'Ivoire', 'Rose Poudré'],
    availableColors: ['Sauge', 'Ivoire', 'Rose Poudré'],
    stockMatrix: generateDefaultStockMatrix(['XS', 'S', 'M', 'L', 'XL'], ['Sauge', 'Ivoire', 'Rose Poudré'], true),
    inStock: true,
    stockStatus: 'in_stock',
    isBestSeller: true,
  },
];

export const categories = ['Toutes', ...defaultCategories.map(c => c.name)];

export const formatPrice = (price: any): string => {
  const num = Number(price);
  if (isNaN(num) || price === null || price === undefined) {
    return '0,00 د.ج';
  }
  return num.toLocaleString('de-DE') + ',00 د.ج';
};

export const getBestSellers = (): Product[] =>
  products.filter((p) => p.isBestSeller);

export const getNewArrivals = (): Product[] =>
  products.filter((p) => p.isNew);

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);
