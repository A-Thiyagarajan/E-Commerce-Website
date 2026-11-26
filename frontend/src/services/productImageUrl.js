import manifest from './productImageManifest.json';
import api from './api';

const categoryFolders = {
  Electronics: 'shopstack_electronics_clean_images',
  Fashion: 'shopstack_fashion_images',
  'Home & Kitchen': 'shopstack_home_kitchen_images/home_kitchen',
  Beauty: 'shopstack_beauty_images/beauty',
  Books: '25_book_product_images',
  'Toys & Games': '25_toy_product_images',
  Grocery: '25_grocery_product_images',
  Accessories: 'fashion_product_images',
  Sports: 'sports_fitness_product_images',
  Automotive: 'car_bike_accessories_images',
  'Baby & Kids': 'baby_kids_product_images'
};
const normalize = value => String(value || '').split('\t')[0].trim().toLowerCase().replace(/inches/g, 'inch').replace(/[^a-z0-9]/g, '');

const backendOrigin = () => {
  const base = api.defaults.baseURL || 'http://localhost:5000/api';
  const appOrigin = globalThis.location?.origin || 'http://localhost:5173';
  return new URL(base, appOrigin).origin;
};

export function resolveProductImageSource(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^(?:https?:|data:|blob:|\/\/)/i.test(source)) return source;
  const path = source.replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^\/?(?:uploads?|storage|files|media)\//i.test(path)) {
    return new URL(`/${path.replace(/^\/+/, '')}`, backendOrigin()).href;
  }
  if (/^product-images\//i.test(path)) return `/${path}`;
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

export default function productImageUrl(product = {}) {
  const name = String(product.name || '').split('\t')[0].trim();
  if (!name) return '';
  const key = normalize(name);
  const findFile = files => files[key] || files[key.replace(/headphones$/, '')] || files[key.replace(/speaker$/, '')];
  const category = product.category || product.product?.category;
  let matchedCategory = category && categoryFolders[category] ? category : '';
  let filename = matchedCategory ? findFile(manifest[matchedCategory] || {}) : '';
  if (!filename) {
    const match = Object.entries(manifest).find(([, files]) => findFile(files));
    if (match) [matchedCategory, filename] = match;
  }
  if (!filename || !categoryFolders[matchedCategory]) return '';
  const matchedFolder = categoryFolders[matchedCategory];
  return `/product-images/${matchedFolder.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(filename)}`;
}
