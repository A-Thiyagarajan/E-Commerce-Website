import{useEffect,useState}from'react';
import{Link}from'react-router-dom';
import{ArrowRight,ChevronRight,Truck,ShieldCheck,RotateCcw,Tag}from'lucide-react';
import api,{errorText}from'../services/api';
import {getProductArray,PRODUCT_LIST_ERROR}from'../services/productData';
import ProductCard from'../components/ProductCard';
import ProductImage from'../components/ProductImage';

const categories=['Electronics','Fashion','Home & Kitchen','Beauty','Books','Toys & Games','Grocery','Sports','Accessories','Automotive','Baby & Kids'];
export default function Home(){
  const[catalog,setCatalog]=useState([]),[products,setProducts]=useState([]),[fresh,setFresh]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();api.get('/products',{params:{limit:2000},signal:controller.signal}).then(({data})=>{
    const inventory=getProductArray(data);
    setCatalog(inventory);
    setProducts(inventory.filter(product=>product.featured).slice(0,12));
    setFresh([...inventory].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8));
  }).catch(e=>{if(!controller.signal.aborted){setCatalog([]);setProducts([]);setFresh([]);setError(e.message===PRODUCT_LIST_ERROR?e.message:errorText(e))}}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort()},[]);
  const dealProducts=[...catalog].sort((a,b)=>Number(a.price)-Number(b.price)).slice(0,3);
  return <main className="market-home">
    <section className="market-hero shell"><div className="hero-copy"><span className="market-kicker">YOUR EVERYDAY MARKETPLACE</span><h1>More choice.<br/><em>Better finds.</em></h1><p>Everything you love, from daily essentials to the little things you did not know you needed.</p><Link to="/products" className="hero-cta">Shop all products <ArrowRight size={17}/></Link><div className="hero-points"><span><Truck/> Fast delivery</span><span><ShieldCheck/> Secure checkout</span></div></div><div className="hero-photo"><img src="/hero/shopstack-marketplace-hero.png" alt="A curated collection of electronics, fashion, skincare, home goods, and books" className="hero-marketplace-image" fetchpriority="high"/></div></section>
    <section className="trust-strip"><div className="shell trust-inner"><span><Truck/> Easy delivery on every order</span><span><ShieldCheck/> Secure checkout, always</span><span><RotateCcw/> Simple order tracking</span><span><Tag/> New finds added regularly</span></div></section>
    <section className="shell marketplace-categories" id="categories"><div className="market-section-heading"><div><span className="market-kicker">A LITTLE BIT OF EVERYTHING</span><h2>Shop by <em>category</em></h2></div><Link to="/products">See all categories <ChevronRight/></Link></div><div className="category-tiles">{categories.map(name=>{const product=catalog.find(item=>item.category===name);return <Link to={`/products?category=${encodeURIComponent(name)}`} key={name} className="category-tile"><div className="category-tile-img">{product&&<ProductImage src={product.imageUrl} product={product} alt="" loading="lazy"/>}</div><b>{name}</b></Link>})}</div></section>
    <section className="deal-strip"><div className="shell deal-content"><div><span>SHOPSTACK PICKS</span><h2>Little prices.<br/><em>Big happy.</em></h2><p>Everyday favorites for every corner of your life.</p><Link to="/products?sort=price-asc">Explore finds <ArrowRight size={16}/></Link></div><div className="deal-images">{dealProducts.map(product=><Link to={`/products/${product._id}`} key={product._id} aria-label={product.name}><ProductImage src={product.imageUrl} product={product} alt={product.name} loading="lazy"/></Link>)}</div><div className="deal-sticker">GOOD<br/>DEALS<br/><b>INSIDE</b></div></div></section>
    <section className="market-product-section shell"><div className="market-section-heading"><div><span className="market-kicker">CUSTOMER FAVORITES</span><h2>Popular <em>right now</em></h2></div><Link to="/products">View all <ChevronRight/></Link></div>{error?<div className="notice error" role="alert">{error}</div>:loading?<div className="loading-page" role="status">Loading products…</div>:products.length?<div className="product-grid market-grid">{products.map(product=><ProductCard key={product._id} product={product}/>)}</div>:<div className="empty-state"><h2>No featured products yet</h2><p>Check back soon for customer favorites.</p></div>}</section>
    <section className="fresh-section"><div className="shell market-product-section"><div className="market-section-heading"><div><span className="market-kicker">JUST LANDED</span><h2>New on <em>ShopStack</em></h2></div><Link to="/products">See what is new <ChevronRight/></Link></div>{loading?<div className="loading-page" role="status">Loading products…</div>:!error&&!fresh.length?<div className="empty-state"><h2>No products available yet</h2><p>New finds will appear here soon.</p></div>:<div className="product-grid market-grid">{fresh.map(product=><ProductCard key={product._id} product={product}/>)}</div>}</div></section>
    <section className="market-newsletter shell"><div><span className="market-kicker">GOOD THINGS START HERE</span><h2>Make room for <em>better finds.</em></h2><p>Create an account to keep track of your cart and orders.</p></div><Link className="hero-cta" to="/register">Create your account <ArrowRight size={16}/></Link></section>
  </main>
}
