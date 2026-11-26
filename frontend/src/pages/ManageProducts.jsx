import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
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
      if (editing) await api.put(`/products/${editing}`, form);
      else await api.post('/products', form);
      setForm(blank);
      setEditing('');
      setOk('Product saved.');
      await load();
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const edit = product => {
    if (!product || typeof product !== 'object') return;
    setEditing(product._id);
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
    <form className="admin-form" onSubmit={submit}><h2>{editing ? 'Edit product' : 'Add something good'}</h2>
      {editing && <button className="icon-button close-edit" type="button" onClick={() => { setEditing(''); setForm(blank); }}><X/></button>}
      <div className="form-row"><label>Name<input required maxLength="160" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
      <label>Description<textarea required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
      <label>Image URL<input required type="text" placeholder="/product-images/category/file.jpg" value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })}/></label>
      <div className="form-row"><label>Price<input type="number" min="0" step="0.01" required value={form.price} onChange={event => setForm({ ...form, price: event.target.value })}/></label><label>Stock<input type="number" min="0" step="1" required value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })}/></label><label>Rating<input type="number" min="0" max="5" step="0.1" required value={form.rating} onChange={event => setForm({ ...form, rating: event.target.value })}/></label></div>
      <label className="checkbox-label"><input type="checkbox" checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })}/> Feature on homepage</label>
      <button className="button"><Plus size={17}/>{editing ? 'Save changes' : 'Add product'}</button>
    </form>
    {loading ? <div className="loading-page" role="status">Loading products…</div>
      : products.length ? <div className="manage-list">{products.map(product => <div className="manage-product" key={product._id}><ProductImage src={product.imageUrl} product={product} alt={product.name || 'Product'}/><div><b>{product.name || 'Product'}</b><span>{product.category || 'Uncategorized'} · ₹{(Number(product.price) || 0).toFixed(2)} · {Number(product.stock) || 0} in stock</span></div><button className="icon-button" onClick={() => edit(product)} aria-label={`Edit ${product.name || 'product'}`}><Edit2 size={17}/></button><button className="icon-button" onClick={() => remove(product)} aria-label={`Delete ${product.name || 'product'}`}><Trash2 size={17}/></button></div>)}</div>
      : !error && <div className="empty-state"><h2>No products found</h2><p>Add a product using the form above.</p></div>}
  </main>;
}
