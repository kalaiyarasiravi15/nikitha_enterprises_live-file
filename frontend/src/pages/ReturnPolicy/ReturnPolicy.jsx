import React, { useEffect } from "react";
import "../PrivacyPolicy/Policy.css";

export default function ReturnPolicy() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="policy-page">
      {/* ══ HERO ══ */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">
            {"Return Policy".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Return & Refund Policy</span>
          </nav>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="policy-content">
        <h2>Return and Refund Policy</h2>

        <p>
          At Anyra's Trove, we take pride in the quality of our handcrafted copper kitchenware,
          brass kitchenware, handicrafts, and pooja articles. We want you to be completely satisfied
          with your purchase. If something isn't right, we're here to help.
        </p>

        <h3>1. Return Eligibility</h3>
        <p>
          You may request a return within <strong>7 days</strong> of receiving your order. To be
          eligible for a return, the item must be:
        </p>
        <ul>
          <li>Unused, unwashed, and not tarnished or altered in any way.</li>
          <li>In its original condition, with all tags, packaging, and accessories intact.</li>
          <li>Accompanied by the original invoice or order confirmation.</li>
        </ul>
        <p>
          Please note that handcrafted copper and brass items may have minor natural variations in
          finish, hammering, or engraving, as they are individually made by skilled artisans. Such
          variations are a hallmark of handmade products and are not considered defects.
        </p>

        <h3>2. Non-Returnable Items</h3>
        <p>The following items are not eligible for return or exchange:</p>
        <ul>
          <li>Customized, engraved, or personalized products.</li>
          <li>Pooja articles that have been used or come into contact with food, oil, or kumkum/turmeric.</li>
          <li>Items purchased during clearance or final sale promotions.</li>
          <li>Products damaged due to misuse, mishandling, or normal wear and tear after delivery.</li>
        </ul>

        <h3>3. How to Request a Return</h3>
        <p>
          To initiate a return, please contact our support team with your order number, product
          details, and photos of the item within 7 days of delivery. Once your request is reviewed
          and approved, we will share instructions for shipping the item back to us.
        </p>

        <h3>4. Refunds</h3>
        <p>
          Once we receive and inspect the returned item, we will notify you of the approval status
          of your refund. If approved, the refund will be processed to your original method of
          payment within <strong>5 to 7 business days</strong>. Please note that it may take
          additional time for the amount to reflect in your account, depending on your bank or
          card issuer.
        </p>
        <p>
          Shipping charges, if any, are non-refundable, and return shipping costs may be borne by
          the customer unless the return is due to a damaged, defective, or incorrect item sent by us.
        </p>

        <h3>5. Exchanges</h3>
        <p>
          If you would like to exchange a product for a different size, design, or item, please
          contact our support team within 7 days of delivery. Exchanges are subject to product
          availability.
        </p>

        <h3>6. Damaged, Defective, or Incorrect Items</h3>
        <p>
          Please inspect your order as soon as it is delivered. If you receive a damaged, defective,
          or incorrect item, contact us within <strong>48 hours</strong> of delivery along with clear
          photos of the product and packaging. Once verified, we will offer a free replacement or a
          full refund, at no additional cost to you.
        </p>

        <h3>7. Contact Us</h3>
        <p>
          For any questions regarding returns, exchanges, or refunds, please reach out to us at:<br />
          <strong>Email:</strong> nikitha9320@gmail.com <br />
          <strong>Phone:</strong> +91 96204 39696
        </p>
      </div>
    </div>
  );
}