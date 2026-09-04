import React, { useEffect, useState } from "react";
import "../Collection/Collection.css"; // Reuse Collection CSS for identical layout
import "../../components/Products/Products.css";
import { API, formatBackendProduct } from "../../config";
import { FiChevronDown } from "react-icons/fi";
import { ProductCard } from "../../components/ProductSliders/ProductSliders";

export default function PoojaAndGifting({
  onNavigate,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  cart = [],
  wishlist = []
}) {
  const [products, setProducts] = useState({
    poojaArticles: [],
    handicrafts: []
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(() => {
    return localStorage.getItem('at_poojaGiftingFilter') || "All Pooja & Gifting";
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/products/all`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(formatBackendProduct).filter(Boolean);
          
          const pooja = formatted.filter(p => p.category === 'Pooja Articles');
          const handicraft = formatted.filter(p => p.category === 'Handicrafts');

          setProducts({
            poojaArticles: pooja,
            handicrafts: handicraft
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch products for Pooja & Gifting:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleFilterChange = () => {
      const stored = localStorage.getItem('at_poojaGiftingFilter');
      if (stored) {
        setActiveFilter(stored);
      }
    };
    
    window.addEventListener('poojaGiftingFilterChanged', handleFilterChange);
    
    return () => {
      window.removeEventListener('poojaGiftingFilterChanged', handleFilterChange);
      localStorage.removeItem('at_poojaGiftingFilter');
    };
  }, []);

  const filterOptions = ["All Pooja & Gifting", "Pooja Articles", "Handicrafts"];

  const renderProductList = (productsList) => {
    return productsList.map(item => {
      const relatedInCart = cart.some((cartItem) => cartItem.id === item.id);
      const relatedWishlisted = wishlist.some((wishItem) => wishItem.id === item.id);

      return (
        <ProductCard
          key={item.id}
          product={item}
          badge={""}
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
      {/* Hero Section */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">Pooja & Gifting</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("home")}>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Pooja & Gifting</span>
          </nav>
        </div>
      </div>

      <div className="collection-main">
        {/* Dropdown Filter */}
        <div className="collection-filter">
          <div className="collection-dropdown-container">
            <button 
              className="collection-dropdown-btn" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>Filter: {activeFilter}</span>
              <FiChevronDown className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="collection-dropdown-menu">
                {filterOptions.map(opt => (
                  <button 
                    key={opt}
                    className={`collection-dropdown-item ${activeFilter === opt ? 'active' : ''}`}
                    onClick={() => {
                      setActiveFilter(opt);
                      setDropdownOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="collection-loading">Loading products...</div>
        ) : (
          <div className="collection-content">
            {(activeFilter === "All Pooja & Gifting" || activeFilter === "Pooja Articles") && products.poojaArticles.length > 0 && (
              <div className="collection-section" data-aos="fade-up">
                <h2 className="collection-heading">Pooja Articles</h2>
                <div className="col-product-grid">
                  {renderProductList(products.poojaArticles)}
                </div>
              </div>
            )}

            {(activeFilter === "All Pooja & Gifting" || activeFilter === "Handicrafts") && products.handicrafts.length > 0 && (
              <div className="collection-section" data-aos="fade-up">
                <h2 className="collection-heading">Handicrafts</h2>
                <div className="col-product-grid">
                  {renderProductList(products.handicrafts)}
                </div>
              </div>
            )}

            {!loading && products.poojaArticles.length === 0 && products.handicrafts.length === 0 && (
              <div className="collection-empty">
                <p>No products found in Pooja & Gifting.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
