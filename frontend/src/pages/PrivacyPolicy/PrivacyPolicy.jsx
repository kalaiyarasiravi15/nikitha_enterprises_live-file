import React, { useEffect } from "react";
import "./Policy.css";

export default function PrivacyPolicy() {
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
            {"Privacy Policy".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Privacy Policy</span>
          </nav>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="policy-content">
        <h2>Privacy Policy for Anyra's Trove</h2>
        {/* <p><strong>Last Updated:</strong> [Insert Date]</p> */}

        <p>
          Anyra's Trove ("we," "our," or "us") is committed to protecting the privacy of our customers.
          This Privacy Policy explains how we collect, use, store, and protect your personal information
          when you visit our website, browse our collection of copper kitchenware, brass kitchenware,
          handicrafts, and pooja articles, or place an order with us.
        </p>

        <h3>1. Information We Collect</h3>
        <p>When you interact with our website, we may collect the following:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, email address, phone number, billing and shipping address.</li>
          <li><strong>Order Information:</strong> Products purchased, order value, order history, and delivery preferences.</li>
          <li><strong>Payment Information:</strong> Payments are processed through secure third-party payment gateways. We do not store your card, UPI, or net banking credentials on our servers.</li>
          <li><strong>Technical Information:</strong> IP address, browser type, device information, and pages visited, collected via cookies and similar technologies.</li>
          <li><strong>Communication Data:</strong> Any information you share when contacting our customer support via email, phone, or WhatsApp.</li>
        </ul>

        <h3>2. How We Use Your Information</h3>
        <p>We use the collected information to:</p>
        <ul>
          <li>Process, pack, and deliver your orders for copper kitchenware, brass kitchenware, handicrafts, and pooja items.</li>
          <li>Send order confirmations, shipping updates, and delivery notifications.</li>
          <li>Respond to customer support queries, returns, and exchange requests.</li>
          <li>Send promotional offers, discounts, and newsletters (only if you have opted in).</li>
          <li>Improve our website functionality, product catalogue, and overall shopping experience.</li>
          <li>Prevent fraudulent transactions and ensure website security.</li>
        </ul>

        <h3>3. Sharing of Information</h3>
        <p>We do not sell or rent your personal information to third parties. We may share your information only with:</p>
        <ul>
          <li>Courier and logistics partners, to enable delivery of your orders.</li>
          <li>Payment gateway providers, to process transactions securely.</li>
          <li>Service providers who assist us in website hosting, analytics, or marketing, under strict confidentiality obligations.</li>
          <li>Government or legal authorities, only if required by law.</li>
        </ul>

        <h3>4. Cookies</h3>
        <p>
          Our website uses cookies to remember your cart items, preferences, and to analyze site traffic.
          You can choose to disable cookies through your browser settings, though this may affect certain
          website features such as cart functionality.
        </p>

        <h3>5. Data Security</h3>
        <p>
          We use industry-standard security measures, including encrypted checkout, to protect your personal
          and payment information. However, no method of transmission over the internet is 100% secure, and
          we cannot guarantee absolute security.
        </p>

        <h3>6. Data Retention</h3>
        <p>
          We retain your personal information only for as long as necessary to fulfill orders, provide
          customer support, comply with legal obligations, and resolve disputes.
        </p>

        <h3>7. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access, update, or correct your personal information.</li>
          <li>Request deletion of your account and personal data.</li>
          <li>Opt out of promotional emails or SMS at any time.</li>
        </ul>

        <h3>8. Children's Privacy</h3>
        <p>
          Our website is not intended for individuals under the age of 18. We do not knowingly collect
          personal information from children.
        </p>

        <h3>9. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy periodically to reflect changes in our practices. Any updates
          will be posted on this page with a revised "Last Updated" date.
        </p>

        <h3>10. Contact Us</h3>
        <p>
          If you have any questions or concerns about this Privacy Policy or how your data is handled,
          please reach out to us: <br />
          <strong>Email:</strong> nikitha9320@gmail.com <br />
          <strong>Phone:</strong> +91 96204 39696
        </p>
      </div>
    </div>
  );
}