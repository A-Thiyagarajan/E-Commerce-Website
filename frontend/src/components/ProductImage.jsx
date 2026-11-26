import { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import productImageUrl, { resolveProductImageSource } from '../services/productImageUrl';

export default function ProductImage({ src, product, alt, loading = 'lazy', className = '' }) {
  const sources = useMemo(() => [...new Set([
    src,
    product?.imageUrl,
    product?.image,
    product?.product?.imageUrl,
    product?.product?.image,
    productImageUrl(product || {})
  ].map(resolveProductImageSource).filter(Boolean))], [src, product]);
  const sourceKey = sources.join('\u0000');
  const [sourceIndex, setSourceIndex] = useState(0);
  const [state, setState] = useState(sources.length ? 'loading' : 'error');
  const imageSrc = sources[sourceIndex] || '';

  useEffect(() => {
    setSourceIndex(0);
    setState(sources.length ? 'loading' : 'error');
  }, [sourceKey]);

  const handleError = () => {
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex(index => index + 1);
      setState('loading');
    } else {
      setState('error');
    }
  };

  return (
    <span className={`product-photo-frame ${className} ${state}`} role="img" aria-label={state === 'error' ? `${alt} image unavailable` : alt}>
      {state === 'loading' && <span className="product-photo-loading" aria-hidden="true" />}
      {state === 'error' ? (
        <span className="product-photo-fallback" title="Product image unavailable"><ImageOff size={21} aria-hidden="true" /></span>
      ) : (
        <img src={imageSrc} alt={alt} loading={loading} onLoad={() => setState('loaded')} onError={handleError} />
      )}
    </span>
  );
}
