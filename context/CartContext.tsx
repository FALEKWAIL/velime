'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, CartContextType, Product } from '@/types';

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; size: string; color?: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string; size: string; color?: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; size: string; color?: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; items: CartItem[] };

const matchesItem = (item: CartItem, productId: string, size: string, color?: string) => {
  const sameId = item.product.id === productId;
  const sameSize = item.size === size;
  const sameColor = (item.color || '') === (color || '');
  return sameId && sameSize && sameColor;
};

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.findIndex(
        (item) => matchesItem(item, action.product.id, action.size, action.color)
      );
      if (existingIndex >= 0) {
        const updated = [...state];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + action.quantity,
        };
        return updated;
      }
      return [
        ...state,
        {
          product: action.product,
          size: action.size,
          color: action.color,
          quantity: action.quantity,
        },
      ];
    }
    case 'REMOVE_ITEM':
      return state.filter(
        (item) => !matchesItem(item, action.productId, action.size, action.color)
      );
    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return state.filter(
          (item) => !matchesItem(item, action.productId, action.size, action.color)
        );
      }
      return state.map((item) =>
        matchesItem(item, action.productId, action.size, action.color)
          ? { ...item, quantity: action.quantity }
          : item
      );
    }
    case 'CLEAR_CART':
      return [];
    case 'LOAD_CART':
      return action.items;
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const isLoadedRef = React.useRef(false);

  // 1. Initial load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('velime-cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: 'LOAD_CART', items: parsed });
        }
      }
    } catch (err) {
      console.warn('Error reading cart from localStorage:', err);
    } finally {
      isLoadedRef.current = true;
    }
  }, []);

  // 2. Persist to LocalStorage ONLY after initial load
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem('velime-cart', JSON.stringify(items));
    } catch (err) {
      console.warn('Error saving cart to localStorage:', err);
    }
  }, [items]);

  // 3. Multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'velime-cart' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            dispatch({ type: 'LOAD_CART', items: parsed });
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addItem = (product: Product, size: string, color?: string, quantity = 1) =>
    dispatch({ type: 'ADD_ITEM', product, size, color, quantity });

  const removeItem = (productId: string, size: string, color?: string) =>
    dispatch({ type: 'REMOVE_ITEM', productId, size, color });

  const updateQuantity = (productId: string, size: string, color: string | undefined, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', productId, size, color, quantity });

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
