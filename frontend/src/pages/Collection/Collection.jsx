import React, { useEffect, useState } from "react";
import "./Collection.css";
import "../../components/Products/Products.css";
import { API, formatBackendProduct } from "../../config";
import { FiChevronDown } from "react-icons/fi";
import { ProductCard } from "../../components/ProductSliders/ProductSliders";

export default function Collection({
  onNavigate,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  cart = [],
  wishlist = []
}) {
  const [collections, setCollections] = useState({
    bestSellers: [],
    newArrivals: [],
    topRated: []
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(() =>
    localStorage.getItem('at_collectionFilter') || "All Collections"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/collections/all`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        const best   = Array.isArray(data.bestSellers) ? data.bestSellers.map(i => formatBackendProduct(i.product)).filter(Boolean) : [];
        const newArr = Array.isArray(data.newArrivals) ? data.newArrivals.map(i => formatBackendProduct(i.product)).filter(Boolean) : [];
        const top    = Array.isArray(data.topRated)    ? data.topRated.map(i => formatBackendProduct(i.product)).filter(Boolean)    : [];
        setCollections({ bestSellers: best, newArrivals: newArr, topRated: top });
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch collections:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleFilterChange = () => {
      const stored = localStorage.getItem('at_collectionFilter');
      if (stored) setActiveFilter(stored);
    };
    window.addEventListener('collectionFilterChanged', handleFilterChange);
    return () => {
      window.removeEventListener('collectionFilterChanged', handleFilterChange);
      localStorage.removeItem('at_collectionFilter');
    };
  }, []);

  const filterOptions = ["All Collections", "Best Sellers", "Top Rated", "New Arrivals"];

  const renderProductList = (productsList, badgeLabel) => {
    return productsList.map(item => {
      const relatedInCart      = cart.some(c => c.id === item.id);
      const relatedWishlisted  = wishlist.some(w => w.id === item.id);
      return (
        <ProductCard
          key={item.id}
          product={item}
          badge={badgeLabel}
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          onAddToWishlist={onToggleWishlist}
          isInCart={relatedInCart}
          isWishlisted={relatedWishlisted}
          onViewCart={() => onNavigate && onNavigate('cart')}
        />
      );
    });
  };

  return (
    <div className="collection-page">
      {/* Hero */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">Our Collections</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("home")}>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Collections</span>
          </nav>
        </div>
      </div>

      <div className="collection-main">
        {/* Dropdown Filter */}
        <div className="collection-filter">
          <div className="collection-dropdown-container">
            <button className="collection-dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <span>Filter: {activeFilter}</span>
              <FiChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="collection-dropdown-menu">
                {filterOptions.map(opt => (
                  <button
                    key={opt}
                    className={`collection-dropdown-item ${activeFilter === opt ? 'active' : ''}`}
                    onClick={() => { setActiveFilter(opt); setDropdownOpen(false); }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="collection-loading">Loading collections...</div>
        ) : (
          <div className="collection-content">
            {(activeFilter === "All Collections" || activeFilter === "Best Sellers") && collections.bestSellers.length > 0 && (
              <div className="collection-section" data-aos="fade-up">
                <h2 className="collection-heading">Best Sellers</h2>
                <div className="col-product-grid">
                  {renderProductList(collections.bestSellers, "BESTSELLER")}
                </div>
              </div>
            )}

            {(activeFilter === "All Collections" || activeFilter === "Top Rated") && collections.topRated.length > 0 && (
              <div className="collection-section" data-aos="fade-up">
                <h2 className="collection-heading">Top Rated</h2>
                <div className="col-product-grid">
                  {renderProductList(collections.topRated, "TOP RATED")}
                </div>
              </div>
            )}

            {(activeFilter === "All Collections" || activeFilter === "New Arrivals") && collections.newArrivals.length > 0 && (
              <div className="collection-section" data-aos="fade-up">
                <h2 className="collection-heading">New Arrivals</h2>
                <div className="col-product-grid">
                  {renderProductList(collections.newArrivals, "NEW")}
                </div>
              </div>
            )}

            {!loading && collections.bestSellers.length === 0 && collections.topRated.length === 0 && collections.newArrivals.length === 0 && (
              <div className="collection-empty"><p>No special collections found.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
