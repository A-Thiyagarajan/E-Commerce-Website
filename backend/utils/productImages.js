import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../../frontend/src/services/productImageManifest.json', import.meta.url), 'utf8'));

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

export function productImagePath(product = {}) {
  const explicit = String(product.imageUrl || product.image || '');
  if (explicit.startsWith('/api/images/')) return explicit;
  const name = String(product.name || '').split('\t')[0].trim();
  const key = normalize(name);
  if (key) {
    const findFile = files => files?.[key] || files?.[key.replace(/headphones$/, '')] || files?.[key.replace(/speaker$/, '')];
    const category = product.category || '';
    let matchedCategory = categoryFolders[category] ? category : '';
    let filename = matchedCategory ? findFile(manifest[matchedCategory]) : '';
    if (!filename) {
      const match = Object.entries(manifest).find(([, files]) => findFile(files));
      if (match) [matchedCategory, filename] = match;
    }
    if (filename && categoryFolders[matchedCategory]) {
      const folder = categoryFolders[matchedCategory].split('/').map(encodeURIComponent).join('/');
      return `/product-images/${folder}/${encodeURIComponent(filename)}`;
    }
  }
  return explicit;
}
