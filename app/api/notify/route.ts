import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { order, topic: customTopic, origin } = data;

    if (!order) {
      return NextResponse.json({ error: 'No order data provided' }, { status: 400 });
    }

    const topic = (customTopic || process.env.NEXT_PUBLIC_NTFY_TOPIC || process.env.NTFY_TOPIC || 'velime_orders_dz').trim();
    const hostOrigin = origin || process.env.NEXT_PUBLIC_SITE_URL || '';
    const directLink = hostOrigin ? `${hostOrigin}/admin?tab=orders` : 'https://velime.com/admin?tab=orders';

    const clientName = order.customerName || order.clientName || 'Client';
    const phone = order.customerPhone || order.phone || '';
    const wilaya = order.wilayaName || order.wilaya || '';
    const commune = order.commune || '';
    const deliveryType = order.deliveryType === 'domicile' ? '🏠 À Domicile' : '🏢 Au Bureau / Stop Desk';
    const totalAmount = Number(order.totalAmount ?? order.totalPrice ?? 0);
    const orderNumber = order.orderNumber || order.id || 'N/A';

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
      priority: 4, // High / Urgent priority (loud alert sound even on lock screen)
      tags: ['shopping_bags', 'bell', 'moneybag'],
      click: directLink,
      actions,
    };

    const res = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ntfyPayload),
    });

    const resJson = await res.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      topic,
      ntfy: resJson,
    });
  } catch (error: any) {
    console.error('API Notify Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
