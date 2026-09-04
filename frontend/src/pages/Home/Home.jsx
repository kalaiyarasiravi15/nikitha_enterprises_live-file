import React, { useState, useEffect } from 'react';
import './Home.css';
import Banner from '../../components/Banner/Banner';
import BannerFeatures from '../../components/BannerFeatures/BannerFeatures';
import BannerFeaturesSecond from '../../components/BannerFeaturesSecond/BannerFeaturesSecond';
import Categories from '../../components/Categories/Categories';
import HomeSidebar from '../../components/HomeSidebar/HomeSidebar';
import OfferBanners from '../../components/OfferBanners/OfferBanners';
import DealOfTheDay from '../../components/DealOfDay/Dealofday';
import { ProductCarousel } from '../../components/ProductSliders/ProductSliders';
import { API, formatBackendProduct } from '../../config';

function Home({ activeDeals, activeOfferBanners, onProductClick, onAddToCart, onBuyNow, onAddToWishlist, wishlist, cart = [], onCategoryClick, onShopClick, onViewCart, onNavigate }) {
  const [collections, setCollections] = useState({
    bestSellers: [],
    newArrivals: [],
    topRated: []
  });

  useEffect(() => {
    fetch(`${API}/collections/all`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        const best = Array.isArray(data.bestSellers) 
          ? data.bestSellers.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        const newArr = Array.isArray(data.newArrivals) 
          ? data.newArrivals.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        const top = Array.isArray(data.topRated) 
          ? data.topRated.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        setCollections({ bestSellers: best, newArrivals: newArr, topRated: top });
      })
      .catch(err => console.error('Error loading collections in Home:', err));
  }, []);

  const handleShopRedirect = onShopClick || (() => onNavigate && onNavigate('shop'));

  return (
    <div className="home-container">
      
      {/* Hero banner (Full Width) */}
      <Banner onShopClick={onShopClick} />

      {/* Feature strip below banner (Full Width) */}
      <BannerFeatures />

      {/* Offer Banners (Full Width) */}
      <OfferBanners banners={activeOfferBanners} onNavigate={onNavigate || onShopClick} onProductClick={onProductClick} />

      {/* ═══ TWO-COLUMN GRID (Categories + Best Sellers Slider | Sidebar) ═══ */}
      <div className="home-layout">

        {/* LEFT — Main content column */}
        <main className="home-main">
          {/* Shop By Category */}
          <Categories onCategoryClick={onCategoryClick} />

          {/* Best Sellers Slider */}
          <ProductCarousel
            title="Best Sellers"
            products={collections.bestSellers}
            badge="BESTSELLER"
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            isBuyNow={true}
            onAddToWishlist={onAddToWishlist}
            wishlist={wishlist}
            cart={cart}
            onViewCart={onViewCart}
            onShopClick={handleShopRedirect}
          />
        </main>

        {/* RIGHT — Sidebar column (Desktop Only) */}
        <aside className="home-sidebar desktop-only-sidebar">
          <HomeSidebar onNavigate={onNavigate || onShopClick} showNewsletter={true} />
        </aside>

      </div>

      {/* ═══ FULL-WIDTH BOTTOM FEATURES ROW (Desktop Only) ═══ */}
      <div className="home-bottom-features-strip desktop-only-features">
        <BannerFeaturesSecond />
      </div>

      {/* Deal of the Day section (above New Arrivals) */}
      <DealOfTheDay deals={activeDeals} onProductClick={onProductClick} />

      {/* New Arrivals & Top Rated Sliders (below Deal of the Day) */}
      <div className="home-product-sliders" style={{ marginTop: '20px' }}>
        <ProductCarousel
          title="New Arrivals"
          products={collections.newArrivals}
          badge="NEW ARRIVAL"
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
          isBuyNow={true}
          onAddToWishlist={onAddToWishlist}
          wishlist={wishlist}
          cart={cart}
          onViewCart={onViewCart}
          onShopClick={handleShopRedirect}
        />
        <ProductCarousel
          title="Top Rated"
          products={collections.topRated}
          badge="TOP RATED"
          onProductClick={onProductClick}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
          isBuyNow={true}
          onAddToWishlist={onAddToWishlist}
          wishlist={wishlist}
          cart={cart}
          onViewCart={onViewCart}
          onShopClick={handleShopRedirect}
        />
      </div>

      {/* ═══ MOBILE ONLY: Positioned at end of Top Rated section ═══ */}
      <div className="mobile-only-bottom-section">
        <aside className="home-sidebar mobile-end-sidebar">
          <HomeSidebar onNavigate={onNavigate || onShopClick} showNewsletter={true} />
        </aside>
        <div className="home-bottom-features-strip mobile-end-features">
          <BannerFeaturesSecond />
        </div>
      </div>

    </div>
  );
}

export default Home;
