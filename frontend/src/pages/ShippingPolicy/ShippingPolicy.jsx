import React, { useEffect } from "react";
import "../PrivacyPolicy/Policy.css";

export default function ShippingPolicy() {
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
            {"Shipping Policy".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Shipping Policy</span>
          </nav>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="policy-content">
        <h2>Shipping Policy</h2>

        <p>
          Thank you for choosing Anyra's Trove. We specialize in handcrafted copper kitchenware,
          brass kitchenware, handicrafts, and pooja articles, and we are committed to delivering
          your products safely, securely, and on time. Please review our shipping practices below.
        </p>

        <h3>1. Order Processing Time</h3>
        <p>
          All orders are processed and packed within <strong>1 to 3 business days</strong> of
          payment confirmation. Since many of our copper and brass items are handmade or hand-finished
          by skilled artisans, some products may require additional processing time, which will be
          communicated at the time of order. Orders are not processed or shipped on Sundays or public holidays.
        </p>

        <h3>2. Shipping Rates & Delivery Estimates</h3>
        <p>
          Shipping charges are calculated based on the weight, dimensions, and delivery location of
          your order, and will be displayed at checkout before payment. Estimated delivery time is
          <strong> 4 to 8 business days</strong> within India, depending on your location. Delivery
          timelines may occasionally be affected by courier delays, weather conditions, or regional
          restrictions beyond our control.
        </p>

        <h3>3. Packaging</h3>
        <p>
          Copper and brass items are delicate and prone to scratches or dents if handled roughly.
          To ensure your products reach you in perfect condition, we use multi-layer protective
          packaging, including bubble wrap and sturdy corrugated boxes, for all kitchenware and
          handicraft items.
        </p>

        <h3>4. Shipment Confirmation & Order Tracking</h3>
        <p>
          You will receive a Shipment Confirmation email or SMS containing your tracking number
          once your order has been dispatched. The tracking link will become active within 24 hours
          and can be used to monitor your order's delivery status in real time.
        </p>

        <h3>5. Serviceable Locations</h3>
        <p>
          We currently ship to most pin codes across India through our trusted courier partners.
          In rare cases where a pin code is not serviceable, our support team will contact you to
          arrange an alternate delivery address or resolve the issue.
        </p>

        <h3>6. Damages in Transit</h3>
        <p>
          While we take utmost care in packaging, if your product arrives damaged or broken during
          shipping, please contact us within <strong>48 hours</strong> of delivery along with photos
          of the damaged product and packaging. We will arrange a replacement or refund after
          verification, as per our Return & Refund Policy.
        </p>

        <h3>7. Delayed or Lost Shipments</h3>
        <p>
          If your order has not arrived within the estimated delivery window, please reach out to
          us with your order number so we can track the shipment with our courier partner and
          resolve the issue promptly.
        </p>

        <h3>8. International Shipping</h3>
        <p>
          At this time, we ship only within India. We plan to expand our shipping services to
          international locations in the future, and any updates will be posted on this page.
        </p>

        <h3>9. Contact Us</h3>
        <p>
          For any questions regarding your shipment or this Shipping Policy, please contact us at:<br />
          <strong>Email:</strong> nikitha9320@gmail.com <br />
          <strong>Phone:</strong> +91 96204 39696
        </p>
      </div>
    </div>
  );
}