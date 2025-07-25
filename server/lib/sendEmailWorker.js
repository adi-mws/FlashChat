import { parentPort } from 'worker_threads';
import transporter from './nodeMailer.js';

parentPort.on('message', async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    parentPort.postMessage({ success: true });
  } catch (error) {
    parentPort.postMessage({ success: false, error });
  }
});
