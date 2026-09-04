import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API } from "../../config";
import {
  MdLocationOn,
  MdPhone,
  MdEmail,
  MdAccessTime,
  MdSend,
  MdCheckCircle,
  MdPerson,
  MdSubject,
  MdMessage,
} from "react-icons/md";
import {
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
  FaSms,
  FaMapMarkerAlt,
} from "react-icons/fa";
import "./Contact.css";
import { AnimatedPageTitle } from "../../components/Animation/Animation";

/* ── Animated hero title – letter by letter ── */
function AnimTitle({ text }) {
  return (
    <h1 className="anim-title" aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="anim-letter"
          style={{ animationDelay: `${0.05 * i + 0.2}s` }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </h1>
  );
}

/* ── Bordered info box card ── */
function InfoBox({ icon: Icon, iconColor, label, children }) {
  return (
    <div className="info-box">
      <div className="info-box__icon-wrap" style={{ "--ic": iconColor }}>
        <Icon size={22} />
      </div>
      <div className="info-box__body">
        <span className="info-box__label">{label}</span>
        <div className="info-box__content">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [focused, setFocused] = useState(null);
  const bodyRef = useRef(null);
  
  const [contactData, setContactData] = useState({
    phone: '+91 96204 39696',
    whatsapp: '919620439696',
    email: 'nikitha9320@gmail.com',
    sms: '+914423456789',
    addressLine1: '11, 1st Main Rd, near CBD Hotel, ATR Layout',
    addressLine2: 'Bengaluru, Karnataka – 560017, India',
    businessHours: 'Mon – Sat: 9:00 AM – 6:00 PM',
    mapIframe: "https://maps.google.com/maps?q=Anyra%27s%20Trove%2C%2011%2C%201st%20Main%20Rd%2C%20near%20CBD%20Hotel%2C%20ATR%20Layout%2C%20Bengaluru%2C%20Karnataka%20560017&t=&z=16&ie=UTF8&iwloc=&output=embed"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/settings`);
        if (res.data && res.data.success && res.data.data.CONTACT_PAGE_DATA) {
          try {
            const parsed = JSON.parse(res.data.data.CONTACT_PAGE_DATA);
            setContactData(prev => ({ ...prev, ...parsed }));
          } catch (e) { console.error("Error parsing CONTACT_PAGE_DATA", e); }
        }
      } catch (err) {
        console.error('Failed to load contact settings.', err);
      }
    };
    fetchSettings();
  }, []);

  /* scroll-reveal */
  useEffect(() => {
    if (!bodyRef.current) return;
    const els = bodyRef.current.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Validation function for a single field
  const validateField = (name, value) => {
    const val = (value || "").trim();
    
    if (name === "name") {
      if (!val) return "Full name is required.";
      if (!/^[a-zA-Z\s]+$/.test(val)) return "Full name can contain only letters and spaces.";
      if (val.length < 2) return "Full name must be at least 2 characters.";
      if (val.length > 50) return "Full name cannot exceed 50 characters.";
    }

    if (name === "email") {
      if (!val) return "Email address is required.";
      if (!val.includes("@")) return "Email must include '@'.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Please enter a valid email address.";
    }

    if (name === "phone") {
      if (!val) return "Phone number is required.";
      if (!/^\d+$/.test(val)) return "Phone number must contain only numbers.";
      if (val.length !== 10) return "Phone number must be exactly 10 digits.";
    }

    if (name === "subject") {
      if (!val) return "Subject is required.";
    }

    if (name === "message") {
      if (!val) return "Message is required.";
      if (val.length > 500) return "Message cannot exceed 500 characters.";
    }

    return null;
  };

  // Run full validation on submit
  const validateAll = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) {
        newErrors[key] = err;
      }
    });
    return newErrors;
  };

  const handleChange = (field) => {
    return (e) => {
      let val = e.target.value;
      if (field === "name") {
        val = val.replace(/[^a-zA-Z\s]/g, "");
      }
      if (field === "phone") {
        val = val.replace(/\D/g, "").slice(0, 10);
      }
      setFormData((prev) => ({ ...prev, [field]: val }));

      // Validate live if the field has been touched
      if (touched[field]) {
        const err = validateField(field, val);
        setErrors((prev) => {
          const updated = { ...prev };
          if (err) updated[field] = err;
          else delete updated[field];
          return updated;
        });
      }
    };
  };

  const handleBlur = (field) => {
    return () => {
      setFocused(null);
      setTouched((prev) => ({ ...prev, [field]: true }));
      const err = validateField(field, formData[field]);
      setErrors((prev) => {
        const updated = { ...prev };
        if (err) updated[field] = err;
        else delete updated[field];
        return updated;
      });
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill all fields properly before submitting.");
      return;
    }

    setErrors({});
    try {
      const response = await axios.post(`${API}/contact/send`, formData);
      if (response.status === 201 || response.status === 200) {
        toast.success("Message sent successfully!");
        setSubmitted(true);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
        setTouched({});
        setTimeout(() => {
          setSubmitted(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message. Please try again later.");
    }
  };

  // Helper to determine border status class
  const getFieldClass = (field) => {
    let classes = `form-field ${focused === field ? "is-focused" : ""}`;
    if (touched[field]) {
      if (errors[field]) {
        classes += " has-error";
      } else {
        // If it's valid and has value (or it's valid and optional/empty)
        if (formData[field] && formData[field].trim() !== "") {
          classes += " is-valid";
        }
      }
    }
    return classes;
  };

  return (
    <div className="contact-page">

      {/* ── HERO ── */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">
            {"Contact Us".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Contact</span>
          </nav>
        </div>
      </div>

      <div className="contact-chips">
        <a href={`tel:${contactData.phone}`} className="chip chip--phone">
          <FaPhoneAlt size={13} /> Call Us
        </a>
        <a
          href={`https://wa.me/${contactData.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="chip chip--wa"
        >
          <FaWhatsapp size={15} /> WhatsApp
        </a>
        <a href={`mailto:${contactData.email}`} className="chip chip--mail">
          <FaEnvelope size={13} /> Email
        </a>
        <a href={`sms:${contactData.sms}`} className="chip chip--sms">
          <FaSms size={15} /> SMS
        </a>
      </div>

      {/* ── BODY ── */}
      <div className="contact-body" ref={bodyRef}>
        <div className="contact-container">

          {/* LEFT – info boxes */}
          <div className="contact-info reveal reveal--left">
            <div className="sec-head">
              <h2>Get In Touch</h2>
              <div className="sec-bar" />
            </div>

            <div className="info-boxes">
              <InfoBox icon={MdLocationOn} iconColor="#2d5a1b" label="Store Location">
                <p>{contactData.addressLine1}</p>
                <p>{contactData.addressLine2}</p>
              </InfoBox>

              <InfoBox icon={MdPhone} iconColor="#4CAF50" label="Call Us">
                <p>{contactData.phone}</p>
                <p className="sub">{contactData.businessHours}</p>
              </InfoBox>

              <InfoBox icon={FaWhatsapp} iconColor="#25D366" label="WhatsApp">
                <p>+{contactData.whatsapp}</p>
                <p className="sub">Quick replies within 30 mins</p>
              </InfoBox>

              <InfoBox icon={MdEmail} iconColor="#F44336" label="Email Us">
                <p>{contactData.email}</p>
              </InfoBox>

              <InfoBox icon={MdAccessTime} iconColor="#7c3aed" label="Business Hours">
                {contactData.businessHours.split(',').map((line, i) => (
                  <p key={i} className={i === 1 ? "sub" : ""}>{line.trim()}</p>
                ))}
              </InfoBox>
            </div>
          </div>

          {/* RIGHT – form */}
          <div className="contact-form-wrapper reveal reveal--right">
            <div className="sec-head">
              <h2>Send A Message</h2>
              <div className="sec-bar" />
            </div>

            {submitted ? (
              <div className="form-success" role="alert">
                <MdCheckCircle size={30} className="success-icon" />
                <div>
                  <strong>Message sent!</strong>
                  <p>
                    Thanks! We've received your message and will reply within one business day.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form" noValidate>

                {/* Name */}
                <div className={getFieldClass("name")}>
                  <label htmlFor="f-name">
                    <MdPerson size={14} /> Full Name <span className="req">*</span>
                  </label>
                  <div className="field-inner">
                    <input
                      id="f-name"
                      type="text"
                      placeholder="e.g. John Doe (min 3, max 30 chars)"
                      value={formData.name}
                      onChange={handleChange("name")}
                      onFocus={() => setFocused("name")}
                      onBlur={handleBlur("name")}
                    />
                  </div>
                  {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                {/* Email */}
                <div className={getFieldClass("email")}>
                  <label htmlFor="f-email">
                    <MdEmail size={14} /> Email Address <span className="req">*</span>
                  </label>
                  <div className="field-inner">
                    <input
                      id="f-email"
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={formData.email}
                      onChange={handleChange("email")}
                      onFocus={() => setFocused("email")}
                      onBlur={handleBlur("email")}
                    />
                  </div>
                  {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
                </div>

                {/* Phone */}
                <div className={getFieldClass("phone")}>
                  <label htmlFor="f-phone">
                    <MdPhone size={14} /> Phone Number <span className="req">*</span>
                  </label>
                  <div className="field-inner">
                    <input
                      id="f-phone"
                      type="tel"
                      placeholder="e.g. 9876543210 (10 digits)"
                      value={formData.phone}
                      onChange={handleChange("phone")}
                      onFocus={() => setFocused("phone")}
                      onBlur={handleBlur("phone")}
                    />
                  </div>
                  {touched.phone && errors.phone && <span className="field-error">{errors.phone}</span>}
                </div>

                {/* Subject */}
                <div className={getFieldClass("subject")}>
                  <label htmlFor="f-subject">
                    <MdSubject size={14} /> Subject <span className="req">*</span>
                  </label>
                  <div className="field-inner">
                    <input
                      id="f-subject"
                      type="text"
                      placeholder="e.g. Bulk Order Inquiry"
                      value={formData.subject}
                      onChange={handleChange("subject")}
                      onFocus={() => setFocused("subject")}
                      onBlur={handleBlur("subject")}
                    />
                  </div>
                  {touched.subject && errors.subject && <span className="field-error">{errors.subject}</span>}
                </div>

                {/* Message */}
                <div className={getFieldClass("message")}>
                  <label htmlFor="f-message">
                    <MdMessage size={14} /> Message <span className="req">*</span>
                  </label>
                  <div className="field-inner">
                    <textarea
                      id="f-message"
                      rows="5"
                      placeholder="Write your message here… (max 300 chars)"
                      value={formData.message}
                      onChange={handleChange("message")}
                      onFocus={() => setFocused("message")}
                      onBlur={handleBlur("message")}
                    />
                  </div>
                  <div className="char-counter" style={{ textAlign: "right", fontSize: "12px", color: formData.message.length > 300 ? "#dc2626" : "#888", marginTop: "4px" }}>
                    {formData.message.length} / 300
                  </div>
                  {touched.message && errors.message && (
                    <span className="field-error">{errors.message}</span>
                  )}
                </div>

                <button type="submit" className="btn-submit">
                  <span className="btn-text">Send Message</span>
                  <MdSend size={17} className="btn-icon" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── FULL-WIDTH MAP ── */}
      <div className="map-section reveal" style={{ "--delay": "0s" }}>
        <div className="map-section__header">
          <FaMapMarkerAlt size={18} />
          <span>Find Us On The Map</span>
        </div>
        <div className="map-section__frame">
          <iframe
            title="Anyra's Trove Location"
            src={contactData.mapIframe}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="map-overlay-pin">
            <MdLocationOn size={20} />
            <span>Anyra's Trove, ATR Layout, Bengaluru</span>
          </div>
        </div>
      </div>

    </div>
  );
}
