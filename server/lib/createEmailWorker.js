import transporter from './nodeMailer.js';

export const sendEmailInWorker = async (emailData) => {
  try {
    const fromAddress = process.env.EMAIL_USER
      ? `"FlashChat" <${process.env.EMAIL_USER}>`
      : 'no-reply@flashchat.com';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    console.log(`[Email Success] Sent to ${emailData.to} (MessageId: ${info.messageId})`);
    return { success: true, info };
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${emailData?.to}:`, error.message || error);
    return { success: false, error };
  }
};

