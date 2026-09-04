const { Newsletter } = require('../models');
const nodemailer = require('nodemailer');
const { buildThemedEmailHtml } = require('../utils/emailTheme');
require('dotenv').config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendNewsletterMail = async ({ to, subject, title, intro, body, footerNote, ctaText, ctaUrl }) => {
    await transporter.sendMail({
        from: `"Nikitha Enterprises" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: buildThemedEmailHtml({
            title,
            intro,
            body,
            footer: footerNote,
            ctaText,
            ctaUrl,
            highlight: 'Newsletter'
        })
    });
};

exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const [subscriber, created] = await Newsletter.findOrCreate({
            where: { email },
            defaults: { status: 'active' }
        });

        if (!created && subscriber.status === 'unsubscribed') {
            await subscriber.update({ status: 'active' });
            await sendNewsletterMail({
                to: subscriber.email,
                subject: "You're back on our offers list!",
                title: 'Welcome back to Nikitha Enterprises',
                intro: 'You have successfully re-subscribed to our newsletter.',
                body: `
                    <p style="margin:0 0 10px">You will now receive:</p>
                    <ul style="margin:0;padding-left:20px;color:#374151">
                        <li>New deals and offers</li>
                        <li>Product launch updates</li>
                        <li>Festival and seasonal promotions</li>
                    </ul>
                `,
                footerNote: 'If you did not request this change, please contact our support team right away.',
                ctaText: 'View Latest Offers',
                ctaUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
            });
            return res.json({ success: true, message: 'Re-subscribed successfully!' });
        } else if (!created) {
            return res.json({ success: true, message: 'Email is already subscribed!' });
        }

        await sendNewsletterMail({
            to: subscriber.email,
            subject: 'Thanks for subscribing to our newsletter!',
            title: 'Welcome to Nikitha Enterprises',
            intro: 'Thanks for subscribing. We are happy to keep you updated with our latest deals and offers.',
            body: `
                <p style="margin:0 0 10px">Expect email updates for:</p>
                <ul style="margin:0;padding-left:20px;color:#374151">
                    <li>New arrivals and restocks</li>
                    <li>Special discounts and offers</li>
                    <li>Important store announcements</li>
                </ul>
            `,
            footerNote: 'You can unsubscribe any time from your newsletter email or by contacting support.',
            ctaText: 'Explore Deals',
            ctaUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
        });

        res.status(201).json({ success: true, message: 'Thank you for subscribing to our newsletter!' });
    } catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const subscriber = await Newsletter.findOne({ where: { email: email.trim().toLowerCase() } });
        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        await subscriber.update({ status: 'unsubscribed' });

        try {
            await sendNewsletterMail({
                to: subscriber.email,
                subject: 'You have been unsubscribed',
                title: 'You are unsubscribed',
                intro: 'You will no longer receive promotional updates from us.',
                body: `
                    <p style="margin:0">If you changed your mind later, you can subscribe again anytime with the same email address.</p>
                `,
                footerNote: 'We are sorry to see you go. You can always return for fresh deals and updates.',
                ctaText: 'Resubscribe',
                ctaUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
            });
        } catch (mailError) {
            console.error('Unsubscribe confirmation mail error:', mailError.message);
        }

        res.json({ success: true, message: 'Unsubscribed successfully!' });
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getSubscribers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;

        if (page) {
            const offset = (page - 1) * limit;
            const { count, rows } = await Newsletter.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            return res.json({
                success: true,
                subscribers: rows,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const subscribers = await Newsletter.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: subscribers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSubscriberStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'unsubscribed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const subscriber = await Newsletter.findByPk(req.params.id);
        if (!subscriber) {
            return res.status(404).json({ success: false, message: 'Subscriber not found' });
        }

        await subscriber.update({ status });
        res.json({ success: true, message: 'Subscriber status updated successfully!', data: subscriber });
    } catch (error) {
        console.error('Update subscriber status error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { target, specificEmail, subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }

        let recipients = [];
        if (target === 'all') {
            const subscribers = await Newsletter.findAll({ where: { status: 'active' } });
            recipients = subscribers.map(sub => sub.email);
        } else if (target === 'specific' && specificEmail) {
            recipients = [specificEmail];
        } else {
            return res.status(400).json({ success: false, message: 'Invalid target or missing email' });
        }

        if (recipients.length === 0) {
            return res.status(400).json({ success: false, message: 'No active subscribers found' });
        }

        const mailOptions = {
            from: `"Nikitha Enterprises" <${process.env.EMAIL_USER}>`,
            to: recipients.join(', '), // Send to all at once or individually. (BCC is better for mass emails)
            subject: subject,
            html: buildThemedEmailHtml({
                title: subject,
                intro: 'Special offer just for you!',
                body: `
                    <div style="font-size:16px;line-height:1.6;color:#111827;">
                        ${message.replace(/\n/g, '<br/>')}
                    </div>
                `,
                footer: 'You are receiving this email because you subscribed to our newsletter.',
                highlight: 'Newsletter'
            })
        };

        // If sending to all, use BCC to protect privacy
        if (target === 'all') {
            mailOptions.bcc = mailOptions.to;
            delete mailOptions.to;
        }

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Notification sent successfully!' });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to send notification' });
    }
};
