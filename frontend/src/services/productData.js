export const PRODUCT_LIST_ERROR = 'The API returned product data in an unexpected format. Check that VITE_API_URL points to the backend /api endpoint.';

export function getProductArray(payload) {
  // Support the API's current { products: [] } contract, older array
  // responses, and Axios-style/nested wrappers used by alternate deployments.
  const products = Array.isArray(payload) ? payload
    : Array.isArray(payload?.products) ? payload.products
      : Array.isArray(payload?.data?.products) ? payload.data.products
        : Array.isArray(payload?.data) ? payload.data
          : Array.isArray(payload?.result?.products) ? payload.result.products
            : null;

  if (!products) {
    throw new Error(PRODUCT_LIST_ERROR);
  }

  return products.filter(product => product && typeof product === 'object' && !Array.isArray(product))
    .map(product => {
      const id = product._id ?? product.id;
      return id == null ? null : { ...product, _id: String(id) };
    })
    .filter(Boolean);
}

export function getProduct(payload) {
  const product = payload?.product;
  if (!product || typeof product !== 'object' || Array.isArray(product) || typeof product._id !== 'string') {
    throw new Error('This product could not be loaded. Please try again.');
  }
  return product;
}
