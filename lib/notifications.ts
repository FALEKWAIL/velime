import { Order } from '@/types';

export interface ClientNotificationOrder {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  clientName?: string;
  customerPhone?: string;
  phone?: string;
  wilayaName?: string;
  wilaya?: string;
  commune?: string;
  deliveryType?: 'domicile' | 'bureau' | string;
  notes?: string;
  items?: any[];
  totalAmount?: number;
  totalPrice?: number;
}

export const DEFAULT_NTFY_TOPIC = 'velime_orders_dz';

export async function sendOrderNotification(
  order: Order | ClientNotificationOrder,
  customOrigin?: string
) {
  try {
    const origin = customOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    const topic = (
      process.env.NEXT_PUBLIC_NTFY_TOPIC ||
      DEFAULT_NTFY_TOPIC
    ).trim();

    const hostOrigin = origin || process.env.NEXT_PUBLIC_SITE_URL || '';
    const directLink = hostOrigin ? `${hostOrigin}/admin?tab=orders` : 'https://velime.com/admin?tab=orders';

    const clientName = (order as any).customerName || (order as any).clientName || 'Client';
    const phone = (order as any).customerPhone || (order as any).phone || '';
    const wilaya = (order as any).wilayaName || (order as any).wilaya || '';
    const commune = order.commune || '';
    const deliveryType = order.deliveryType === 'domicile' ? '🏠 À Domicile' : '🏢 Au Bureau / Stop Desk';
    const totalAmount = Number((order as any).totalAmount ?? (order as any).totalPrice ?? 0);
    const orderNumber = (order as any).orderNumber || order.id || 'N/A';

    const itemsSummary = (order.items || [])
      .map((item: any) => {
        const name = item.productName || item.name || item.title || 'Article';
        const details = [
          item.size ? `Taille: ${item.size}` : '',
          item.color ? `Couleur: ${item.color}` : '',
        ].filter(Boolean).join(', ');
        const detailsStr = details ? ` (${details})` : '';
        const priceStr = item.price ? ` - ${(Number(item.price) * (item.quantity || 1)).toLocaleString()} DA` : '';
        return `• ${item.quantity || 1}x ${name}${detailsStr}${priceStr}`;
      })
      .join('\n');

    const messageLines = [
      `👤 Client: ${clientName}`,
      `📞 Tél: ${phone}`,
      `📍 Wilaya: ${wilaya}${commune ? ` (${commune})` : ''}`,
      `🚚 Livraison: ${deliveryType}`,
      order.notes ? `📝 Note: ${order.notes}` : '',
      `💰 Total: ${totalAmount.toLocaleString()} DA`,
      itemsSummary ? `\n🛒 Articles:\n${itemsSummary}` : '',
    ].filter(Boolean);

    const message = messageLines.join('\n');
    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');

    const actions: any[] = [
      {
        action: 'view',
        label: '📱 Ouvrir Dashboard',
        url: directLink,
        clear: true,
      },
    ];

    if (cleanPhone) {
      actions.push({
        action: 'view',
        label: '📞 Appeler le client',
        url: `tel:${cleanPhone}`,
      });
    }

    const ntfyPayload = {
      topic,
      title: `🛍 Nouvelle commande #${orderNumber} - ${clientName} (${totalAmount.toLocaleString()} DA)`,
      message,
      priority: 4, // High / Urgent priority ringtone
      tags: ['shopping_bags', 'bell', 'moneybag'],
      click: directLink,
      actions,
    };

    const promises: Promise<any>[] = [];

    // 1. Server API Route (Primary & most reliable against client CORS/adblockers)
    if (typeof window !== 'undefined') {
      const apiRoutePromise = fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, topic, origin }),
      }).catch((err) => {
        console.warn('Server notify error:', err);
      });
      promises.push(apiRoutePromise);
    }

    // 2. Direct client-side fetch (Immediate fallback redundancy)
    const clientPromise = fetch('https://ntfy.sh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ntfyPayload),
    }).catch((err) => {
      console.warn('Direct ntfy error:', err);
    });
    promises.push(clientPromise);

    await Promise.allSettled(promises);
  } catch (err) {
    console.warn('sendOrderNotification caught error:', err);
  }
}
