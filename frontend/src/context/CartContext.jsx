import { createContext, useContext, useEffect, useState } from 'react';
const CartContext=createContext(null);
const readCart=()=>{
  try{
    const saved=JSON.parse(localStorage.getItem('shopstack-cart')||'[]');
    if(!Array.isArray(saved))return [];
    return saved.filter(item=>item&&typeof item==='object'&&!Array.isArray(item)&&typeof item._id==='string')
      .map(item=>({...item,quantity:Math.max(1,Math.floor(Number(item.quantity)||1)),stock:Math.max(0,Math.floor(Number(item.stock)||0))}));
  }catch{return []}
};
export function CartProvider({children}){
  const [items,setItems]=useState(readCart);
  useEffect(()=>{try{localStorage.setItem('shopstack-cart',JSON.stringify(items))}catch{/* Storage may be unavailable in private browsing. */}},[items]);
  const add=(product)=>{
    if(!product||typeof product!=='object'||typeof product._id!=='string')return;
    const stock=Math.max(0,Math.floor(Number(product.stock)||0));
    if(!stock)return;
    setItems(old=>{const found=old.find(i=>i._id===product._id);if(found)return old.map(i=>i._id===product._id?{...i,...product,stock,quantity:Math.min(found.quantity+1,stock)}:i);return [...old,{...product,stock,quantity:1}]});
  };
  const quantity=(id,delta)=>setItems(old=>old.map(i=>{
    if(i._id!==id)return i;
    const change=Number(delta);
    if(!Number.isFinite(change))return i;
    return {...i,quantity:Math.max(1,Math.min(i.stock||i.quantity,i.quantity+Math.trunc(change)))};
  }));
  const remove=(id)=>setItems(old=>old.filter(i=>i._id!==id)); const clear=()=>setItems([]); const count=items.reduce((sum,i)=>sum+i.quantity,0);
  return <CartContext.Provider value={{items,add,quantity,remove,clear,count}}>{children}</CartContext.Provider>
}
export const useCart=()=>useContext(CartContext);
