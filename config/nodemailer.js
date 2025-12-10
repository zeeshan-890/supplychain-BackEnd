import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // TLS port
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // your Gmail or SMTP user
    pass: process.env.SMTP_PASS, // app password (not your real Gmail password)
  },
});

export const mailOptions = (to, subject, text, html) => ({
  from: `"Supply Chain manager" <${process.env.SMTP_USER}>`,
  to,
  subject,
  text,
  html,
});
