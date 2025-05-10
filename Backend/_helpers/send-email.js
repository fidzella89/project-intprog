const nodemailer = require('nodemailer');
const config = require('../config.json');

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM || config.emailFrom }) { 
    const smtpConfig = {
        host: process.env.SMTP_HOST || config.smtpOptions.host,
        port: parseInt(process.env.SMTP_PORT) || config.smtpOptions.port,
        auth: {
            user: process.env.SMTP_USER || config.smtpOptions.auth.user,
            pass: process.env.SMTP_PASS || config.smtpOptions.auth.pass
        }
    };
    
    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail({from, to, subject, html });
}
