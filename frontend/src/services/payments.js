import api from './api';
let scriptPromise;
function loadRazorpay(){if(window.Razorpay)return Promise.resolve(true);if(!scriptPromise)scriptPromise=new Promise(resolve=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.appendChild(script)});return scriptPromise;}
const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)||0);
const icons={
  upi:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.6"/><path d="M10 18.5h4M9 7h6M9 11h6"/></svg>',
  card:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 9h18M7 15h4"/></svg>',
  bank:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-6 9 6M4 10h16M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3v-12a3 3 0 0 1 3-3h13"/><path d="M16 12h5m-5 0a2 2 0 1 0 0 4h5v-4z"/></svg>',
  shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
};
export async function payWithRazorpay({payload,prefill={},description='ShopStack purchase',summary={}}){
  const {data:session}=await api.post('/payments/order',payload);
  if(session.demo){
    return new Promise((resolve,reject)=>{
      const dialog=document.createElement('dialog');
      const amount=session.amount/100;
      const itemCount=Number(summary.itemCount)||0;
      const subtotal=summary.subtotal==null?amount:Number(summary.subtotal);
      const methods=[
        {value:'UPI \u00b7 Google Pay',name:'Google Pay',detail:'Pay instantly using your UPI app',icon:'upi',brand:'gpay'},
        {value:'UPI \u00b7 PhonePe',name:'PhonePe',detail:'Secure UPI payments',icon:'upi',brand:'phonepe'},
        {value:'UPI \u00b7 Paytm',name:'Paytm',detail:'Pay with UPI',icon:'upi',brand:'paytm'},
        {value:'UPI \u00b7 BHIM',name:'BHIM UPI',detail:'Pay directly from your bank',icon:'upi',brand:'bhim'},
        {value:'Credit or debit card',name:'Credit / Debit Card',detail:'Visa, Mastercard and supported cards',icon:'card'},
        {value:'Net banking',name:'Net Banking',detail:'Pay through your bank',icon:'bank'}
      ];
      const methodCards=methods.map((method,index)=>`<button type="button" class="checkout-method-card" data-method="${method.value}" aria-pressed="false"><span class="checkout-method-icon ${method.brand||''}">${icons[method.icon]}</span><span class="checkout-method-copy"><strong>${method.name}</strong><small>${method.detail}</small></span><span class="checkout-method-check">${icons.check}</span></button>`).join('');
      dialog.className='demo-payment-dialog premium-checkout-dialog';
      dialog.setAttribute('aria-label','ShopStack secure checkout');
      dialog.innerHTML=`<section class="premium-checkout"><header class="premium-checkout-header"><div><span class="checkout-eyebrow">SHOPSTACK CHECKOUT</span><h2>Choose your payment method</h2><p>Select your preferred way to pay securely.</p></div><button type="button" class="premium-checkout-close" aria-label="Close checkout">&#215;</button></header><nav class="checkout-progress" aria-label="Checkout progress"><span class="is-complete"><i>1</i>Delivery</span><b></b><span class="is-current"><i>2</i>Payment</span><b></b><span><i>3</i>Confirmation</span></nav><div class="checkout-modal-layout"><div class="checkout-methods"><h3>Payment options</h3><div class="checkout-method-grid">${methodCards}</div></div><aside class="checkout-order-summary"><h3>Order summary</h3><p class="checkout-product-count">${itemCount||'Your'} ${itemCount?'item'+(itemCount===1?'':'s'):'order'}</p><div><span>Subtotal</span><b>${money(subtotal)}</b></div><div><span>Shipping</span><b>${money(summary.shipping||0)}</b></div><div><span>Discount</span><b class="checkout-discount">&minus; ${money(summary.discount||0)}</b></div><div class="checkout-summary-total"><span>Total</span><strong>${money(amount)}</strong></div><p class="checkout-secure-message">${icons.shield}<span><strong>Secure checkout</strong><small>Payment details are handled securely.</small></span></p></aside></div><footer class="premium-checkout-footer"><p class="checkout-demo-notice">Demo mode &ndash; No real payment will be charged.</p><p class="checkout-selection-error" role="alert" hidden></p><div class="checkout-modal-actions"><button type="button" class="checkout-cancel">Cancel</button><button type="button" class="checkout-pay" disabled><span class="checkout-pay-label">Pay ${money(amount)}</span><span class="checkout-spinner" aria-hidden="true"></span></button></div></footer></section>`;
      document.body.appendChild(dialog);
      let selectedMethod=null;
      let confirmedOrder=null;
      let processing=false;
      const close=(result='')=>{if(dialog.open&&!dialog.classList.contains('is-closing')){dialog.classList.add('is-closing');window.setTimeout(()=>{if(dialog.open)dialog.close(result)},160)}};
      const clean=()=>dialog.remove();
      dialog.addEventListener('close',()=>{const result=dialog.returnValue;clean();if(result==='success')resolve(confirmedOrder);else{api.post('/payments/cancel',{gatewayOrderId:session.gatewayOrderId}).catch(()=>{});reject(new Error('Payment cancelled. You can try again.'))}},{once:true});
      dialog.querySelectorAll('.checkout-method-card').forEach(card=>card.addEventListener('click',()=>{
        dialog.querySelector('.checkout-method-card.is-selected')?.classList.remove('is-selected');
        card.classList.add('is-selected');
        dialog.querySelector('.checkout-method-card[aria-pressed="true"]')?.setAttribute('aria-pressed','false');
        card.setAttribute('aria-pressed','true');
        selectedMethod=card.dataset.method;
        dialog.querySelector('.checkout-pay').disabled=false;
        dialog.querySelector('.checkout-selection-error').hidden=true;
      }));
      const cancel=()=>{if(!processing)close('')};
      dialog.querySelector('.premium-checkout-close').addEventListener('click',cancel);
      dialog.querySelector('.checkout-cancel').addEventListener('click',cancel);
      dialog.addEventListener('cancel',event=>{event.preventDefault();cancel()});
      dialog.querySelector('.checkout-pay').addEventListener('click',async event=>{
        if(processing)return;
        if(!selectedMethod){dialog.querySelector('.checkout-selection-error').textContent='Choose a payment method to continue.';dialog.querySelector('.checkout-selection-error').hidden=false;return}
        processing=true;
        const button=event.currentTarget;
        button.disabled=true;button.classList.add('is-loading');button.querySelector('.checkout-pay-label').textContent='Processing payment...';
        try{
          const {data}=await api.post('/payments/verify',{demoOrderId:session.gatewayOrderId,demoPaymentMethod:selectedMethod});
          confirmedOrder={...data.order,wallet:data.wallet};
          close('success');
        }catch(error){
          processing=false;button.disabled=false;button.classList.remove('is-loading');button.querySelector('.checkout-pay-label').textContent=`Pay ${money(amount)}`;
          const message=dialog.querySelector('.checkout-selection-error');message.textContent=error.response?.data?.message||'Payment could not be completed. Please try again.';message.hidden=false;
        }
      });
      dialog.showModal();
    });
  }
  if(!await loadRazorpay())throw new Error('Secure payment checkout could not be loaded. Check your connection and try again.');
  return new Promise((resolve,reject)=>{
    const checkout=new window.Razorpay({key:session.keyId,amount:session.amount,currency:session.currency,name:'ShopStack',description,order_id:session.gatewayOrderId,prefill:{name:prefill.name||'',email:prefill.email||'',contact:prefill.phone||''},theme:{color:'#2563EB'},handler:async response=>{try{const{data}=await api.post('/payments/verify',response);resolve({...data.order,wallet:data.wallet})}catch(error){reject(new Error(error.response?.data?.message||'Payment verification failed. Contact support before retrying.'))}},modal:{ondismiss:()=>{api.post('/payments/cancel',{gatewayOrderId:session.gatewayOrderId}).catch(()=>{});reject(new Error('Payment was not completed. You can try again from your orders.'))}}});
    checkout.on('payment.failed',event=>{api.post('/payments/cancel',{gatewayOrderId:session.gatewayOrderId}).catch(()=>{});reject(new Error(event.error?.description||'Payment failed. Please try again.'))});checkout.open();
  });
}
