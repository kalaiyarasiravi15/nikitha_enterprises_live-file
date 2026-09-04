import { useEffect, useRef, useState } from 'react'
import AOS from 'aos';
import 'aos/dist/aos.css';
import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Shop from './pages/Shop/Shop'
import ShopDetail from './pages/ShopDetail/ShopDetail'
import About from './pages/About/About'
import Contact from './pages/Contact/Contact'
import Cart from './pages/Cart/Cart'
import Checkout from './pages/Checkout/Checkout'
import Wishlist from './pages/Wishlist/Wishlist'
import Collection from './pages/Collection/Collection'
import MyAccount from './pages/MyAccount/MyAccount'
import MyOrders from './pages/MyOrders/MyOrders'
import PoojaAndGifting from './pages/PoojaAndGifting/PoojaAndGifting'
import AuthModal from './components/AuthModal/AuthModal'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy'
import ReturnPolicy from './pages/ReturnPolicy/ReturnPolicy'
import ShippingPolicy from './pages/ShippingPolicy/ShippingPolicy'
import Footer from './components/Footer/Footer'
import DealPopup from './components/DealPopup/DealPopup'
import CouponSidebar from './components/CouponSidebar/CouponSidebar'
import Preloader from './components/Preloader/Preloader'
import FloatingSocials from './components/FloatingSocials/FloatingSocials'
import { API, IMG, setActiveGlobalDeals, setActiveGlobalOfferBanners, formatBackendProduct } from './config'

/* ── AOS global init ────────────────────────────────── */
function useAOS(currentPage) {
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: false,
      mirror: false,
      offset: 60,
      delay: 0,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => AOS.refresh(), 120);
    return () => clearTimeout(t);
  }, [currentPage]);
}

/* ── Scroll-reveal observer ── */
function initScrollReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  targets.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/* ── Auth helpers ────────────────────────────────── */
const authHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const PENDING_ACTION_KEY = 'at_pendingProductAction';
const GUEST_SESSION_KEY = 'at_guest_session_id';
const getGuestSessionId = () => {
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
};
const isHdfcCheckoutReturn = () => {
  const params = new URLSearchParams(window.location.search);
  return window.location.pathname === '/checkout' && Boolean(params.get('hdfc_order'));
};

