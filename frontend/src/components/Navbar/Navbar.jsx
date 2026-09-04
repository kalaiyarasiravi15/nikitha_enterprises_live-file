import { useState, useEffect, useRef } from 'react'
import './Navbar.css'
import GoogleTranslate from '../GoogleTranslate/GoogleTranslate'
import { 
  FiSearch, 
  FiUser, 
  FiHeart, 
  FiShoppingBag, 
  FiShoppingCart, 
  FiEye, 
  FiChevronRight, 
  FiChevronDown, 
  FiTruck, 
  FiCheckCircle,
  FiMenu,
  FiX,
  FiHome,
  FiShoppingCart as FiShop,
  FiGrid,
  FiStar,
  FiPackage,
  FiInfo,
  FiPhone
} from 'react-icons/fi'
import { API, formatBackendProduct } from '../../config'


function FloralLogo({ size = 56, iconColor = "#C89438" }) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="navbar-logo-mark"
      aria-hidden="true"
    >
      {/* Outer pointed-tip geometric frame */}
      <path
        d="M 100,24 L 125,48 L 156,48 L 156,75 L 176,100 L 156,125 L 156,156 L 125,156 L 100,176 L 75,156 L 44,156 L 44,125 L 24,100 L 44,75 L 44,48 L 75,48 Z"
        fill="none"
        stroke={iconColor}
        strokeWidth="7.5"
        strokeLinejoin="miter"
      />

      {/* Center circle */}
      <circle cx="100" cy="100" r="13" fill={iconColor} />

      {/* 8 teardrop leaf petals */}
      <g fill={iconColor}>
        {petals.map(deg => (
          <path
            key={deg}
            d="M 100,52 C 88,66 88,80 100,87 C 112,80 112,66 100,52 Z"
            transform={`rotate(${deg}, 100, 100)`}
          />
        ))}
      </g>

      {/* 8 flanking outer dots */}
      <g fill={iconColor}>
        <circle cx="68" cy="20" r="6" />
        <circle cx="132" cy="20" r="6" />
        <circle cx="180" cy="68" r="6" />
        <circle cx="180" cy="132" r="6" />
        <circle cx="132" cy="180" r="6" />
        <circle cx="68" cy="180" r="6" />
        <circle cx="20" cy="132" r="6" />
        <circle cx="20" cy="68" r="6" />
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════ */

