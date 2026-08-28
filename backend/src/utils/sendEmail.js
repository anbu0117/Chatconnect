import nodemailer from "nodemailer";

/**
 * Sends an email using Nodemailer.
 * Configured via environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * If SMTP credentials are missing, falls back to logging the email details in console.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const mailOptions = {
        from: SMTP_FROM || `"ChatConnect Support" <${SMTP_USER}>`,
        to,
        subject,
        text,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
      return true;
    } else {
      console.log("\n=======================================================");
      console.log(`[SIMULATED EMAIL TO]: ${to}`);
      console.log(`[SUBJECT]: ${subject}`);
      console.log(`[TEXT]: ${text}`);
      console.log("=======================================================\n");
      return true;
    }
  } catch (error) {
    console.error(`[Email Sending Error]:`, error);
    throw new Error("Failed to send email. Please try again later.");
  }
};
