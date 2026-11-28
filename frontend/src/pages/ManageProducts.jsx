import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, X, Eye, PackagePlus, ImagePlus, CheckCircle2 } from 'lucide-react';
import api, { errorText } from '../services/api';
import { getProductArray, PRODUCT_LIST_ERROR } from '../services/productData';
import ProductImage from '../components/ProductImage';

const blank = { name: '', description: '', price: '', category: 'Electronics', imageUrl: '', stock: '', rating: '4.5', featured: false };
const categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Accessories', 'Sports', 'Beauty', 'Books', 'Toys & Games', 'Grocery', 'Automotive', 'Baby & Kids'];

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('view');

  const uploadImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      event.target.value = '';
      return;
    }
    setUploading(true); setError('');
    try {
      const image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this image.')); reader.readAsDataURL(file); });
      const { data } = await api.post('/products/upload-image', { image });
      setForm(current => ({ ...current, imageUrl: data.imageUrl }));
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setUploading(false); event.target.value = ''; }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', { params: { limit: 2000 } });
      setProducts(getProductArray(data));
    } catch (requestError) {
      setProducts([]);
      setError(requestError.message === PRODUCT_LIST_ERROR
        ? requestError.message
        : errorText(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setOk('');
    try {
      if (uploading) return;
      if (editing) await api.put(`/products/${editing}`, form);
      else await api.post('/products', form);
      setForm(blank);
      setEditing('');
      setOk('Product saved.');
      setActiveSection('view');
      await load();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const edit = product => {
    if (!product || typeof product !== 'object') return;
    setEditing(product._id);
    setActiveSection('add');
    setForm({ name: product.name || '', description: product.description || '', price: product.price ?? '', category: product.category || 'Electronics', imageUrl: product.imageUrl || product.image || '', stock: product.stock ?? '', rating: product.rating ?? '4.5', featured: Boolean(product.featured) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async product => {
    if (!product?._id || !window.confirm(`Delete ${product.name || 'this product'}?`)) return;
    setError('');
    try {
      await api.delete(`/products/${product._id}`);
      await load();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  return <main className="shell page-main">
    <div className="breadcrumbs"><Link to="/admin">Admin</Link> / Products</div>
    <div className="listing-title"><div><span className="eyebrow">KEEP THE SHELVES FRESH</span><h1>Product <em>shelf.</em></h1></div></div>
    {error && <div className="notice error" role="alert">{error}</div>}{ok && <div className="notice success" role="status">{ok}</div>}
    <nav className="product-admin-cards" aria-label="Product management sections">
      <button type="button" className={`product-admin-card ${activeSection === 'add' ? 'active' : ''}`} aria-pressed={activeSection === 'add'} onClick={() => { setActiveSection('add'); setOk(''); }}><span className="product-admin-card-icon"><PackagePlus size={21}/></span><span><b>{editing ? 'Edit product' : 'Add product'}</b><small>{editing ? 'Update product details and image' : 'Create a product for all storefronts'}</small></span><Plus size={18}/></button>
      <button type="button" className={`product-admin-card ${activeSection === 'view' ? 'active' : ''}`} aria-pressed={activeSection === 'view'} onClick={() => { setActiveSection('view'); setOk(''); }}><span className="product-admin-card-icon"><Eye size={21}/></span><span><b>View products</b><small>{products.length} {products.length === 1 ? 'product' : 'products'} · edit or remove</small></span><Eye size={18}/></button>
    </nav>
    {activeSection === 'add' && <form className="admin-form" onSubmit={submit}><header className="admin-product-form-heading"><span className="eyebrow">{editing ? 'UPDATE THE CATALOG' : 'NEW TO THE SHELF'}</span><h2>{editing ? 'Edit product' : 'Add something good'}</h2><p>{editing ? 'Refresh the details and image shown across your storefronts.' : 'Add a product once and it will appear across your storefronts.'}</p></header>
      {editing && <button className="icon-button close-edit" type="button" onClick={() => { setEditing(''); setForm(blank); setActiveSection('view'); }}><X/></button>}
      <div className="form-row"><label>Name<input required maxLength="160" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
      <label>Description<textarea required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
      <div className="admin-product-image-field"><span className="admin-product-field-label">Product image</span><label className="admin-image-upload"><ImagePlus size={24}/><b>{uploading ? 'Uploading image…' : form.imageUrl ? 'Choose a different image' : 'Upload a product image'}</b><small>JPG, PNG, or WebP · up to 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" required={!form.imageUrl} disabled={uploading} onChange={uploadImage}/></label>{form.imageUrl && <div className="admin-product-preview"><ProductImage src={form.imageUrl} product={form} alt="Product preview"/><span><CheckCircle2 size={15}/> Image ready</span></div>}</div>
      <div className="form-row"><label>Price<input type="number" min="0" step="0.01" required value={form.price} onChange={event => setForm({ ...form, price: event.target.value })}/></label><label>Stock<input type="number" min="0" step="1" required value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })}/></label><label>Rating<input type="number" min="0" max="5" step="0.1" required value={form.rating} onChange={event => setForm({ ...form, rating: event.target.value })}/></label></div>
      <label className="checkbox-label"><input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })}/> Feature on homepage</label>
      <button className="button" disabled={uploading}><Plus size={17}/>{uploading ? 'Uploading image…' : editing ? 'Save changes' : 'Add product'}</button>
    </form>}
    {activeSection === 'view' && (loading ? <div className="loading-page" role="status">Loading products…</div>
      : products.length ? <div className="manage-list">{products.map(product => <div className="manage-product" key={product._id}><ProductImage src={product.imageUrl} product={product} alt={product.name || 'Product'}/><div><b>{product.name || 'Product'}</b><span>{product.category || 'Uncategorized'} · ₹{(Number(product.price) || 0).toFixed(2)} · {Number(product.stock) || 0} in stock</span></div><button className="icon-button" onClick={() => edit(product)} aria-label={`Edit ${product.name || 'product'}`}><Edit2 size={17}/></button><button className="icon-button" onClick={() => remove(product)} aria-label={`Delete ${product.name || 'product'}`}><Trash2 size={17}/></button></div>)}</div>
      : !error && <div className="empty-state"><h2>No products found</h2><p>Add a product using the Add product card.</p><button type="button" className="button" onClick={() => setActiveSection('add')}><Plus size={17}/> Add product</button></div>)}
  </main>;
}
