export type StockStatus = 'in_stock' | 'partial_out' | 'total_out';

export interface StockVariant {
  size: string;
  color: string;
  inStock: boolean;
  quantity?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  description: string;
  sizes: string[];
  availableSizes?: string[]; // If partial_out, which sizes remain available
  colors?: string[]; // Color variants (e.g., ['Noir', 'Beige', 'Sauge'])
  availableColors?: string[]; // If partial_out, which colors remain available
  stockMatrix?: StockVariant[]; // Precise cross-matrix: (size × color) availability
  inStock: boolean; // Computed or helper: true if in_stock or partial_out
  stockStatus: StockStatus; // 'in_stock' | 'partial_out' | 'total_out'
  badge?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color?: string;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string, color?: string, quantity?: number) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, color: string | undefined, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export type OrderStatus = 'en_attente' | 'confirmee' | 'en_livraison' | 'livree' | 'annulee';
export type DeliveryType = 'domicile' | 'bureau';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  size: string;
  color?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  wilayaCode: string;
  wilayaName: string;
  commune: string;
  deliveryType: DeliveryType;
  items: OrderItem[];
  itemsSubtotal: number;
  deliveryCost: number;
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
}
