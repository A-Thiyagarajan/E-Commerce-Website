import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import PaymentIntent from '../models/PaymentIntent.js';
import { productImagePath } from '../utils/productImages.js';

const configured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const demoMode = () => process.env.PAYMENT_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production';
const gateway = () => new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const groupedItems = (items=[]) => {
  const grouped=new Map();
  for(const item of items){const id=String(item.productId||'');const quantity=Number(item.quantity);if(!/^[a-f\d]{24}$/i.test(id)||!Number.isInteger(quantity)||quantity<1||quantity>50)throw Object.assign(new Error('Invalid cart item'),{status:400});grouped.set(id,(grouped.get(id)||0)+quantity);}
  if(!grouped.size)throw Object.assign(new Error('Your cart is empty'),{status:400});return grouped;
};
const requiredShipping=['name','email','phone','address','city','state','pinCode'];
function validateShipping(shipping){if(requiredShipping.some(key=>!String(shipping?.[key]||'').trim()))throw Object.assign(new Error('Complete your delivery details before paying'),{status:400});}
function validateShippingPhone(shipping){if(!/^\d{10}$/.test(String(shipping?.phone||'')))throw Object.assign(new Error('Phone number must contain exactly 10 digits'),{status:400});}

export function paymentConfig(req,res){res.json({enabled:configured()||demoMode(),demoMode:!configured()&&demoMode(),keyId:configured()?process.env.RAZORPAY_KEY_ID:''});}
export async function createPaymentOrder(req,res){
  if(!configured()&&!demoMode())return res.status(503).json({message:'Online payments are not enabled. Configure Razorpay keys in backend/.env.'});
  const {items,shipping,orderId}=req.body;
  try{
    let intentData,amount;
    if(orderId){
      const order=await Order.findOne({_id:orderId,user:req.user._id});
      if(!order)return res.status(404).json({message:'Order not found'});
      if(order.status==='Cancelled'||order.paymentStatus==='Paid')return res.status(409).json({message:'This order cannot be paid'});
      amount=order.total;intentData={order:order._id,items:[],shipping:order.shipping};
    }else{
      validateShipping(shipping);validateShippingPhone(shipping);const grouped=groupedItems(items);
      const products=await Product.find({_id:{$in:[...grouped.keys()]}});
      if(products.length!==grouped.size)return res.status(409).json({message:'A product is no longer available'});
      let snapshot=[];amount=0;
      for(const product of products){const quantity=grouped.get(String(product._id));if(product.stock<quantity)return res.status(409).json({message:`${product.name} does not have enough stock`});amount+=product.price*quantity;snapshot.push({product:product._id,name:product.name,category:product.category,imageUrl:productImagePath(product),price:product.price,quantity});}
      intentData={items:snapshot,shipping};
    }
    const gatewayOrder=configured()?await gateway().orders.create({amount:Math.round(amount*100),currency:'INR',receipt:`ss_${Date.now()}`}):{id:`demo_${crypto.randomUUID()}`,amount:Math.round(amount*100),currency:'INR'};
    await PaymentIntent.create({user:req.user._id,gatewayOrderId:gatewayOrder.id,amount,...intentData});
    res.status(201).json({gatewayOrderId:gatewayOrder.id,amount:gatewayOrder.amount,currency:gatewayOrder.currency,keyId:process.env.RAZORPAY_KEY_ID||'',demo:!configured()});
  }catch(error){if(error.status)return res.status(error.status).json({message:error.message});throw error;}
}

export async function verifyPayment(req,res){
  const {razorpay_order_id:realOrderId,razorpay_payment_id:realPaymentId,razorpay_signature:signature,demoOrderId,demoPaymentMethod}=req.body;
  const demo=Boolean(demoMode()&&!configured()&&demoOrderId?.startsWith('demo_'));
  const gatewayOrderId=demo?demoOrderId:realOrderId;
  const paymentId=demo?`demo_${crypto.randomUUID()}`:realPaymentId;
  if(!gatewayOrderId||!paymentId||(!demo&&!signature))return res.status(400).json({message:'Payment confirmation details are incomplete'});
  const allowedDemoMethods=['UPI · Google Pay','UPI · PhonePe','UPI · Paytm','UPI · BHIM','Credit or debit card','Net banking','Wallet'];
  if(demo&&!allowedDemoMethods.includes(demoPaymentMethod))return res.status(400).json({message:'Choose a demo payment method'});
  const intent=await PaymentIntent.findOne({gatewayOrderId,user:req.user._id});
  if(!intent)return res.status(404).json({message:'Payment session not found'});
  if(intent.status==='Paid'&&intent.order)return res.json({order:await Order.findById(intent.order),message:'Payment already confirmed'});
  if(!demo){const digest=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(`${gatewayOrderId}|${paymentId}`).digest('hex');const a=Buffer.from(digest),b=Buffer.from(String(signature));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(400).json({message:'Payment signature could not be verified'});}
  const session=await mongoose.startSession();
  try{
    let order;
    await session.withTransaction(async()=>{
      const current=await PaymentIntent.findById(intent._id).session(session);
      if(current.status==='Paid'&&current.order){order=await Order.findById(current.order).session(session);return;}
      if(current.order){
        order=await Order.findOneAndUpdate({_id:current.order,user:req.user._id,status:{$nin:['Cancelled','Delivered']},$or:[{paymentStatus:'Unpaid'},{paymentStatus:{$exists:false}}]},{paymentStatus:demo?'Demo paid':'Paid',paymentMethod:demo?'DEMO':'ONLINE',paymentGatewayId:paymentId,paymentProviderMethod:demo?demoPaymentMethod:'Razorpay'},{new:true,session});
        if(!order)throw Object.assign(new Error('Order has already been paid or changed'),{status:409});
      }else{
        const orderItems=[];
        for(const item of current.items){const product=await Product.findById(item.product).session(session);if(!product||product.stock<item.quantity)throw Object.assign(new Error(`${item.name} is no longer available in the requested quantity`),{status:409});if(!demo){const result=await Product.updateOne({_id:product._id,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}},{session});if(result.modifiedCount!==1)throw Object.assign(new Error(`${item.name} stock changed. Please contact support`),{status:409});}orderItems.push(item.toObject());}
        [order]=await Order.create([{user:req.user._id,items:orderItems,shipping:current.shipping,paymentMethod:demo?'DEMO':'ONLINE',paymentStatus:demo?'Demo paid':'Paid',paymentGatewayId:paymentId,paymentProviderMethod:demo?demoPaymentMethod:'Razorpay',total:current.amount}],{session});
      }
      current.status='Paid';current.gatewayPaymentId=paymentId;if(demo)current.paymentProviderMethod=demoPaymentMethod;current.order=order._id;await current.save({session});
    });
    res.json({order,demo});
  }finally{await session.endSession();}
}
