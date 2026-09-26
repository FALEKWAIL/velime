'use client';
import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '@/types';
import {
  getLocalOrders,
  createOrder as createOrderLib,
  updateOrderStatus as updateOrderStatusLib,
  deleteOrder as deleteOrderLib,
} from '@/lib/orders';
import { supabase } from '@/lib/supabase';

export function useOrders(options: { autoSync?: boolean } = {}) {
  const { autoSync = false } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(() => {
    const local = getLocalOrders();
    setOrders(local);
    setIsLoading(false);
  }, []);

  const syncSupabaseOrders = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted: Order[] = data.map((d: any) => ({
          id: d.id,
          orderNumber: d.order_number || d.id,
          createdAt: d.created_at,
          customerName: d.customer_name,
          customerPhone: d.customer_phone,
          wilayaCode: d.wilaya_code,
          wilayaName: d.wilaya_name,
          commune: d.commune,
          deliveryType: d.delivery_type,
          items: d.items || [],
          itemsSubtotal: Number(d.items_subtotal) || 0,
          deliveryCost: Number(d.delivery_cost) || 0,
          totalAmount: Number(d.total_amount) || 0,
          status: d.status || 'en_attente',
          notes: d.notes || '',
        }));

        setOrders(formatted);
        try {
          localStorage.setItem('velime-orders-data', JSON.stringify(formatted));
        } catch {}
      }
    } catch (err) {
      console.warn('Orders fetch note:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    // Only admin dashboard queries all customer orders from Supabase.
    // Regular visitors and checkout forms only create orders, saving thousands of queries.
    if (autoSync) {
      syncSupabaseOrders();
    }

    const handleUpdate = () => {
      loadOrders();
    };

    window.addEventListener('velime-orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('velime-orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadOrders, syncSupabaseOrders, autoSync]);

  const placeOrder = async (orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => {
    const created = await createOrderLib(orderPayload);
    loadOrders();
    return created;
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatusLib(orderId, status);
    loadOrders();
  };

  const removeOrder = async (orderId: string) => {
    await deleteOrderLib(orderId);
    loadOrders();
  };

  return {
    orders,
    isLoading,
    placeOrder,
    updateStatus,
    removeOrder,
    refreshOrders: loadOrders,
  };
}
