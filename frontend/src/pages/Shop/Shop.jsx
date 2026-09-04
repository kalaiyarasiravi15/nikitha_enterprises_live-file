import React, { useEffect, useMemo, useState } from "react";
import "./Shop.css";
import { FiShoppingCart, FiHeart, FiEye } from "react-icons/fi";
import { AnimatedPageTitle, ScrollReveal } from "../../components/Animation/Animation";
import { API, IMG, formatBackendProduct } from "../../config";
import { ProductCard } from "../../components/ProductSliders/ProductSliders";

const PAGE_SIZE = 8;

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export default function Shop({ 
  onProductClick, 
  onAddToCart, 
  onAddToWishlist, 
  wishlist = [], 
  cart = [], 
  onNavigate, 
  selectedCategory = null,
  searchQuery = "",
  onSearchClear
}) {
  const [activeCategory, setActiveCategory] = useState(selectedCategory);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API}/categories/all`).then(res => {
        if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
        return res.json();
      }),
      fetch(`${API}/products/all`).then(res => {
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        return res.json();
      })
    ]).then(([catsData, prodsData]) => {
      if (cancelled) return;

      const mappedCats = Array.isArray(catsData)
        ? catsData.map(c => ({
            name: c.name,
            image: c.image ? (c.image.startsWith('http') ? c.image : `${IMG}/${c.image}`) : null
          }))
        : [];
      setCategories(mappedCats);

      const mappedProds = Array.isArray(prodsData)
        ? prodsData.map(formatBackendProduct).filter(Boolean)
        : [];
      setProducts(mappedProds);

      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      console.error("Error loading Shop page data:", err);
      setCategories([]);
      setProducts([]);
      setError("We couldn't load products right now. Please try again shortly.");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setActiveCategory(selectedCategory);
    setPage(1);
  }, [selectedCategory]);

  const handleCategoryClick = (cat) => {
    setPage(1);
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  const handleMinPriceChange = (e) => {
    setPage(1);
    setMinPrice(e.target.value.replace(/[^0-9.]/g, ""));
  };

  const handleMaxPriceChange = (e) => {
    setPage(1);
    setMaxPrice(e.target.value.replace(/[^0-9.]/g, ""));
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
    onSearchClear && onSearchClear();
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }

    const min = minPrice === "" ? null : parseFloat(minPrice);
    const max = maxPrice === "" ? null : parseFloat(maxPrice);
    if (min !== null && !Number.isNaN(min)) {
      list = list.filter((p) => p.price >= min);
    }
    if (max !== null && !Number.isNaN(max)) {
      list = list.filter((p) => p.price <= max);
    }

    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, searchQuery, activeCategory, minPrice, maxPrice, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const isWishlisted = (id) => wishlist.some((item) => item.id === id);
  const isInCart = (id) => cart.some((item) => item.id === id);

  return (
    <div className="shop-page fade-in-up-page">
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">
            {"Products".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">{activeCategory || "Products"}</span>
          </nav>
        </div>
      </div>

      <div className="shop-body">
        <ScrollReveal className="shop-sidebar">

          {/* Categories - moved to sidebar */}
          <div className="filter-block">
            <h3 className="filter-block__title">Categories</h3>
            <ul className="category-list category-list--visual">
              <li
                className={`category-list__item category-list__item--visual ${activeCategory === null ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(null)}
              >
                <span className="category-list__thumb">
                  <span className="category-list__thumb-emoji">🌟</span>
                </span>
                <span className="category-list__label">All Products</span>
              </li>
              {categories.map(cat => (
                <li
                  key={cat.name}
                  className={`category-list__item category-list__item--visual ${activeCategory === cat.name ? 'is-active' : ''}`}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <span className="category-list__thumb">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} />
                    ) : (
                      <span className="category-list__thumb-emoji"></span>
                    )}
                  </span>
                  <span className="category-list__label">{cat.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Filter — hidden for now */}
          {false && (
          <div className="filter-block">
            <h3 className="filter-block__title">Price</h3>
            <div className="price-inputs">
              <label className="price-inputs__field">
                <span>Min</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={minPrice}
                  onChange={handleMinPriceChange}
                />
              </label>
              <span className="price-inputs__dash">—</span>
              <label className="price-inputs__field">
                <span>Max</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="100"
                  value={maxPrice}
                  onChange={handleMaxPriceChange}
                />
              </label>
            </div>
          </div>
          )}

          <button type="button" className="clear-filters" onClick={clearFilters}>
            Clear all filters
          </button>
        </ScrollReveal>

        <main className="shop-main">

          {searchQuery && (
            <div className="search-results-banner" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              background: '#fdf8f1', 
              padding: '12px 24px', 
              border: '1.5px solid #f0e4d0', 
              borderRadius: '4px', 
              marginBottom: '28px',
              fontFamily: 'Jost, sans-serif'
            }}>
              <span style={{ fontSize: '0.88rem', color: '#2d5a1b', fontWeight: 700 }}>
                Showing search results for &ldquo;{searchQuery}&rdquo;
              </span>
              <button 
                type="button" 
                onClick={onSearchClear}
                style={{ 
                  background: '#2d5a1b', 
                  color: '#ffffff', 
                  border: 'none', 
                  padding: '6px 14px', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '0.78rem', 
                  fontWeight: 700,
                  fontFamily: 'Jost, sans-serif'
                }}
              >
                Clear Search
              </button>
            </div>
          )}

          <ScrollReveal className="shop-toolbar">
            <span className="shop-toolbar__count">
              Showing {visibleProducts.length} of {filteredProducts.length} results
            </span>
            <label className="shop-toolbar__sort">
              <span>Sort by</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="default">Default sorting</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </label>
          </ScrollReveal>

          {loading ? (
            <div className="empty-state">
              <p>Loading products…</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="empty-state">
              <p>No products match these filters.</p>
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product, index) => {
                const inCart = isInCart(product.id);
                const wishlisted = isWishlisted(product.id);
                const badgeText =
                  product.dealActive && product.activePromo
                    ? (product.activePromo.type === 'banner' && product.activePromo.data.discountTag 
                        ? product.activePromo.data.discountTag 
                        : (product.activePromo.data.discountType === 'FLAT' 
                            ? `₹${product.activePromo.data.discountValue} OFF` 
                            : `${product.activePromo.data.discountValue || product.activePromo.data.discountPercentage}% OFF`))
                    : product.tag === "Best Sellers"
                    ? "BESTSELLER"
                    : product.tag === "Top Rated"
                    ? "TOP RATED"
                    : product.tag === "New Arrivals"
                    ? "NEW"
                    : product.oldPrice
                    ? `-${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%`
                    : null;

                return (
                  <ProductCard
                    key={product.id}
                    className="animate-card"
                    style={{ "--index": index }}
                    dataReveal={true}
                    product={product}
                    badge={badgeText}
                    onProductClick={onProductClick}
                    onAddToCart={onAddToCart}
                    onAddToWishlist={onAddToWishlist}
                    isInCart={inCart}
                    isWishlisted={wishlisted}
                    onViewCart={() => onNavigate && onNavigate("cart")}
                  />
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination__nav"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={"pagination__page" + (n === currentPage ? " is-active" : "")}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="pagination__nav"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}