const readPendingAction = () => {
  try {
    const saved = sessionStorage.getItem(PENDING_ACTION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return null;
  }
};

const isTokenExpired = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

/* ── Backend item mappers ─────────────────────────── */
const mapCartItem = (item) => {
  const p = item.product;
  if (!p) return null;
  const formatted = formatBackendProduct(p);
  const selectedVariant = (p.variants || []).find(variant =>
    String(variant.id) === String(item.variantId)
  );
  const selectedPrice = Number(item.salesPrice);
  const variantImage = selectedVariant?.mainImage;
  const selectedName = selectedVariant
    ? (selectedVariant.name || `${p.name} - ${selectedVariant.variantValue}`)
    : (p.name || '');
  const originalItemPrice = Number(selectedVariant?.mrpPrice ?? p.mrpPrice ?? 0);
  const offerLabel = formatted.promotionSource
    || (p.discountType && p.discountType !== 'None' ? (p.promotionSource || p.discountType) : null)
    || (originalItemPrice > 0 && selectedPrice < originalItemPrice ? 'Offer' : null);
  const offerPercent = originalItemPrice > 0 && selectedPrice < originalItemPrice
    ? Math.round(((originalItemPrice - selectedPrice) / originalItemPrice) * 100)
    : 0;
  return {
    cartItemId: item.id,
    id: p.id,
    variantId: item.variantId || null,
    selectedSubOption: item.selectedSubOption || null,
    name: item.selectedSubOption ? `${selectedName} - ${item.selectedSubOption}` : selectedName,
    price: Number.isFinite(selectedPrice) && selectedPrice >= 0 ? selectedPrice : formatted.price,
    oldPrice: selectedVariant?.mrpPrice ?? formatted.oldPrice,
    thumb: variantImage ? (variantImage.startsWith('http') ? variantImage : `${IMG}/${variantImage}`) : formatted.thumb,
    images: formatted.images,
    description: p.description || '',
    category: p.category?.name || '',
    categoryId: p.categoryId || null,
    quantity: item.quantity,
    inStock: selectedVariant ? Number(selectedVariant.stock) > 0 : formatted.inStock,
    stockLeft: selectedVariant ? Number(selectedVariant.stock || 0) : formatted.stockLeft,
    variants: p.variants || [],
    raw: p,
    offerLabel,
    offerPercent,
    offerDiscountType: formatted.promotionDiscountType || p.promotionDiscountType || null,
    offerDiscountValue: formatted.promotionDiscountValue ?? p.promotionDiscountValue ?? null,
    isPreorder: Boolean(item.isPreorder),
    bookingLabel: item.isPreorder ? 'Pre-booked item' : null,
  };
};

const mapWishlistItem = (item) => {
  const p = item.product;
  if (!p) return null;
  const formatted = formatBackendProduct(p);
  return {
    wishlistId: item.id,
    id: p.id,
    variantId: item.variantId || null,
    selectedSubOption: item.selectedSubOption || null,
    name: p.name || '',
    price: formatted.price,
    oldPrice: formatted.oldPrice,
    thumb: formatted.thumb,
    images: formatted.images,
    inStock: formatted.inStock,
    variants: p.variants || [],
    raw: p,
  };
};

function App() {
  const hdfcCheckoutReturn = isHdfcCheckoutReturn();
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (path === '') return 'home';
    if (['home', 'shop', 'collection', 'about', 'contact', 'cart', 'checkout', 'wishlist', 'account', 'orders', 'privacy', 'return', 'shipping'].includes(path)) {
      return path;
    }
    if (path.startsWith('product/')) {
      return 'detail';
    }
    return localStorage.getItem('at_currentPage') || 'home';
  });
  const [selectedProductId, setSelectedProductId] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    if (path.startsWith('product/')) {
      const id = path.split('/')[1];
      return Number(id) || null;
    }
    const saved = localStorage.getItem('at_selectedProductId');
    return saved ? Number(saved) : null;
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const saved = localStorage.getItem('at_selectedCategory');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return localStorage.getItem('at_searchQuery') || '';
  });
  const [cart, setCart] = useState(() => {
    try { const saved = localStorage.getItem('at_guest_cart'); return saved ? JSON.parse(saved) : []; } catch(e) { return []; }
  });
  const [directCheckoutItems, setDirectCheckoutItems] = useState(null);
  const [checkoutMode, setCheckoutMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hdfc_pending_order') || '{}').isGuestCheckout ? 'guest-buy-now' : null; }
    catch { return null; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { const saved = localStorage.getItem('at_guest_wishlist'); return saved ? JSON.parse(saved) : []; } catch(e) { return []; }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const token = localStorage.getItem('at_token');
    const saved = localStorage.getItem('at_customer');
    if (token && saved) {
      try {
        if (isTokenExpired(token)) {
          localStorage.removeItem('at_token');
          localStorage.removeItem('at_customer');
          return null;
        }
        const customer = JSON.parse(saved);
        return { ...customer, token };
      } catch {
        return null;
      }
    }
    return null;
  });
  const [orders, setOrders] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(readPendingAction);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const authFailureHandled = useRef(false);

  const [activeDeals, setActiveDeals] = useState([]);
  const [activeOfferBanners, setActiveOfferBanners] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [highlightedCouponCode, setHighlightedCouponCode] = useState('');

  useEffect(() => {
    let audience = 'NEW_CUSTOMER';
    if (currentUser) {
      const hasOrders = Array.isArray(orders) && orders.some(o =>
        ['Confirmed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(o.status || o.orderStatus)
      );
      if (hasOrders) {
        audience = 'REGULAR_CUSTOMER';
      }
    }
    
    // Fetch active deals of the day
    fetch(`${API}/deals/active?audience=${audience}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const dealsArray = Array.isArray(data) ? data : (data ? [data] : []);
        setActiveDeals(dealsArray);
        setActiveGlobalDeals(dealsArray);
      })
      .catch(err => console.error("Error loading active deals in App:", err));

    // Fetch active offer banners
    fetch(`${API}/offer-banners/all?audience=${audience}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setActiveOfferBanners(Array.isArray(data) ? data : []);
        setActiveGlobalOfferBanners(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error loading active offer banners in App:", err));

  }, [currentUser?.id]);

  // Keep the floating coupon tab current even while a customer keeps the site open.
  useEffect(() => {
    let active = true;
    const loadCoupons = () => fetch(`${API}/coupons/list?global=true`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (active) setActiveCoupons(Array.isArray(data) ? data : []); })
      .catch(err => console.error('Error loading active coupons:', err));
    loadCoupons();
    const interval = setInterval(loadCoupons, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    localStorage.setItem('at_currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedProductId) {
      localStorage.setItem('at_selectedProductId', selectedProductId);
    } else {
      localStorage.removeItem('at_selectedProductId');
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedCategory) {
      localStorage.setItem('at_selectedCategory', JSON.stringify(selectedCategory));
    } else {
      localStorage.removeItem('at_selectedCategory');
    }
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem('at_searchQuery', searchQuery);
  }, [searchQuery]);

  /* ── AOS: init once + refresh on every page change ── */
  useAOS(currentPage);

  /* ── Restore session details from localStorage on mount ─── */
  useEffect(() => {
    if (currentUser) {
      fetchBackendCart(currentUser.id, currentUser.token);
      fetchBackendWishlist(currentUser.id, currentUser.token);
      fetchBackendOrders(currentUser.id, currentUser.token);
    } else {
      fetchGuestCart();
      fetchGuestWishlist();
    }
  }, []);

  // Recalculate cart prices if deals change
  useEffect(() => {
    setCart(prevCart => {
      if (!prevCart || prevCart.length === 0) return prevCart;
      let changed = false;
      const updated = prevCart.map(item => {
        if (!item.raw) return item;
        const formatted = formatBackendProduct(item.raw);
        if (formatted.price !== item.price || formatted.oldPrice !== item.oldPrice) {
          changed = true;
          return { ...item, price: formatted.price, oldPrice: formatted.oldPrice };
        }
        return item;
      });
      return changed ? updated : prevCart;
    });
  }, [activeDeals.length, activeOfferBanners.length]);

  /* ── Scroll-reveal on page change ─────────────────── */
  useEffect(() => {
    const cleanup = initScrollReveal();
    const t = setTimeout(() => initScrollReveal(), 120);
    return () => { cleanup(); clearTimeout(t); };
  }, [currentPage]);

  /* ── Browser popstate listener (back/forward buttons) ── */
  useEffect(() => {
    const handlePopState = (e) => {
      const state = e.state;
      if (state && state.page) {
        setCurrentPage(state.page);
        if (state.productId) setSelectedProductId(state.productId);
        if (state.category) setSelectedCategory(state.category);
      } else {
        const path = window.location.pathname.replace(/^\//, '');
        if (path === '') setCurrentPage('home');
        else if (path.startsWith('product/')) {
           setCurrentPage('detail');
           setSelectedProductId(Number(path.split('/')[1]));
        } else {
           setCurrentPage(path);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /* ─────────────── BACKEND FETCH HELPERS ──────────────── */
  const fetchBackendCart = async (customerId, token) => {
    try {
      const res = await fetch(`${API}/Cart/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        requireReauthentication();
        return;
      }
      if (res.ok) {
        const items = await res.json();
        setCart(items.map(mapCartItem).filter(Boolean));
      }
    } catch (err) { console.error('Fetch cart error:', err); }
  };

  const fetchBackendWishlist = async (customerId, token) => {
    try {
      const res = await fetch(`${API}/wishlist/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        requireReauthentication();
        return;
      }
      if (res.ok) {
        const items = await res.json();
        setWishlist(items.map(mapWishlistItem).filter(Boolean));
      }
    } catch (err) { console.error('Fetch wishlist error:', err); }
  };

  const fetchBackendOrders = async (customerId, token) => {
    try {
      const res = await fetch(`${API}/orders/customer/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        requireReauthentication();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error('Fetch orders error:', err); }
  };

  const fetchGuestCart = async () => {
    try {
      const res = await fetch(`${API}/Cart/guest/${getGuestSessionId()}`);
      if (!res.ok) return;
      const mapped = (await res.json()).map(mapCartItem).filter(Boolean);
      setCart(mapped);
      localStorage.setItem('at_guest_cart', JSON.stringify(mapped));
    } catch (err) { console.error('Fetch guest cart error:', err); }
  };

  const fetchGuestWishlist = async () => {
    try {
      const res = await fetch(`${API}/wishlist/guest/${getGuestSessionId()}`);
      if (!res.ok) return;
      const mapped = (await res.json()).map(mapWishlistItem).filter(Boolean);
      setWishlist(mapped);
      localStorage.setItem('at_guest_wishlist', JSON.stringify(mapped));
    } catch (err) { console.error('Fetch guest wishlist error:', err); }
  };

  /* ─────────────── NAVIGATION ──────────────────────────── */
  const navigateTo = (page, searchVal = '', options = {}) => {
    if (page !== 'checkout') {
      setDirectCheckoutItems(null);
    }
    if (page !== 'shop') {
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      setSearchQuery(searchVal);
    }
    if (page === 'checkout') {
      setCheckoutMode(options.guestBuyNow ? 'guest-buy-now' : 'account-checkout');
    }
    if (page === 'checkout' && !currentUser && !options.guestBuyNow) {
      queuePendingAction({ type: 'GO_TO_CHECKOUT' });
      return;
    }
    setCurrentPage(page);
    window.history.pushState({ page, searchVal }, '', `/${page === 'home' ? '' : page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductClick = (productId, options = {}) => {
    const couponCode = String(options?.couponCode || '').trim().toUpperCase();
    setHighlightedCouponCode(couponCode);
    if (couponCode) sessionStorage.setItem('at_pending_coupon_code', couponCode);
    setSelectedProductId(productId);
    setCurrentPage('detail');
    window.history.pushState({ page: 'detail', productId }, '', `/product/${productId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentPage('shop');
    window.history.pushState({ page: 'shop', category }, '', `/shop`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ─────────────── AUTH ─────────────────────────────────── */
  const handleAuthSuccess = async (user) => {
    localStorage.setItem('has_registered_before', 'true');
    authFailureHandled.current = false;
    setCurrentUser(user);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${user.name || 'User'}!`);
    setCart([]);
    setWishlist([]);
    setOrders([]);
    

    const syncGuestData = async (user) => {
      try {
        const guestCart = JSON.parse(localStorage.getItem('at_guest_cart') || '[]');
        if (guestCart.length > 0) {
          for (const item of guestCart) {
            await fetch(`${API}/Cart/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
              body: JSON.stringify({
                customerId: user.id,
                productId: item.id,
                quantity: item.quantity,
                variantId: item.variantId || null,
                selectedSubOption: item.selectedSubOption || null
              })
            });
          }
          localStorage.removeItem('at_guest_cart');
          await fetch(`${API}/Cart/guest/clear/${getGuestSessionId()}`, { method: 'DELETE' }).catch(() => {});
        }
        
        const guestWishlist = JSON.parse(localStorage.getItem('at_guest_wishlist') || '[]');
        if (guestWishlist.length > 0) {
          for (const item of guestWishlist) {
            await fetch(`${API}/wishlist/toggle`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
              body: JSON.stringify({
                customerId: user.id,
                productId: item.id,
                variantId: item.variantId || null,
                selectedSubOption: item.selectedSubOption || null
              })
            });
          }
          const savedWishlist = [...guestWishlist];
          localStorage.removeItem('at_guest_wishlist');
          // Data has already been copied to the account; clear its anonymous DB copy.
          await Promise.all(savedWishlist.map(item => fetch(`${API}/wishlist/guest/remove/${item.wishlistId}`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestSessionId: getGuestSessionId() })
          }))).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to sync guest data', err);
      }
    };

      if (user.token) {
        await syncGuestData(user);
      await fetchBackendCart(user.id, user.token);
      await fetchBackendWishlist(user.id, user.token);
      await fetchBackendOrders(user.id, user.token);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('at_token');
    localStorage.removeItem('at_customer');
    setCurrentUser(null);
    setCart([]);
    setDirectCheckoutItems(null);
    setWishlist([]);
    setOrders([]);
    void fetchGuestCart();
    void fetchGuestWishlist();
    navigateTo('home');
  };

  const queuePendingAction = (action) => {
    setPendingAction(action);
    sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
    setShowAuthModal(true);
  };

  const requireReauthentication = (action = null) => {
    if (authFailureHandled.current) return;
    authFailureHandled.current = true;
    localStorage.removeItem('at_token');
    localStorage.removeItem('at_customer');
    setCurrentUser(null);
    setCart([]);
    setWishlist([]);
    setOrders([]);
    if (action) {
      queuePendingAction(action);
    } else {
      setShowAuthModal(true);
    }
    toast.info('Your session has expired. Please sign in again.');
  };

  // A normal refreshed checkout requires login. The HDFC return is an
  // exception: it must render first so the paid transaction can be verified
  // and the customer receives the success/failure message.
  useEffect(() => {
    if (!currentUser && currentPage === 'checkout' && checkoutMode !== 'guest-buy-now' && !hdfcCheckoutReturn && !pendingAction) {
      queuePendingAction({ type: 'GO_TO_CHECKOUT' });
    } else if (!currentUser && !hdfcCheckoutReturn && pendingAction) {
      setShowAuthModal(true);
    }
  }, [currentPage, currentUser, pendingAction, hdfcCheckoutReturn, checkoutMode]);

  /* ─────────────── CART HANDLERS ───────────────────────── */
  const addProductToCart = async (user, product, quantity = 1, { openCart = true, pendingType = 'ADD_TO_CART' } = {}) => {
    try {
      const res = await fetch(`${API}/Cart/add`, {
        method: 'POST',
        headers: authHeaders(user.token),
        body: JSON.stringify({
          customerId: user.id,
          productId: product.id,
          variantId: product.selectedVariantId || null,
          selectedSubOption: product.selectedCapacity || null,
          quantity: Math.max(1, quantity),
          salesPrice: product.price,
          isPreorder: Boolean(product.isPreorder),
        }),
      });
      if (res.status === 401) {
        requireReauthentication({ type: pendingType, payload: { product, quantity } });
        return false;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to add product to cart');
      if (data.action === 'updated') {
        toast.success(`${product.name} quantity increased in your cart!`);
      } else {
        toast.success(`${product.name} added to cart!`);
      }
      await fetchBackendCart(user.id, user.token);
      if (openCart) navigateTo('cart');
      return true;
    } catch (err) {
      console.error('Add to cart error:', err);
      toast.error('Could not add to cart. Please try again.');
      return false;
    }
  };

  const handleAddToCart = async (product, quantity = 1) => {
    if (!currentUser) {
      try {
        const res = await fetch(`${API}/Cart/guest/add`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestSessionId: getGuestSessionId(), productId: product.id, variantId: product.selectedVariantId || product.variantId || null, selectedSubOption: product.selectedCapacity || product.selectedSubOption || null, quantity, isPreorder: Boolean(product.isPreorder) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to save cart');
        await fetchGuestCart();
        toast.success(data.action === 'updated' ? `${product.name} quantity increased in your cart!` : `${product.name} added to cart!`);
      } catch (err) { toast.error(err.message || 'Could not save your cart.'); return; }
      navigateTo('cart');
      return;
    }
    await addProductToCart(currentUser, product, quantity);
  };

  const handleUpdateCartQuantity = async (cartItemId, quantity) => {
    const safeQty = Math.max(1, quantity);
    if (!currentUser) {
      try {
        const res = await fetch(`${API}/Cart/guest/update/${cartItemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestSessionId: getGuestSessionId(), quantity: safeQty }) });
        if (!res.ok) throw new Error('Unable to update cart');
        await fetchGuestCart();
      } catch (err) { toast.error(err.message || 'Could not update your cart.'); }
      return;
    }
    // Optimistic UI update
    setCart(prev => prev.map(item =>
      item.cartItemId === cartItemId ? { ...item, quantity: safeQty } : item
    ));
    try {
      await fetch(`${API}/Cart/update/${cartItemId}`, {
        method: 'PUT',
        headers: authHeaders(currentUser.token),
        body: JSON.stringify({ quantity: safeQty }),
      });
    } catch (err) { console.error('Update cart error:', err); }
  };

  const handleRemoveFromCart = async (cartItemId) => {
    if (!currentUser) {
      try {
        const res = await fetch(`${API}/Cart/guest/remove/${cartItemId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestSessionId: getGuestSessionId() }) });
        if (!res.ok) throw new Error('Unable to remove cart item');
        await fetchGuestCart();
        toast.info('Item removed from cart.');
      } catch (err) { toast.error(err.message || 'Could not remove cart item.'); }
      return;
    }
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    try {
      await fetch(`${API}/Cart/remove/${cartItemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
      });
      toast.info('Item removed from cart.');
    } catch (err) { console.error('Remove from cart error:', err); }
  };

  const handleClearCart = async () => {
    if (!currentUser) {
      setCart([]);
      localStorage.removeItem('at_guest_cart');
      await fetch(`${API}/Cart/guest/clear/${getGuestSessionId()}`, { method: 'DELETE' }).catch(() => {});
      return;
    }
    setCart([]);
    try {
      await fetch(`${API}/Cart/clear/${currentUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
      });
    } catch (err) { console.error('Clear cart error:', err); }
  };

  /* ─────────────── WISHLIST HANDLERS ──────────────────── */
  const handleToggleWishlist = async (product) => {
    const vId = product.selectedVariantId || null;
    const sSub = product.selectedCapacity || null;

    if (!currentUser) {
      try {
        const res = await fetch(`${API}/wishlist/guest/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestSessionId: getGuestSessionId(), productId: product.id, variantId: vId, selectedSubOption: sSub }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to save wishlist');
        await fetchGuestWishlist();
        toast[data.action === 'removed' ? 'info' : 'success'](`${product.name} ${data.action === 'removed' ? 'removed from' : 'added to'} wishlist.`);
      } catch (err) { toast.error(err.message || 'Could not save your wishlist.'); }
      return; 
    }
    
    const existingItem = wishlist.find(item => 
      item.id === product.id && 
      item.variantId === vId && 
      item.selectedSubOption === sSub
    );

    try {
      if (existingItem?.wishlistId) {
        setWishlist(prev => prev.filter(item => item.wishlistId !== existingItem.wishlistId));
        toast.info(`${product.name} removed from wishlist.`);
        await fetch(`${API}/wishlist/remove/${existingItem.wishlistId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentUser.token}` },
        });
      } else {
        const res = await fetch(`${API}/wishlist/toggle`, {
          method: 'POST',
          headers: authHeaders(currentUser.token),
          body: JSON.stringify({ 
            customerId: currentUser.id, 
            productId: product.id,
            variantId: vId,
            selectedSubOption: sSub
          }),
        });
        if (res.status === 401) {
          requireReauthentication({ type: 'TOGGLE_WISHLIST', payload: { product } });
          return;
        }
        const data = await res.json();
        if (data.action === 'exists') {
          toast.info(`${product.name} is already in your wishlist!`);
        } else {
          toast.success(`${product.name} added to wishlist!`);
          await fetchBackendWishlist(currentUser.id, currentUser.token);
        }
      }
    } catch (err) { console.error('Toggle wishlist error:', err); }
  };

  const handleRemoveFromWishlist = async (wishlistIdOrProductId) => {
    if (!currentUser) {
      const item = wishlist.find(w => w.wishlistId === wishlistIdOrProductId || w.id === wishlistIdOrProductId);
      if (!item?.wishlistId) return;
      try {
        const res = await fetch(`${API}/wishlist/guest/remove/${item.wishlistId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestSessionId: getGuestSessionId() }) });
        if (!res.ok) throw new Error('Unable to remove wishlist item');
        await fetchGuestWishlist();
        toast.info('Item removed from wishlist.');
      } catch (err) { toast.error(err.message || 'Could not remove wishlist item.'); }
      return;
    }
    const item = wishlist.find(
      w => w.wishlistId === wishlistIdOrProductId || w.id === wishlistIdOrProductId
    );
    if (!item?.wishlistId) return;
    setWishlist(prev => prev.filter(w => w.wishlistId !== item.wishlistId));
    try {
      await fetch(`${API}/wishlist/remove/${item.wishlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
      });
      toast.info('Item removed from wishlist.');
    } catch (err) { console.error('Remove wishlist error:', err); }
  };

  /* ─────────────── ORDER HANDLER ──────────────────────── */
  const handleOrderPlaced = async (isGuestOrder = false) => {
    // Called by Checkout after successful order placement
    setDirectCheckoutItems(null);
    if (currentUser) {
      await fetchBackendOrders(currentUser.id, currentUser.token);
    }
    navigateTo(isGuestOrder ? 'home' : 'orders');
  };

  const buildDirectCheckoutItem = (product, quantity = 1) => ({
    ...product,
    cartItemId: product.cartItemId || `direct-${product.id}-${Date.now()}`,
    quantity: Math.max(1, quantity),
    isPreorder: Boolean(product.isPreorder),
    variantId: product.variantId || product.selectedVariantId || null,
    selectedVariantId: product.selectedVariantId || product.variantId || null,
    selectedSubOption: product.selectedSubOption || product.selectedCapacity || null,
  });

  const handleBuyNow = async (product, quantity = 1) => {
    setDirectCheckoutItems([buildDirectCheckoutItem(product, quantity)]);
    navigateTo('checkout', '', { guestBuyNow: !currentUser });
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('at_customer', JSON.stringify({
      id: updatedUser.id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email
    }));
  };

  /* ─────────────── COUNTS ──────────────────────────────── */
  const cartCount = cart.length;
  const wishlistCount = wishlist.length;

  /* ─────────────── PENDING ACTIONS ─────────────────────── */
  useEffect(() => {
    if (currentUser && pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      sessionStorage.removeItem(PENDING_ACTION_KEY);
      
      if (action.type === 'ADD_TO_CART') {
        addProductToCart(currentUser, action.payload.product, action.payload.quantity);
      } else if (action.type === 'TOGGLE_WISHLIST') {
        handleToggleWishlist(action.payload.product);
      } else if (action.type === 'BUY_NOW') {
        handleBuyNow(action.payload.product, action.payload.quantity);
      } else if (action.type === 'GO_TO_CHECKOUT') {
        navigateTo('checkout');
      }
    }
  }, [currentUser, pendingAction]);

  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      {showPreloader && <Preloader onComplete={() => setShowPreloader(false)} />}
      <Navbar
        currentTab={currentPage}
        onNavigate={navigateTo}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onProductClick={handleProductClick}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthModal(true)}
        onCategoryClick={handleCategoryClick}
        searchQuery={searchQuery}
        onSearch={(val) => navigateTo('shop', val)}
        activeDeals={activeDeals}
        activeOfferBanners={activeOfferBanners}
      />

      {currentPage === 'home' && (
        <Home
          activeDeals={activeDeals}
          activeOfferBanners={activeOfferBanners}
          onProductClick={handleProductClick}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onAddToWishlist={handleToggleWishlist}
          wishlist={wishlist}
          cart={cart}
          onCategoryClick={handleCategoryClick}
          onShopClick={() => navigateTo('shop')}
          onViewCart={() => navigateTo('cart')}
          onNavigate={navigateTo}
        />
      )}

      {currentPage === 'shop' && (
        <Shop
          onProductClick={handleProductClick}
          onAddToCart={handleAddToCart}
          onAddToWishlist={handleToggleWishlist}
          wishlist={wishlist}
          cart={cart}
          onNavigate={navigateTo}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onSearchClear={() => setSearchQuery('')}
        />
      )}

      {currentPage === 'collection' && (
        <Collection
          onNavigate={navigateTo}
          onProductClick={handleProductClick}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          cart={cart}
          wishlist={wishlist}
        />
      )}

      {currentPage === 'poojaGifting' && (
        <PoojaAndGifting
          onNavigate={navigateTo}
          onProductClick={handleProductClick}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          cart={cart}
          wishlist={wishlist}
        />
      )}

      {currentPage === 'detail' && (
        <ShopDetail
          productId={selectedProductId}
          onProductClick={handleProductClick}
          onBack={() => navigateTo('shop')}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onToggleWishlist={handleToggleWishlist}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onNavigate={navigateTo}
          cart={cart}
          wishlist={wishlist}
          currentUser={currentUser}
          coupons={activeCoupons}
          highlightedCouponCode={highlightedCouponCode}
        />
      )}

      {currentPage === 'about' && <About />}
      {currentPage === 'contact' && <Contact />}

      {currentPage === 'cart' && (
        <Cart
          cart={cart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveFromCart={handleRemoveFromCart}
          onNavigate={navigateTo}
          onProductClick={handleProductClick}
        />
      )}

      {currentPage === 'wishlist' && (
        <Wishlist
          wishlist={wishlist}
          onRemoveFromWishlist={handleRemoveFromWishlist}
          onAddToCart={handleAddToCart}
          cart={cart}
          onNavigate={navigateTo}
        />
      )}

      {currentPage === 'account' && (
        <MyAccount
          user={currentUser}
          onSignOut={handleLogout}
          onNavigate={navigateTo}
          cart={cart}
          wishlist={wishlist}
          orders={orders}
          onRemoveFromWishlist={handleRemoveFromWishlist}
          onUpdateUser={handleUpdateUser}
          initialTab="profile"
        />
      )}

      {currentPage === 'orders' && (
        <MyOrders
          currentUser={currentUser}
          onNavigate={navigateTo}
          initialTab="orders"
        />
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={pendingAction?.type === 'GO_TO_CHECKOUT' ? (localStorage.getItem('has_registered_before') === 'true' ? 'login' : 'register') : 'login'}
      />

      {currentPage === 'checkout' && (currentUser || hdfcCheckoutReturn || checkoutMode === 'guest-buy-now') && (
        <Checkout
          cart={directCheckoutItems || cart}
          currentUser={currentUser}
          isGuestCheckout={!currentUser && checkoutMode === 'guest-buy-now'}
          guestSessionId={getGuestSessionId()}
          hdfcReturnOrderId={new URLSearchParams(window.location.search).get('hdfc_order')}
          onClearCart={directCheckoutItems ? undefined : handleClearCart}
          onNavigate={navigateTo}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {currentPage === 'privacy' && <PrivacyPolicy />}
      {currentPage === 'return' && <ReturnPolicy />}
      {currentPage === 'shipping' && <ShippingPolicy />}

      <Footer onNavigate={navigateTo} />

      {/* Popups and Floating Elements */}
      <FloatingSocials />
      <DealPopup 
        deals={activeDeals} 
        banners={activeOfferBanners}
        onNavigate={navigateTo} 
        onProductClick={handleProductClick} 
      />
      <CouponSidebar
        coupons={activeCoupons}
        onNavigate={navigateTo}
        onProductClick={handleProductClick}
      />
    </>
  );
}

export default App
