import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Optional: verify connection config on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('Nodemailer config error:', error);
    } else {
        console.log('Nodemailer is ready to send emails');
    }
});

export default transporter;
