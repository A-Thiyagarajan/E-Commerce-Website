import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, LayoutGrid, ListFilter, ChevronRight } from 'lucide-react';
import api, { errorText } from '../services/api';
import { getProductArray, PRODUCT_LIST_ERROR } from '../services/productData';
import ProductCard from '../components/ProductCard';

const categories = ['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Books', 'Toys & Games', 'Grocery', 'Accessories', 'Sports', 'Automotive', 'Baby & Kids'];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = params.get('search') || '';
  const category = params.get('category') || 'All';
  const sort = params.get('sort') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api.get('/products', {
      params: { search, category, sort, page, limit: 24 },
      signal: controller.signal
    }).then(({ data }) => {
      const inventory = getProductArray(data);
      setProducts(inventory);
      setTotal(Number.isFinite(Number(data.total)) ? Number(data.total) : inventory.length);
      setPages(Math.max(1, Number(data.pages) || 1));
    }).catch(requestError => {
      if (controller.signal.aborted) return;
      setProducts([]);
      setTotal(0);
      setPages(1);
      setError(requestError.message === PRODUCT_LIST_ERROR
        ? requestError.message
        : errorText(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [search, category, sort, page]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value && value !== 'All' ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return <main className="shell marketplace-listing">
    <div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={13}/><span>{category === 'All' ? 'All products' : category}</span></div>
    <div className="market-listing-title"><div>
      <span className="market-kicker">THE SHOPSTACK MARKETPLACE</span>
      <h1>{search ? <>Results for <em>“{search}”</em></> : category === 'All' ? <>Shop all <em>products</em></> : <>Explore <em>{category}</em></>}</h1>
      <p>Great discoveries for your home, wardrobe and everyday life.</p>
    </div><span className="result-count">{loading ? 'Loading products…' : `${total} products`}</span></div>

    <div className="listing-toolbar"><div className="listing-filter-label"><SlidersHorizontal size={17}/> Filter by</div>
      <div className="listing-category-chips">{categories.map(item => <button key={item} onClick={() => update('category', item)} className={category === item ? 'active' : ''}>{item}</button>)}</div>
      <label className="sort-control"><ListFilter size={16}/><select value={sort} onChange={event => update('sort', event.target.value)} aria-label="Sort products">
        <option value="">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="newest">Newest first</option>
      </select></label>
    </div>

    {loading ? <div className="loading-page" role="status">Loading products…</div>
      : error ? <div className="notice error" role="alert">{error}</div>
      : products.length ? <>
        <div className="listing-results"><span>{total} results {search && <>for <b>“{search}”</b></>}</span><span><LayoutGrid size={15}/> Page {page} of {pages}</span></div>
        <div className="product-grid market-grid">{products.map(product => <ProductCard key={product._id} product={product}/>)}</div>
        {pages > 1 && <div className="market-pagination"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))}>← Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => update('page', String(page + 1))}>Next →</button></div>}
      </> : <div className="empty-state"><h2>No products found</h2><p>Try a different search or choose another category.</p><button className="button" onClick={() => setParams({})}>Browse everything</button></div>}
  </main>;
}
