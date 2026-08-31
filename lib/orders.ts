import { Order, OrderStatus } from '@/types';
import { supabase } from '@/lib/supabase';

export const ORDERS_STORAGE_KEY = 'velime-orders-data';

export const defaultOrders: Order[] = [];

export function getLocalOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading local orders:', err);
    return [];
  }
}

export function saveLocalOrders(orders: Order[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new Event('velime-orders-updated'));
  } catch (err) {
    console.error('Error saving local orders:', err);
  }
}

export async function createOrder(orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>): Promise<Order> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newOrder: Order = {
    ...orderPayload,
    id: `ord-${Date.now()}-${randomSuffix}`,
    orderNumber: `CMD-${randomSuffix}`,
    createdAt: new Date().toISOString(),
    status: 'en_attente',
  };

  // 1. Save locally in localStorage
  const current = getLocalOrders();
  const updated = [newOrder, ...current];
  saveLocalOrders(updated);

  // 2. Try async sync to Supabase (non-blocking)
  if (supabase) {
    try {
      await supabase
        .from('orders')
        .insert([{
          id: newOrder.id,
          order_number: newOrder.orderNumber,
          customer_name: newOrder.customerName,
          customer_phone: newOrder.customerPhone,
          wilaya_code: newOrder.wilayaCode,
          wilaya_name: newOrder.wilayaName,
          commune: newOrder.commune,
          delivery_type: newOrder.deliveryType,
          items: newOrder.items,
          items_subtotal: newOrder.itemsSubtotal,
          delivery_cost: newOrder.deliveryCost,
          total_amount: newOrder.totalAmount,
          status: newOrder.status,
          notes: newOrder.notes || '',
          created_at: newOrder.createdAt,
        }]);
    } catch (err) {
      console.warn('Supabase sync note:', err);
    }
  }

  return newOrder;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const current = getLocalOrders();
  const updated = current.map((o) => (o.id === orderId ? { ...o, status } : o));
  saveLocalOrders(updated);

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
    } catch (err) {
      console.warn('Supabase update note:', err);
    }
  }
}

export async function deleteOrder(orderId: string) {
  const current = getLocalOrders();
  const updated = current.filter((o) => o.id !== orderId);
  saveLocalOrders(updated);

  if (supabase) {
    try {
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
    } catch (err) {
      console.warn('Supabase delete note:', err);
    }
  }
}
