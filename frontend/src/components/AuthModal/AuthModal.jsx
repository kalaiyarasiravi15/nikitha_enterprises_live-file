import React, { useState, useEffect } from "react";
import "./AuthModal.css";
import { API } from "../../config";
import { toast } from "react-toastify";

/* ── Signature seal emblem (replaces the old side panel branding) ── */
const SealEmblem = () => (
  <div className="auth-seal">
    <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 27V12.5C9 11.12 10.12 10 11.5 10H24.5C25.88 10 27 11.12 27 12.5V27" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 27H29" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="14" y="17" width="8" height="7" rx="1" stroke="#fff" strokeWidth="1.6"/>
      <path d="M14 13h3M19 13h3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  </div>
);

/* ── Step progress dots for Forgot Password ── */
const StepDots = ({ total, current }) => (
  <div className="auth-step-dots">
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} className={`auth-step-dot ${i <= current ? "is-done" : ""}`} />
    ))}
  </div>
);

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = "login" }) {
  // Modes: "login" | "register" | "forgot"
  const [authMode, setAuthMode] = useState(initialMode);
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter email, 2 = enter otp, 3 = new password
  const [registerStep, setRegisterStep] = useState(1); // 1 = details, 2 = OTP, 3 = password

  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [registerOtp, setRegisterOtp] = useState("");

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setForgotStep(1);
      setRegisterStep(1);
      setError("");
      setSuccessMsg("");
      setForgotEmail("");
      setForgotOtp("");
      setNewPassword("");
      setRegisterOtp("");
      setShowPwd(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const switchMode = (mode) => {
    setAuthMode(mode);
    setForgotStep(1);
    setRegisterStep(1);
    setError("");
    setSuccessMsg("");
    setForgotEmail("");
    setForgotOtp("");
    setNewPassword("");
    setRegisterOtp("");
    setShowPwd(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  /* ─── Client Validation helper ─── */
  const validateName = (name) => /^[a-zA-Z\s]+$/.test(name.trim());
  const validatePhone = (phone) => /^\d{10}$/.test(phone.trim());
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validatePassword = (pwd) => /^[a-zA-Z0-9]{6}$/.test(pwd);

  /* ─── Login ─── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Please enter email and password.");
      return;
    }
    if (!validatePassword(formData.password)) {
      setError("Password must be exactly 6 letters or numbers.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim(), password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }
      localStorage.setItem("at_token", data.token);
      localStorage.setItem("at_customer", JSON.stringify(data.customer));
      onAuthSuccess({ ...data.customer, token: data.token });
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Registration: details → email OTP → password ─── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!validateName(formData.name)) {
      setError("Full name must contain only letters and spaces.");
      return;
    }
    if (!validatePhone(formData.phone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/send-register-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed.");
        if (data.message && data.message.toLowerCase().includes("already registered")) {
          setSuccessMsg("Redirecting to Sign In...");
          setTimeout(() => {
            setAuthMode("login");
            setError("");
            setSuccessMsg("");
          }, 2000);
        }
        return;
      }
      setSuccessMsg("Verification code sent. It is valid for 10 minutes.");
      setRegisterStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(registerOtp)) return setError("Enter the 6-digit code from your email.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/verify-register-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim(), otp: registerOtp }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "OTP verification failed.");
      setSuccessMsg("Email verified. Create your password to finish registration.");
      setRegisterStep(3);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (!validatePassword(formData.password)) return setError("Password must be exactly 6 letters or numbers.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name.trim(), phone: formData.phone.trim(), email: formData.email.trim(), password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Registration failed.");
      localStorage.setItem("at_token", data.token);
      localStorage.setItem("at_customer", JSON.stringify(data.customer));
      onAuthSuccess({ ...data.customer, token: data.token });
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  /* ─── Forgot Password Step 1: Send OTP ─── */
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!forgotEmail.trim() || !validateEmail(forgotEmail)) {
      setError("Please enter a valid registered email.");
      toast.error("Please enter a valid registered email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Email address not found.");
        toast.error(data.message || "Email address not found.");
        return;
      }
      toast.success("OTP sent to your email successfully!");
      setSuccessMsg("OTP sent to your email successfully!");
      setForgotStep(2);
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Forgot Password Step 2: Verify OTP ─── */
  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Incorrect OTP. Please try again.");
        toast.error(data.message || "Incorrect OTP. Please try again.");
        return;
      }
      toast.success("OTP verified successfully!");
      setSuccessMsg("OTP verified successfully! Now create your new password.");
      setForgotStep(3);
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Forgot Password Step 3: Reset Password ─── */
  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!newPassword.trim() || !validatePassword(newPassword)) {
      setError("New password must be exactly 6 letters or numbers.");
      toast.error("New password must be exactly 6 letters or numbers.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/customers/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Password reset failed. Please try again.");
        toast.error(data.message || "Password reset failed.");
        return;
      }
      toast.success("Password reset successfully! You can now log in.");
      setSuccessMsg("Password reset successfully! You can now log in.");
      setTimeout(() => {
        switchMode("login");
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived Headings ── */
  const getPanelInfo = () => {
    if (authMode === "login") {
      return {
        title: "Welcome back",
        subtitle: "Sign in to access your orders, wishlist & more."
      };
    } else if (authMode === "register") {
      if (registerStep === 2) return { title: "Verify your email", subtitle: `Enter the 6-digit code sent to ${formData.email}. It expires in 10 minutes.` };
      if (registerStep === 3) return { title: "Create password", subtitle: "Choose exactly 6 letters or numbers to complete your account." };
      return {
        title: "Create account",
        subtitle: "Join Anyra's Trove for an exclusive kitchen experience."
      };
    } else {
      // Forgot Password Step Info
      if (forgotStep === 1) {
        return {
          title: "Reset password",
          subtitle: "Enter your registered email to receive a password reset code."
        };
      } else if (forgotStep === 2) {
        return {
          title: "Verify code",
          subtitle: `Enter the 6-digit OTP code sent to ${forgotEmail}`
        };
      } else {
        return {
          title: "New password",
          subtitle: "Create a new 6-character secure password for your account."
        };
      }
    }
  };

  const { title: panelTitle, subtitle: panelSubtitle } = getPanelInfo();

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ── Header: seal + wordmark ── */}
        <div className="auth-brand-row">
          <SealEmblem />
          <span className="auth-brand-name">Anyra&rsquo;s Trove</span>
        </div>

        {/* Mode tabs */}
        {authMode !== "forgot" ? (
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${authMode === "login" ? "is-active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${authMode === "register" ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>
        ) : (
          <button type="button" className="auth-back-to-login" onClick={() => switchMode("login")}>
            ← Back to Login
          </button>
        )}

        {/* Panel header */}
        <div className="auth-panel-header">
          <h1 className="auth-panel-title">{panelTitle}</h1>
          <p className="auth-panel-subtitle">{panelSubtitle}</p>
          {authMode === "forgot" && <StepDots total={3} current={forgotStep - 1} />}
        </div>

        {/* Messages */}
        {error && (
          <div className="auth-error-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#c5221f" strokeWidth="1.5"/>
              <path d="M8 5v4M8 11h.01" stroke="#c5221f" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="auth-success-box">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#137333" strokeWidth="1.5"/>
              <path d="M5 8.5l2 2 4.5-4.5" stroke="#137333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {successMsg}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {authMode === "login" && (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" required />
              </div>
            </div>
            <div className="auth-field">
              <div className="auth-field-header">
                <label>Password</label>
                <button type="button" className="auth-forgot-link" onClick={() => switchMode("forgot")}>
                  Forgot Password?
                </button>
              </div>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  type={showPwd ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  maxLength={6}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Sign In"}
            </button>

            <p className="auth-switch-text">
              New here?{" "}
              <button type="button" className="auth-switch-link" onClick={() => switchMode("register")}>
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM (Direct registration, no OTP) ── */}
        {authMode === "register" && registerStep === 1 && (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <div className="auth-field-row">
              <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your name" required />
                </div>
              </div>
              <div className="auth-field">
                <label>Phone Number</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3h3l1.5 3L6 7.5c1 2 2.5 3.5 4.5 4.5L12 10.5l3 1.5v3c0 1.1-.9 2-2 2A14 14 0 011 3c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="10 digits" maxLength={10} required />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Send Email Code"}
            </button>

            <p className="auth-switch-text">
              Already a member?{" "}
              <button type="button" className="auth-switch-link" onClick={() => switchMode("login")}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── FORGOT PASSWORD STEP 1: Enter email ── */}
        {authMode === "register" && registerStep === 2 && (
          <form className="auth-form" onSubmit={handleRegisterVerifyOtp} noValidate>
            <div className="auth-field">
              <label>6-Digit Email Code</label>
              <input className="auth-otp-input" type="text" inputMode="numeric" maxLength={6}
                value={registerOtp}
                onChange={(e) => { setRegisterOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="● ● ● ● ● ●" autoFocus required />
              <span className="auth-otp-hint">The code is valid for 10 minutes.</span>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Verify Email"}
            </button>
            <button type="button" className="auth-forgot-link" disabled={loading} onClick={handleRegister}>
              Resend code
            </button>
          </form>
        )}

        {authMode === "register" && registerStep === 3 && (
          <form className="auth-form" onSubmit={handleCompleteRegistration} noValidate>
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input type={showPwd ? "text" : "password"} name="password" value={formData.password}
                  onChange={handleChange} placeholder="Exactly 6 letters/numbers" maxLength={6} autoFocus required />
                <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(v => !v)}>{showPwd ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Create Account"}
            </button>
          </form>
        )}

        {authMode === "forgot" && forgotStep === 1 && (
          <form className="auth-form" onSubmit={handleForgotSendOtp} noValidate>
            <div className="auth-field">
              <label>Registered Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Send Verification Code →"}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD STEP 2: Enter OTP ── */}
        {authMode === "forgot" && forgotStep === 2 && (
          <form className="auth-form" onSubmit={handleForgotVerifyOtp} noValidate>
            <div className="auth-field">
              <label>6-Digit OTP</label>
              <input
                className="auth-otp-input"
                type="text"
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => { setForgotOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="● ● ● ● ● ●"
                autoFocus
                required
              />
              <span className="auth-otp-hint">Check your email inbox for the reset code.</span>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Verify Code"}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD STEP 3: Set new password ── */}
        {authMode === "forgot" && forgotStep === 3 && (
          <form className="auth-form" onSubmit={handleForgotResetPassword} noValidate>
            <div className="auth-field">
              <label>New Password</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="Exactly 6 letters/numbers"
                  maxLength={6}
                  required
                />
                <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Reset & Save Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
