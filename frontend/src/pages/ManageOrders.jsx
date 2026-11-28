import{useCallback,useEffect,useMemo,useState}from'react';
import{Link}from'react-router-dom';
import{RefreshCw,Search,Package,Clock3,Truck,CheckCircle2,XCircle,MapPin,CreditCard,UserRound,Mail,Phone}from'lucide-react';
import api,{errorText}from'../services/api';
import ProductImage from'../components/ProductImage';

const statuses=['Pending','Processing','Shipped','Delivered','Cancelled'];
const paymentMethods=[['COD','Cash on Delivery'],['WALLET','Wallet'],['ONLINE','Online payment'],['DEMO','Demo payment']];
const statusIcons={Pending:Package,Processing:Clock3,Shipped:Truck,Delivered:CheckCircle2,Cancelled:XCircle};
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n)||0);
const dateLabel=value=>new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
export default function ManageOrders(){
  const[orders,setOrders]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[updating,setUpdating]=useState('');
  const[query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('All'),[paymentFilter,setPaymentFilter]=useState('All'),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(''),[sort,setSort]=useState('newest');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const{data}=await api.get('/admin/orders');setOrders(data.orders||[])}catch(e){setError(errorText(e))}finally{setLoading(false)}},[]);
  useEffect(()=>{load();const timer=setInterval(load,5000);return()=>clearInterval(timer)},[load]);
  const counts=useMemo(()=>statuses.reduce((result,status)=>({...result,[status]:orders.filter(order=>order.status===status).length}),{Total:orders.length}),[orders]);
  const visibleOrders=useMemo(()=>{
    const term=query.trim().toLowerCase();
    return [...orders].filter(order=>{
      const customer=order.user||{};
      const matchesQuery=!term||[order._id,order._id.slice(-8),customer.name,customer.email,order.shipping?.name,order.shipping?.email].some(value=>String(value||'').toLowerCase().includes(term));
      const matchesStatus=statusFilter==='All'||order.status===statusFilter;
      const matchesPayment=paymentFilter==='All'||order.paymentMethod===paymentFilter;
      const created=new Date(order.createdAt);
      const matchesFrom=!fromDate||created>=new Date(`${fromDate}T00:00:00`);
      const matchesTo=!toDate||created<new Date(new Date(`${toDate}T00:00:00`).getTime()+86400000);
      return matchesQuery&&matchesStatus&&matchesPayment&&matchesFrom&&matchesTo;
    }).sort((a,b)=>sort==='newest'?new Date(b.createdAt)-new Date(a.createdAt):new Date(a.createdAt)-new Date(b.createdAt));
  },[orders,query,statusFilter,paymentFilter,fromDate,toDate,sort]);
  const change=async(order,status)=>{
    if(status===order.status)return;
    if(status==='Cancelled'&&!window.confirm(`Cancel order #${order._id.slice(-8).toUpperCase()} for ${order.user?.name||order.shipping?.name||'this customer'}? Stock will be returned and the customer will see this order as cancelled.${['Paid','Demo paid'].includes(order.paymentStatus)||Number(order.walletPaid)>0?' The paid amount will be credited to the customer wallet.':''}`))return;
    setUpdating(order._id);setError('');setNotice('');
    try{await api.patch(`/admin/orders/${order._id}/status`,{status});setNotice(`Order #${order._id.slice(-8).toUpperCase()} updated to ${status}.`);await load()}
    catch(e){setError(errorText(e))}
    finally{setUpdating('')}
  };
  const clearFilters=()=>{setQuery('');setStatusFilter('All');setPaymentFilter('All');setFromDate('');setToDate('');setSort('newest')};
  const summary=[['Total Orders',counts.Total,Package,'All'],['Pending',counts.Pending,Clock3,'Pending'],['Processing',counts.Processing,Clock3,'Processing'],['Shipped',counts.Shipped,Truck,'Shipped'],['Delivered',counts.Delivered,CheckCircle2,'Delivered'],['Cancelled',counts.Cancelled,XCircle,'Cancelled']];
  return <main className="shell page-main admin-orders-page">
    <div className="breadcrumbs"><Link to="/admin">Admin</Link> / Orders</div>
    <header className="admin-orders-heading"><div><span className="market-kicker">SHOPSTACK OPERATIONS</span><h1>Customer <em>orders</em></h1><p>Manage and track all customer orders.</p></div><button type="button" className="admin-orders-refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading?'is-spinning':''}/>{loading?'Refreshing...':'Refresh orders'}</button></header>
    {error&&<div className="notice error" role="alert">{error}</div>}{notice&&<div className="notice success" role="status">{notice}</div>}
    <section className="admin-order-stats" aria-label="Order totals">{summary.map(([label,count,Icon,filter])=><button type="button" className={`admin-order-stat ${statusFilter===filter?'active':''}`} key={label} onClick={()=>setStatusFilter(filter)}><Icon size={18}/><span>{label}</span><b>{count}</b></button>)}</section>
    <section className="admin-order-filters" aria-label="Filter orders"><label className="admin-order-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order ID, customer, or email" aria-label="Search orders"/></label><label>Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option>{statuses.map(status=><option key={status}>{status}</option>)}</select></label><label>Payment<select value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}><option value="All">All methods</option>{paymentMethods.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>From<input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>To<input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button type="button" className="admin-order-clear" onClick={clearFilters}>Clear filters</button></section>
    <div className="admin-orders-results"><strong>{visibleOrders.length} {visibleOrders.length===1?'order':'orders'}</strong><span>Order fulfillment status updates are shared with customers.</span></div>
    {loading&&!orders.length?<div className="empty-state">Loading customer orders...</div>:!visibleOrders.length?<div className="empty-state">{orders.length?'No orders match these filters.':'No orders yet.'}</div>:<section className="admin-orders-list" aria-label="Customer orders">{visibleOrders.map(order=>{
      const StatusIcon=statusIcons[order.status]||Package;
      const items=order.items||[];
      return <article className="admin-order-card" key={order._id}>
        <header className="admin-order-card-head"><div><span className="admin-order-id">ORDER #{order._id.slice(-8).toUpperCase()}</span><small>Placed {dateLabel(order.createdAt)}</small></div><div className="admin-order-head-right"><strong>{money(order.total)}</strong><span className={`admin-order-status status-${order.status.toLowerCase()}`}><StatusIcon size={14}/>{order.status==='Cancelled'&&order.cancelledBy==='user'?'Cancelled by user':order.status}</span></div></header>
        <div className="admin-order-card-body"><section className="admin-order-products" aria-label="Order products">{items.map((item,index)=><div className="admin-order-product" key={`${item.product||item.name}-${index}`}><ProductImage src={item.imageUrl} product={item} alt={item.name}/><div><strong>{item.name}</strong><small>Qty {item.quantity} <span>at {money(item.price)} each</span></small></div><b>{money(item.price*item.quantity)}</b></div>)}</section>
          <aside className="admin-order-customer"><h3>Customer and delivery</h3><p><UserRound size={15}/><strong>{order.user?.name||order.shipping?.name||'Customer'}</strong></p><p><Mail size={15}/><span>{order.user?.email||order.shipping?.email||'No email on file'}</span></p><p><Phone size={15}/><span>{order.shipping?.phone||'No phone on file'}</span></p><p className="admin-order-address"><MapPin size={15}/><span>{[order.shipping?.address,order.shipping?.city,order.shipping?.state,order.shipping?.pinCode].filter(Boolean).join(', ')||'No delivery address on file'}</span></p><p className="admin-order-payment"><CreditCard size={15}/><span><strong>{order.paymentMethod==='COD'?'Cash on Delivery':order.paymentMethod==='WALLET'?'Wallet':order.paymentMethod==='DEMO'?`Demo - ${order.paymentProviderMethod||'payment'}`:'Online payment'}</strong><small>{order.paymentStatus||'Unpaid'}</small></span></p></aside></div>
        <footer className="admin-order-card-footer"><span>{items.length} {items.length===1?'product':'products'} / {items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0)} {items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0)===1?'item':'items'}</span>{order.status==='Cancelled'&&order.cancelledBy==='user'?<span className="admin-order-cancelled-note">Cancelled by customer</span>:<label>Update status<select value={order.status} disabled={updating===order._id} onChange={e=>change(order,e.target.value)} aria-label={`Update status for order ${order._id.slice(-8)}`}>{statuses.map(status=><option key={status}>{status}</option>)}</select>{updating===order._id&&<small>Saving status...</small>}</label>}</footer>
      </article>
    })}</section>}
  </main>
}
