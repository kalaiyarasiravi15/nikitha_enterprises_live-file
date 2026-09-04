const nodemailer = require('nodemailer');
const { buildThemedEmailHtml } = require('./emailTheme');

const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendThemedOrderMail = async ({ to, subject, title, intro, body, footer, ctaText, ctaUrl, highlight }) => {
    if (!to) return;
    await mailer.sendMail({
        from: `"Anyra's Trove" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: buildThemedEmailHtml({ title, intro, body, footer, ctaText, ctaUrl, highlight })
    });
};

module.exports = { mailer, sendThemedOrderMail };
