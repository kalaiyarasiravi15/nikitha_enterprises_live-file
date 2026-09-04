import React, { useState, useRef, useEffect } from "react";
import "./MyAccount.css";
import {
  FiUser,
  FiShoppingBag,
  FiHeart,
  FiLogOut,
  FiMail,
  FiPhone,
  FiLock,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { API } from "../../config";
import { toast } from "react-toastify";
import MyOrders from "../MyOrders/MyOrders";

const SECTIONS = {
  PROFILE: "profile",
  CART: "cart",
  WISHLIST: "wishlist",
  PASSWORD: "password",
  ORDERS: "orders",
  DELETE: "delete",
};

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export default function MyAccount({
  user = null,
  cart = [],
  wishlist = [],
  onNavigate,
  onSignOut,
  onRemoveFromWishlist,
  onUpdateUser,
  initialTab = "profile",
}) {
  const [activeSection, setActiveSection] = useState(initialTab);

  const [name, setName] = useState(user ? user.name : "");
  const [phone, setPhone] = useState(user ? user.phone : "");
  const [isEditing, setIsEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (initialTab && Object.values(SECTIONS).includes(initialTab)) {
      setActiveSection(initialTab);
    }
  }, [initialTab]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required!");
      return;
    }
    try {
      const res = await fetch(`${API}/customers/update/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to update profile.");
        return;
      }
      toast.success("Profile details updated successfully!");
      setIsEditing(false);
      if (onUpdateUser) {
        onUpdateUser({ ...user, name: name.trim(), phone: phone.trim() });
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const renderAnimatedTitle = (title) => {
    return title.split("").map((char, idx) => (
      <span 
        key={idx} 
        className="hero-title__letter" 
        style={{ animationDelay: `${idx * 0.06}s` }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  if (!user) {
    return (
      <div className="account-page page-hero-offset">
        <div className="account-empty" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <p>Please log in to view your account details.</p>
          <button className="account-btn account-btn--primary" onClick={() => onNavigate && onNavigate("home")}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      {/* Page Hero Banner */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">{renderAnimatedTitle("My Account")}</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Account</span>
          </nav>
        </div>
      </div>

      <div className="account-section-container">
        <div className="account-body">
          <aside className="account-sidebar">
            <div className="account-sidebar__head">
              <div className="account-sidebar__avatar">
                <FiUser />
              </div>
              <h2>{user.name}</h2>
            </div>

            <nav className="account-nav">
              <button
                type="button"
                className={"account-nav__item" + (activeSection === SECTIONS.PROFILE ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.PROFILE)}
              >
                <FiUser />
                <span>Profile</span>
              </button>
              <button
                type="button"
                className={"account-nav__item" + (activeSection === SECTIONS.CART ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.CART)}
              >
                <FiShoppingBag />
                <span>Your Cart</span>
              </button>
              <button
                type="button"
                className={"account-nav__item" + (activeSection === SECTIONS.WISHLIST ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.WISHLIST)}
              >
                <FiHeart />
                <span>Wishlist</span>
              </button>
              <button
                type="button"
                className={"account-nav__item" + (activeSection === SECTIONS.PASSWORD ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.PASSWORD)}
              >
                <FiLock />
                <span>Update Password</span>
              </button>
              <button
                type="button"
                className="account-nav__item"
                onClick={() => onNavigate && onNavigate("orders")}
              >
                <FiShoppingBag />
                <span>Order History</span>
              </button>
              <button
                type="button"
                className={"account-nav__item account-nav__item--danger" + (activeSection === SECTIONS.DELETE ? " is-active" : "")}
                onClick={() => setActiveSection(SECTIONS.DELETE)}
              >
                <FiTrash2 />
                <span>Delete Account</span>
              </button>
            </nav>

            <button type="button" className="account-signout" onClick={onSignOut}>
              <FiLogOut />
              <span>Sign Out</span>
            </button>
          </aside>

          <main className="account-panel">
            {activeSection === SECTIONS.PROFILE && (
              <>
                <div className="account-panel__head">
                  <div className="account-panel__icon">
                    <FiUser />
                  </div>
                  <h2>Your Details</h2>
                </div>
                <div className="account-panel__divider" />

                <form className="account-form" onSubmit={handleProfileSave}>
                  <label className="account-field">
                    <span className="account-field__label">Full name</span>
                    <div className="account-field__input-wrap">
                      <FiUser className="account-field__icon" />
                      <input
                        type="text"
                        value={name}
                        disabled={!isEditing}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </label>

                  <label className="account-field">
                    <span className="account-field__label">Email address</span>
                    <div className="account-field__input-wrap">
                      <FiMail className="account-field__icon" />
                      <input type="email" value={user.email} disabled />
                    </div>
                  </label>

                  <label className="account-field">
                    <span className="account-field__label">Phone number</span>
                    <div className="account-field__input-wrap">
                      <FiPhone className="account-field__icon" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        disabled={!isEditing}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      />
                    </div>
                  </label>

                  {savedMessage && <p className="account-form__success">{savedMessage}</p>}

                  <div className="account-form__actions">
                    {isEditing ? (
                      <>
                        <button type="submit" className="account-btn account-btn--primary">
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="account-btn account-btn--ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsEditing(false);
                            setName(user.name);
                            setPhone(user.phone);
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="account-btn account-btn--primary"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditing(true);
                        }}
                      >
                        <FiEdit2 />
                        <span>Edit Details</span>
                      </button>
                    )}
                  </div>
                </form>

                <div className="account-summary-grid">
                  <div className="account-summary-card">
                    <span className="account-summary-card__label">Items in cart</span>
                    <span className="account-summary-card__value">{cart.length}</span>
                  </div>
                  <div className="account-summary-card">
                    <span className="account-summary-card__label">Cart total</span>
                    <span className="account-summary-card__value">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="account-summary-card">
                    <span className="account-summary-card__label">Wishlist items</span>
                    <span className="account-summary-card__value">{wishlist.length}</span>
                  </div>
                </div>
              </>
            )}

            {activeSection === SECTIONS.CART && (
              <>
                <div className="account-panel__head">
                  <div className="account-panel__icon">
                    <FiShoppingBag />
                  </div>
                  <h2>Your Cart</h2>
                </div>
                <div className="account-panel__divider" />

                {cart.length === 0 ? (
                  <div className="account-empty">
                    <p>Your shopping cart is empty.</p>
                    <button type="button" onClick={() => onNavigate && onNavigate("shop")}>
                      Start Shopping <span>›</span>
                    </button>
                  </div>
                ) : (
                  <div className="account-cart-panel">
                    <div className="account-cart-items">
                      {cart.map((item) => (
                        <div className="account-cart-item" key={item.id}>
                          <img src={item.thumb} alt={item.name} />
                          <div className="account-cart-item__info">
                            <p className="account-cart-item__name">{item.name}</p>
                            <p className="account-cart-item__qty">Qty: {item.quantity}</p>
                          </div>
                          <span className="account-cart-item__price">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="account-cart-summary">
                      <div className="summary-row">
                        <span>Subtotal</span>
                        <span className="summary-value">{formatPrice(cartTotal)}</span>
                      </div>
                      <button 
                        type="button" 
                        className="account-btn account-btn--primary" 
                        onClick={() => onNavigate && onNavigate("cart")}
                        style={{ width: '100%', marginTop: '24px', textAlign: 'center' }}
                      >
                        View Full Cart
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeSection === SECTIONS.WISHLIST && (
              <>
                <div className="account-panel__head">
                  <div className="account-panel__icon">
                    <FiHeart />
                  </div>
                  <h2>Your Wishlist</h2>
                </div>
                <div className="account-panel__divider" />

                {wishlist.length === 0 ? (
                  <div className="account-empty">
                    <p>You haven&apos;t added anything to your wishlist yet.</p>
                    <button type="button" onClick={() => onNavigate && onNavigate("shop")}>
                      Browse products <span>›</span>
                    </button>
                  </div>
                ) : (
                  <div className="account-wishlist-grid">
                    {wishlist.map((item) => (
                      <div className="wishlist-card" key={item.id}>
                        <img src={item.thumb} alt={item.name} />
                        <div className="wishlist-card__body">
                          <p className="wishlist-card__name">{item.name}</p>
                          <p className="wishlist-card__price">{formatPrice(item.price)}</p>
                        </div>
                        <button
                          type="button"
                          className="wishlist-card__remove"
                          onClick={() => onRemoveFromWishlist && onRemoveFromWishlist(item.id)}
                          aria-label={`Remove ${item.name} from wishlist`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === SECTIONS.PASSWORD && (
              <UpdatePasswordPanel email={user.email} />
            )}

            {activeSection === SECTIONS.DELETE && (
              <DeleteAccountPanel user={user} onDeleted={onSignOut} />
            )}


          </main>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountPanel({ user, onDeleted }) {
  const [step, setStep] = useState("intro");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestOtp = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/customers/delete/${user.id}/request-otp`, {
        method: "POST", headers: { "Authorization": `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Unable to send the confirmation code.");
      setOtp(""); setStep("otp"); toast.success("Deletion code sent to your registered email.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code from your email.");
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/customers/delete/${user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.token}` },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Account deletion could not be confirmed.");
      toast.success("Your account has been deleted.");
      onDeleted();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return <>
    <div className="account-panel__head"><div className="account-panel__icon account-panel__icon--danger"><FiTrash2 /></div><h2>Delete Account</h2></div>
    <div className="account-panel__divider" />
    <div className="account-password-block account-delete-block">
      {step === "intro" && <>
        <p className="account-password-block__copy">Deleting your account signs you out and clears your cart and wishlist. Your customer and order records remain safely available to the store for order history and support.</p>
        <button type="button" className="account-btn account-btn--danger" onClick={requestOtp} disabled={loading}>{loading ? "Sending..." : "Send Deletion Code"}</button>
      </>}
      {step === "otp" && <form className="account-form" onSubmit={confirmDelete}>
        <p className="account-password-block__copy">Enter the 6-digit code sent to <strong>{user.email}</strong>. It expires in 10 minutes.</p>
        <label className="account-field"><span className="account-field__label">Confirmation code</span><input className="account-delete-otp" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus /></label>
        <div className="account-form__actions"><button type="submit" className="account-btn account-btn--danger" disabled={loading}>{loading ? "Deleting..." : "Confirm Delete"}</button><button type="button" className="account-btn account-btn--ghost" onClick={() => setStep("intro")} disabled={loading}>Cancel</button></div>
      </form>}
      {error && <p className="account-form__error">{error}</p>}
    </div>
  </>;
}

function UpdatePasswordPanel({ email }) {
  const STEP_REQUEST = "request";
  const STEP_OTP = "otp";
  const STEP_RESET = "reset";
  const STEP_DONE = "done";

  const [step, setStep] = useState(STEP_REQUEST);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const otpRefs = useRef([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (step !== STEP_OTP) return;
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, resendTimer]);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to send OTP.");
        return;
      }
      toast.success("OTP sent to your email successfully!");
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setResendTimer(60);
      setStep(STEP_OTP);
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, val) => {
    const newVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = newVal;
    setOtp(newOtp);
    setOtpError("");

    if (newVal && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const entered = otp.join("");
    if (entered.length < 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: entered }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || "Invalid verification code.");
        toast.error(data.message || "Invalid OTP code.");
        return;
      }
      toast.success("OTP verified successfully!");
      setStep(STEP_RESET);
      setNewPassword("");
      setConfirmPassword("");
      setResetError("");
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetError("Password must be exactly 6 characters.");
      return;
    }
    const passwordRegex = /^[a-zA-Z0-9]{6}$/;
    if (!passwordRegex.test(newPassword)) {
      setResetError("Password must contain only letters and numbers (exactly 6).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.join(""),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.message || "Failed to update password.");
        toast.error(data.message || "Password update failed.");
        return;
      }
      toast.success("Password updated successfully!");
      setStep(STEP_DONE);
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="account-panel__head">
        <div className="account-panel__icon">
          <FiLock />
        </div>
        <h2>Update Password</h2>
      </div>
      <div className="account-panel__divider" />

      {step === STEP_REQUEST && (
        <div className="account-password-block">
          <p className="account-password-block__copy">
            To update your password, we will send a 6-digit verification code to your registered email address <strong>{email}</strong>. The code will be valid for 10 minutes.
          </p>
          <button 
            type="button" 
            className="account-btn account-btn--primary" 
            onClick={handleSendOtp}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </div>
      )}

      {step === STEP_OTP && (
        <div className="account-password-block">
          <p className="account-password-block__copy">
            We have sent a 6-digit verification code to <strong>{email}</strong>. Please enter the code below.
          </p>

          <form onSubmit={handleVerifyOtp}>
            <div className="otp-row">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="otp-row__box"
                  value={digit}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  style={{ width: '40px', height: '40px', margin: '0 4px', fontSize: '18px', textAlign: 'center' }}
                />
              ))}
            </div>

            {otpError && <p className="account-form__error" style={{ color: "#2d5a1b", fontSize: "13px", margin: "0 0 16px" }}>{otpError}</p>}

            <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "20px" }}>
              <button type="submit" className="account-btn account-btn--primary" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                className="account-btn account-btn--ghost"
                disabled={resendTimer > 0 || loading}
                onClick={handleSendOtp}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === STEP_RESET && (
        <div className="account-password-block">
          <p className="account-password-block__copy">
            Code verified successfully. Please enter your new password below.
          </p>

          <form className="account-form" onSubmit={handlePasswordReset}>
            <label className="account-field">
              <span className="account-field__label">New Password (6 letters or numbers)</span>
              <div className="account-field__input-wrap">
                <FiLock className="account-field__icon" />
                <input
                  type="password"
                  placeholder="6 characters exactly"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </label>

            <label className="account-field">
              <span className="account-field__label">Confirm New Password</span>
              <div className="account-field__input-wrap">
                <FiLock className="account-field__icon" />
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            </label>

            {resetError && <p className="account-form__error" style={{ color: "#2d5a1b", fontSize: "13px", margin: "0 0 16px" }}>{resetError}</p>}

            <button type="submit" className="account-btn account-btn--primary" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {step === STEP_DONE && (
        <div className="account-password-block account-password-block--center" style={{ padding: '20px 0' }}>
          <div className="auth-success__icon">✓</div>
          <h3>Password Updated!</h3>
          <p className="account-password-block__copy" style={{ marginTop: '8px' }}>
            Your password has been changed successfully. You can continue using your account.
          </p>
          <button type="button" className="account-btn account-btn--primary" onClick={() => setStep(STEP_REQUEST)}>
            Back to Account
          </button>
        </div>
      )}
    </>
  );
}
