import { productImagePath } from './productImages.js';

export function withProductImageFallback(order) {
  if (!order) return order;
  return {
    ...order,
    items: (order.items || []).map(item => {
      const product = item.product && typeof item.product === 'object' ? item.product : null;
      const imageUrl = item.imageUrl || item.image || (product ? productImagePath(product) : '') || '';
      return {
        ...item,
        imageUrl,
        image: item.image || imageUrl,
        category: item.category || product?.category || '',
        product: product?._id || item.product
      };
    })
  };
}

export async function findOrdersWithProductImages(query) {
  const orders = await query.populate('items.product', 'imageUrl image category').lean();
  return orders.map(withProductImageFallback);
}
