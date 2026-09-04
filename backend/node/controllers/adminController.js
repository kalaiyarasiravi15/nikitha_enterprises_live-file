const Admin    = require('../models/Admin');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { buildThemedEmailHtml } = require('../utils/emailTheme');

const otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. REGISTER

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Admin.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Admin already exists!' });

    const hashed = await bcrypt.hash(password, 10);
    
    
    await Admin.create({ 
      name: name?.trim() || 'Admin', 
      email: email.toLowerCase(), 
      password: hashed 
    });

    res.status(201).json({ message: 'Admin Registered Successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 1.5. SEED DEFAULT ADMIN
exports.seedDefaultAdmin = async (req, res) => {
  try {
    const count = await Admin.count();
    if (count > 0) {
      const existing = await Admin.findAll({ attributes: ['id', 'email', 'name'] });
      return res.json({ message: 'Admin accounts already exist', admins: existing });
    }
    const hashed = await bcrypt.hash('admin123', 10);
    const newAdmin = await Admin.create({
      name: 'Super Admin',
      email: 'nikitha9320@gmail.com',
      password: hashed
    });
    res.json({ message: 'Default Admin Created Successfully!', email: 'nikitha9320@gmail.com', password: 'admin123' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ where: { email } });

    if (!admin || !(await bcrypt.compare(password, admin.password)))
      return res.status(401).json({ message: 'Invalid Email or Password' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message:   'Welcome Back!',
      token,
      adminId:   admin.id,
      adminName: admin.name || 'Admin',
      role:      admin.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. GET ALL ADMINS
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.findAll({ attributes: { exclude: ['password'] } });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. GET ADMIN PROFILE
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. UPDATE ADMIN
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const { name, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (password && password.trim())
      updateData.password = await bcrypt.hash(password, 10);

    await admin.update(updateData);
    res.json({ message: 'Admin updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. DELETE ADMIN
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found!' });
    await admin.destroy();
    res.json({ message: 'Admin account deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(404).json({ message: 'Admin email not found!' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

    await transporter.sendMail({
      from: `"Anyra's Trove Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Admin Password Reset OTP',
      html: buildThemedEmailHtml({
        title: "Anyra's Trove Admin Panel",
        intro: 'Use the OTP below to reset your admin password.',
        body: `<h2 style="margin:0 0 10px;font-size:20px;color:#111827;">Your OTP</h2><h1 style="letter-spacing:8px;color:#2d5a1b;margin:0 0 8px;">${otp}</h1><p style="margin:0;color:#374151">This OTP is valid for <strong>10 minutes</strong>.</p>`,
        footer: 'If you did not request this reset, please ignore this email.',
        highlight: 'Admin Access'
      }),
    });

    res.json({ message: 'OTP sent to admin email!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 8. VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore[email];
    if (!record) return res.status(400).json({ message: 'OTP not found or expired!' });
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ message: 'OTP expired!' });
    }
    if (record.otp !== otp) return res.status(400).json({ message: 'Invalid OTP!' });
    res.json({ message: 'OTP verified!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 9. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = otpStore[email];
    if (!record || record.otp !== otp)
      return res.status(400).json({ message: 'Invalid or expired OTP!' });
    if (Date.now() > record.expiresAt)
      return res.status(400).json({ message: 'OTP expired!' });
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters!' });

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(404).json({ message: 'Admin not found!' });

    await admin.update({ password: await bcrypt.hash(newPassword, 10) });
    delete otpStore[email];
    res.json({ message: 'Admin password updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