function Navbar({ 
  currentTab, 
  onNavigate, 
  cartCount, 
  wishlistCount, 
  wishlist = [], 
  onRemoveFromWishlist, 
  onProductClick,
  currentUser,
  onLogout,
  onOpenAuth,
  onCategoryClick,
  searchQuery = '',
  onSearch,
  activeDeals,
  activeOfferBanners
}) {
  const [showWishlist, setShowWishlist] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [badgePop, setBadgePop] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState(searchQuery || '');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const prevCartCount = useRef(cartCount);
  const prevWishlistCount = useRef(wishlistCount);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [showPoojaDropdown, setShowPoojaDropdown] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [megaActiveCat, setMegaActiveCat] = useState(null);
  const [shippingNotice, setShippingNotice] = useState('Free Shipping Available');
  const hideMegaMenuTimeout = useRef(null);

  useEffect(() => {
    setSearchVal(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    const loadShopNavigation = async () => {
      try {
        // Fetch independently: a product-request failure must never hide the
        // category dropdown, and vice versa.
        const [catsResult, productsResult] = await Promise.allSettled([
          fetch(`${API}/categories/all`).then(res => res.ok ? res.json() : []),
          fetch(`${API}/products/all`).then(res => res.ok ? res.json() : [])
        ]);
        if (!active) return;

        const catsData = catsResult.status === 'fulfilled' ? catsResult.value : [];
        const prodsData = productsResult.status === 'fulfilled' ? productsResult.value : [];
        const mappedProducts = Array.isArray(prodsData)
          ? prodsData.map(formatBackendProduct).filter(Boolean)
          : [];

        // Primary source is Category Management. If that request is briefly
        // unavailable, keep Shop usable by deriving categories from products.
        const categoryNames = Array.isArray(catsData)
          ? catsData.map(category => category?.name).filter(Boolean)
          : [];
        const fallbackNames = [...new Set(mappedProducts.map(product => product.category).filter(Boolean))];
        const resolvedCategories = categoryNames.length ? categoryNames : fallbackNames;

        setProducts(mappedProducts);
        setCategories(resolvedCategories);
        setMegaActiveCat(previous => previous && resolvedCategories.includes(previous)
          ? previous
          : (resolvedCategories[0] || null));
      } catch (err) {
        console.error('Error loading Shop categories:', err);
      }
    };
    loadShopNavigation();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(res => res.ok ? res.json() : null)
      .then(res => {
        const settings = res?.data;
        if (!settings) return;
        const rules = [];
        if (settings.FREE_SHIPPING_ONLINE_ACTIVE === 'true') rules.push(`Online above ₹${Number(settings.FREE_SHIPPING_ONLINE_THRESHOLD || 0).toLocaleString('en-IN')}`);
        if (settings.FREE_SHIPPING_COD_ACTIVE === 'true') rules.push(`COD above ₹${Number(settings.FREE_SHIPPING_COD_THRESHOLD || 0).toLocaleString('en-IN')}`);
        if (rules.length) setShippingNotice(`Free Shipping on ${rules.join(' • ')}`);
      })
      .catch(() => {});
  }, []);

  const handleMouseEnterShop = () => {
    if (hideMegaMenuTimeout.current) clearTimeout(hideMegaMenuTimeout.current);
    setShowMegaMenu(true);
  };
  const handleMouseLeaveShop = () => {
    hideMegaMenuTimeout.current = setTimeout(() => setShowMegaMenu(false), 200);
  };

  const activeCategoryProducts = products.filter(p => p.category === megaActiveCat).slice(0, 4);

  /* Navbar scroll state */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Lock body scroll when mobile menu open */
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const mobileNavigate = (tab, extra) => {
    closeMobileMenu();
    onNavigate && onNavigate(tab, extra);
  };

  /* Close dropdowns when clicking outside */
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  /* Cart badge bounce */
  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setBadgePop(true);
      const t = setTimeout(() => setBadgePop(false), 600);
      prevCartCount.current = cartCount;
      return () => clearTimeout(t);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  /* Wishlist heart pop */
  useEffect(() => {
    if (wishlistCount > prevWishlistCount.current) {
      setHeartPop(true);
      const t = setTimeout(() => setHeartPop(false), 600);
      prevWishlistCount.current = wishlistCount;
      return () => clearTimeout(t);
    }
    prevWishlistCount.current = wishlistCount;
  }, [wishlistCount]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSearchDropdown(false);
    if (onSearch) {
      onSearch(searchVal);
    } else {
      onNavigate && onNavigate('shop', searchVal);
    }
  };

  // Name-based search result filtering
  const searchResults = (() => {
    const query = searchVal.trim().toLowerCase();
    if (query.length < 2) return [];
    const queryWords = query.split(/\s+/).filter(Boolean);
    return products.filter(p => {
      const pName = (p.name || p.title || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      return queryWords.every(w => pName.includes(w) || pCat.includes(w));
    }).slice(0, 6);
  })();

  // Determine dynamic ticker text
  const firstDeal = activeDeals && activeDeals.length > 0 ? activeDeals[0] : null;
  const isDealActive = firstDeal && firstDeal.isActive;
  const activeBanner = activeOfferBanners?.find(b => b.status === true || b.isActive === true);
  const isOfferActive = !!activeBanner;

  const showTicker = isDealActive || isOfferActive;

  let tickerParts = [];
  if (isDealActive) {
    const dealType = firstDeal.discountType?.toUpperCase();
    const dealVal = Number(firstDeal.discountValue);
    const dealStr = dealType === 'FLAT' ? `₹${dealVal} OFF` : `${dealVal}% OFF`;
    tickerParts.push(`✦ Deal of the Day — Get ${dealStr} Today! ✦`);
  }
  if (isOfferActive) {
    const offerType = activeBanner.discountType?.toUpperCase();
    const offerVal = Number(activeBanner.discountValue);
    const offerStr = offerType === 'FLAT' ? `₹${offerVal} OFF` : `${offerVal}% OFF`;
    tickerParts.push(`✦ Special Offer — Get ${offerStr} Today! ✦`);
  }
  
  const tickerText = tickerParts.join(' ') + '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

  return (
    <header className={`header-container${scrolled ? ' scrolled' : ''}`}>

      {/* ══ 0. TICKER ANNOUNCEMENT BAR ══ */}
      {showTicker && (
        <div className="navbar-ticker-bar">
          <div className="ticker-content-wrap">
            <div className="ticker-text-container">
              <div className="ticker-text-move">
                <span className="ticker-txt">{tickerText}</span>
                <span className="ticker-txt">{tickerText}</span>
              </div>
            </div>
            {/* Shop Now button removed per request */}
          </div>
        </div>
      )}

      {/* ══ 1. TOP GREEN BAR ══ */}
      <div className="navbar-top-bar">
        <div className="top-bar-inner">
          <div className="top-bar-left">
            <span className="top-bar-item"><FiCheckCircle className="top-bar-icon" /> 100% Pure Brass</span>
            <span className="top-bar-divider">|</span>
            <span className="top-bar-item"><FiCheckCircle className="top-bar-icon" /> Handmade with Care</span>
            <span className="top-bar-divider">|</span>
            <span className="top-bar-item"><FiCheckCircle className="top-bar-icon" /> Non Toxic &amp; Healthy</span>
            <span className="top-bar-divider">|</span>
            <span className="top-bar-item"><FiCheckCircle className="top-bar-icon" /> Made in India</span>
          </div>
          <div className="top-bar-right">
            <div className="free-shipping-tag">
              <FiTruck className="shipping-icon" />
              <span>{shippingNotice}</span>
            </div>
            <GoogleTranslate />
          </div>
        </div>
      </div>

      {/* ══ 2. MIDDLE ROW — Logo | Search | Actions ══ */}
      <div className="navbar-middle-bar">
        <div className="middle-bar-inner">

          <div className="middle-bar-left-wrap">
            {/* Logo */}
            <div 
              className="navbar-logo" 
              onClick={() => onNavigate && onNavigate('home')}
            >
              <img src="/logo_pattern.png" alt="Anyra's Trove Logo" className="navbar-logo-mark" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
              <div className="navbar-logo-text">
                <span className="navbar-logo-title">ANYRA&apos;S TROVE</span>
                <span className="navbar-logo-tagline">PEOPLE FIRST</span>
                <span className="navbar-logo-brand-mark">BY NIKITHA ENTERPRISES</span>
              </div>
            </div>

            {/* Search */}
            <div className="navbar-search-col" ref={searchRef}>
              <form onSubmit={(e) => { setShowSearchDropdown(false); handleSearchSubmit(e); }} className="search-form-wrap">
                <input 
                  type="text" 
                  placeholder="Search for products (e.g. Handi, Diya, Urli)..." 
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="search-input"
                />
                <button type="submit" className="search-submit-btn">
                  <FiSearch />
                </button>
              </form>

              {/* Name-Based Live Search Results Dropdown */}
              {showSearchDropdown && searchVal.trim().length >= 2 && (
                <div className="search-dropdown-menu">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="search-dropdown-header">
                        Matching Products ({searchResults.length})
                      </div>
                      <div className="search-dropdown-list">
                        {searchResults.map((prod) => {
                          const pImg = prod.image
                            ? (prod.image.startsWith('http') ? prod.image : `${IMG}/${prod.image}`)
                            : (prod.thumb || '');
                          const price = prod.salesPrice || prod.price || 0;
                          return (
                            <div
                              key={prod.id}
                              className="search-dropdown-item"
                              onClick={() => {
                                setShowSearchDropdown(false);
                                if (onProductClick) {
                                  onProductClick(prod.id);
                                } else if (onNavigate) {
                                  onNavigate('shopdetail', prod.id);
                                }
                              }}
                            >
                              {pImg ? (
                                <img src={pImg} alt={prod.name} className="search-item-img" />
                              ) : (
                                <div className="search-item-img-placeholder" />
                              )}
                              <div className="search-item-info">
                                <span className="search-item-name">{prod.name}</span>
                                <span className="search-item-cat">{prod.category || 'Brassware'}</span>
                              </div>
                              <span className="search-item-price">₹{Number(price).toLocaleString('en-IN')}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="search-dropdown-footer">
                        <button
                          type="button"
                          className="search-view-all-btn"
                          onClick={(e) => {
                            setShowSearchDropdown(false);
                            handleSearchSubmit(e);
                          }}
                        >
                          View all results for &quot;{searchVal}&quot; →
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="search-dropdown-empty">
                      No products found matching &quot;{searchVal}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="navbar-actions-col">

            {/* Account */}
            <div className="navbar-action-item user-dropdown-anchor" ref={dropdownRef}>
              <div 
                className={`action-btn-trigger ${currentUser ? 'is-logged-in' : ''}`}
                onClick={() => {
                  if (currentUser) {
                    setShowUserDropdown(!showUserDropdown);
                  } else {
                    onOpenAuth && onOpenAuth();
                  }
                }}
              >
                <div className="action-icon-wrap">
                  <FiUser />
                  {currentUser && <span className="user-dot" />}
                </div>
                <span className="action-text">Account</span>
              </div>
              
              {showUserDropdown && currentUser && (
                <div className="navbar-user-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{currentUser.name}</p>
                    <p className="dropdown-email">{currentUser.email}</p>
                  </div>
                  <div className="dropdown-divider" />
                  <button 
                    type="button" 
                    onClick={() => { 
                      setShowUserDropdown(false); 
                      onNavigate && onNavigate('account'); 
                    }}
                  >
                    My Account
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { 
                      setShowUserDropdown(false); 
                      onNavigate && onNavigate('orders'); 
                    }}
                  >
                    My Orders
                  </button>
                  <div className="dropdown-divider" />
                  <button 
                    type="button" 
                    className="dropdown-logout-btn"
                    onClick={() => { 
                      setShowUserDropdown(false); 
                      onLogout && onLogout(); 
                      onNavigate && onNavigate('home');
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <div 
              className="navbar-action-item" 
              onClick={() => onNavigate && onNavigate('wishlist')}
              title="Wishlist"
            >
              <div className="action-icon-wrap">
                <FiHeart
                  className={heartPop ? 'heart-pop' : ''}
                  style={{ fill: wishlistCount > 0 ? '#2d5a1b' : 'none', color: wishlistCount > 0 ? '#2d5a1b' : 'currentColor' }}
                />
                {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
              </div>
              <span className="action-text">Wishlist</span>
            </div>

            {/* Track Order */}
            <div 
              className="navbar-action-item" 
              onClick={() => onNavigate && onNavigate(currentUser ? 'orders' : 'home')}
              title="Track Order"
            >
              <div className="action-icon-wrap">
                <FiTruck />
              </div>
              <span className="action-text">Track Order</span>
            </div>

            {/* Cart */}
            <div 
              className="navbar-action-item cart-item-horizontal" 
              onClick={() => onNavigate && onNavigate('cart')}
              title="Shopping Cart"
            >
              <div className="action-icon-wrap">
                <FiShoppingBag className={badgePop ? 'badge-pop' : ''} />
                <span className="action-badge green-badge">{cartCount}</span>
              </div>
              <span className="action-text font-bold">Cart</span>
            </div>

            {/* ─── Hamburger (mobile only) ─── */}
            <button
              className="navbar-hamburger"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>

          </div>
        </div>
      </div>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      <div className={`mobile-nav-overlay${mobileMenuOpen ? ' open' : ''}`} onClick={closeMobileMenu} />

      {/* ─── MOBILE DRAWER ─── */}
      <nav className={`mobile-nav-drawer${mobileMenuOpen ? ' open' : ''}`} aria-hidden={!mobileMenuOpen}>

        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-logo" onClick={() => mobileNavigate('home')}>
            <img src="/logo_pattern.png" alt="Anyra's Trove Logo" className="navbar-logo-mark" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            <div className="navbar-logo-text">
              <span className="navbar-logo-title" style={{ fontSize: '1.25rem' }}>ANYRA&apos;S TROVE</span>
              <span className="navbar-logo-tagline" style={{ fontSize: '0.52rem' }}>PEOPLE FIRST</span>
              <span className="navbar-logo-brand-mark" style={{ fontSize: '0.48rem' }}>BY NIKITHA ENTERPRISES</span>
            </div>
          </div>
          <button className="mobile-drawer-close" onClick={closeMobileMenu} aria-label="Close Menu">
            <FiX size={22} />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="mobile-drawer-search">
          <form onSubmit={(e) => { e.preventDefault(); closeMobileMenu(); if (onSearch) onSearch(searchVal); else mobileNavigate('shop', searchVal); }} className="search-form-wrap">
            <input
              type="text"
              placeholder="Search for products..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-submit-btn"><FiSearch /></button>
          </form>
        </div>

        {/* Nav Links with Icons */}
        <ul className="mobile-nav-links">
          <li className={currentTab === 'home' ? 'active' : ''}>
            <button onClick={() => mobileNavigate('home')}>
              <FiHome className="mnav-icon" /><span>Home</span>
            </button>
          </li>
          <li className={currentTab === 'shop' || currentTab === 'detail' ? 'active' : ''}>
            <button onClick={() => mobileNavigate('shop')}>
              <FiShoppingCart className="mnav-icon" /><span>Shop</span>
            </button>
            {categories.length > 0 && (
              <ul className="mobile-sub-links">
                {categories.map((cat, i) => (
                  <li key={i}>
                    <button onClick={() => { closeMobileMenu(); if (onCategoryClick) onCategoryClick(cat); else mobileNavigate('shop'); }}>
                      <FiChevronRight size={13} />{cat}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
          <li className={currentTab === 'collection' ? 'active' : ''}>
            <button onClick={() => { localStorage.setItem('at_collectionFilter', 'All Collections'); window.dispatchEvent(new Event('collectionFilterChanged')); mobileNavigate('collection'); }}>
              <FiGrid className="mnav-icon" /><span>Collections</span>
            </button>
            <ul className="mobile-sub-links">
              <li><button onClick={() => { localStorage.setItem('at_collectionFilter','Best Sellers'); window.dispatchEvent(new Event('collectionFilterChanged')); closeMobileMenu(); mobileNavigate('collection'); }}><FiChevronRight size={13}/>Best Sellers</button></li>
              <li><button onClick={() => { localStorage.setItem('at_collectionFilter','Top Rated'); window.dispatchEvent(new Event('collectionFilterChanged')); closeMobileMenu(); mobileNavigate('collection'); }}><FiChevronRight size={13}/>Top Rated</button></li>
              <li><button onClick={() => { localStorage.setItem('at_collectionFilter','New Arrivals'); window.dispatchEvent(new Event('collectionFilterChanged')); closeMobileMenu(); mobileNavigate('collection'); }}><FiChevronRight size={13}/>New Arrivals</button></li>
            </ul>
          </li>
          <li className={currentTab === 'poojaGifting' ? 'active' : ''}>
            <button onClick={() => { localStorage.setItem('at_poojaGiftingFilter', 'All Pooja & Gifting'); window.dispatchEvent(new Event('poojaGiftingFilterChanged')); mobileNavigate('poojaGifting'); }}>
              <FiPackage className="mnav-icon" /><span>Pooja &amp; Gifting</span>
            </button>
          </li>
          <li className={currentTab === 'about' ? 'active' : ''}>
            <button onClick={() => mobileNavigate('about')}>
              <FiInfo className="mnav-icon" /><span>About Us</span>
            </button>
          </li>
          <li className={currentTab === 'contact' ? 'active' : ''}>
            <button onClick={() => mobileNavigate('contact')}>
              <FiPhone className="mnav-icon" /><span>Contact Us</span>
            </button>
          </li>
        </ul>

        {/* Mobile Quick Actions */}
        <div className="mobile-drawer-actions">
          <button className="mda-btn" onClick={() => { if (currentUser) { setShowUserDropdown(true); closeMobileMenu(); } else { onOpenAuth && onOpenAuth(); closeMobileMenu(); } }}>
            <FiUser /><span>{currentUser ? currentUser.name.split(' ')[0] : 'Login'}</span>
          </button>
          <button className="mda-btn" onClick={() => mobileNavigate('wishlist')}>
            <FiHeart style={{ fill: wishlistCount > 0 ? '#2d5a1b' : 'none', color: wishlistCount > 0 ? '#2d5a1b' : 'currentColor' }} />
            <span>Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
          </button>
          <button className="mda-btn" onClick={() => mobileNavigate(currentUser ? 'orders' : 'home')}>
            <FiTruck /><span>Track Order</span>
          </button>
          <button className="mda-btn cart" onClick={() => mobileNavigate('cart')}>
            <FiShoppingBag /><span>Cart ({cartCount})</span>
          </button>
        </div>

        {currentUser && (
          <div className="mobile-drawer-user">
            <p className="mdu-name">{currentUser.name}</p>
            <p className="mdu-email">{currentUser.email}</p>
            <div className="mdu-actions">
              <button onClick={() => mobileNavigate('account')}>My Account</button>
              <button onClick={() => mobileNavigate('orders')}>My Orders</button>
              <button className="mdu-logout" onClick={() => { closeMobileMenu(); onLogout && onLogout(); onNavigate && onNavigate('home'); }}>Logout</button>
            </div>
          </div>
        )}

      </nav>

      {/* ══ 3. BOTTOM NAVIGATION BAR ══ */}
      <div className="navbar-bottom-bar">
        <div className="bottom-bar-inner">
          <ul className="navbar-nav-links">

            {/* HOME */}
            <li>
              <a 
                href="#home" 
                className={currentTab === 'home' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate && onNavigate('home');
                }}
              >
                HOME
              </a>
            </li>
            
            {/* SHOP ▾ */}
            <li 
              className="dropdown-link-item"
              onMouseEnter={handleMouseEnterShop}
              onMouseLeave={handleMouseLeaveShop}
            >
              <a 
                href="#shop" 
                className={currentTab === 'shop' || currentTab === 'detail' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setShowMegaMenu(false);
                  onNavigate && onNavigate('shop');
                }}
              >
                SHOP <FiChevronDown className="dropdown-chev" />
              </a>

              {showMegaMenu && (
                <ul className="simple-dropdown-menu" onMouseEnter={handleMouseEnterShop} onMouseLeave={handleMouseLeaveShop}>
                  <li
                    className="shop-all-dropdown-item"
                    onClick={() => {
                      setShowMegaMenu(false);
                      onNavigate && onNavigate('shop');
                    }}
                  >
                    All Products
                  </li>
                  {categories.map((cat, i) => (
                    <li 
                      key={i}
                      onClick={() => {
                        setShowMegaMenu(false);
                        if (onCategoryClick) {
                          onCategoryClick(cat);
                        } else if (onNavigate) {
                          onNavigate('shop');
                        }
                      }}
                    >
                      {cat}
                    </li>
                  ))}
                  {!categories.length && (
                    <li className="shop-category-loading" aria-live="polite">Loading categories…</li>
                  )}
                </ul>
              )}
            </li>

            {/* COLLECTIONS ▾ */}
            <li
              className="dropdown-link-item"
              onMouseEnter={() => setShowCollectionsDropdown(true)}
              onMouseLeave={() => setShowCollectionsDropdown(false)}
            >
              <a
                href="#collections"
                className={currentTab === 'collection' ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  localStorage.setItem('at_collectionFilter', 'All Collections');
                  window.dispatchEvent(new Event('collectionFilterChanged'));
                  onNavigate && onNavigate('collection'); 
                }}
              >
                COLLECTIONS <FiChevronDown className="dropdown-chev" />
              </a>
              {showCollectionsDropdown && (
                <ul className="simple-dropdown-menu">
                  <li onClick={() => { 
                    localStorage.setItem('at_collectionFilter', 'Best Sellers'); 
                    window.dispatchEvent(new Event('collectionFilterChanged'));
                    setShowCollectionsDropdown(false); 
                    onNavigate && onNavigate('collection'); 
                  }}>Best Sellers</li>
                  <li onClick={() => { 
                    localStorage.setItem('at_collectionFilter', 'Top Rated'); 
                    window.dispatchEvent(new Event('collectionFilterChanged'));
                    setShowCollectionsDropdown(false); 
                    onNavigate && onNavigate('collection'); 
                  }}>Top Rated</li>
                  <li onClick={() => { 
                    localStorage.setItem('at_collectionFilter', 'New Arrivals'); 
                    window.dispatchEvent(new Event('collectionFilterChanged'));
                    setShowCollectionsDropdown(false); 
                    onNavigate && onNavigate('collection'); 
                  }}>New Arrivals</li>
                </ul>
              )}
            </li>

            {/* POOJA & GIFTING ▾ */}
            <li
              className="dropdown-link-item"
              onMouseEnter={() => setShowPoojaDropdown(true)}
              onMouseLeave={() => setShowPoojaDropdown(false)}
            >
              <a
                href="#pooja"
                className={currentTab === 'poojaGifting' ? 'active' : ''}
                onClick={(e) => { 
                  e.preventDefault(); 
                  localStorage.setItem('at_poojaGiftingFilter', 'All Pooja & Gifting');
                  window.dispatchEvent(new Event('poojaGiftingFilterChanged'));
                  onNavigate && onNavigate('poojaGifting'); 
                }}
              >
                POOJA &amp; GIFTING <FiChevronDown className="dropdown-chev" />
              </a>
              {showPoojaDropdown && (
                <ul className="simple-dropdown-menu">
                  <li onClick={() => { 
                    localStorage.setItem('at_poojaGiftingFilter', 'Pooja Articles'); 
                    window.dispatchEvent(new Event('poojaGiftingFilterChanged'));
                    setShowPoojaDropdown(false); 
                    onNavigate && onNavigate('poojaGifting'); 
                  }}>Pooja Articles</li>
                  <li onClick={() => { 
                    localStorage.setItem('at_poojaGiftingFilter', 'Handicrafts'); 
                    window.dispatchEvent(new Event('poojaGiftingFilterChanged'));
                    setShowPoojaDropdown(false); 
                    onNavigate && onNavigate('poojaGifting'); 
                  }}>Handicrafts</li>
                </ul>
              )}
            </li>

            {/* ABOUT US */}
            <li>
              <a 
                href="#about" 
                className={currentTab === 'about' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate && onNavigate('about');
                }}
              >
                ABOUT US
              </a>
            </li>



            {/* CONTACT US */}
            <li>
              <a 
                href="#contact" 
                className={currentTab === 'contact' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate && onNavigate('contact');
                }}
              >
                CONTACT US
              </a>
            </li>

          </ul>
        </div>
      </div>

    </header>
  );
}

export default Navbar;
