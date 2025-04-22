const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  secure: true // Use TLS
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email configuration error:', error);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

const sendEmail = async (emailContent) => {
  try {
    const { to, subject, html } = emailContent;

    // Add default sender
    const mailOptions = {
      from: `"Edgile Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    // Send email based on environment
    if (process.env.NODE_ENV === 'production') {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
      return info;
    } else {
      // In development, just log the email content
      logger.info('Development mode - Email would have been sent:', {
        to,
        subject,
        html
      });
      return { messageId: 'dev-mode' };
    }
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail; 