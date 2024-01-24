import nodemailer from 'nodemailer';
import {
  NODEMAILER_EMAIL,
  NODEMAILER_HOST,
  NODEMAILER_PASSWORD,
  NODEMAILER_PORT,
  NODEMAILER_SECURED,
} from '../config/env';

const transporter = nodemailer.createTransport(
  {
    host: NODEMAILER_HOST,
    port: NODEMAILER_PORT,
    secure: NODEMAILER_SECURED,
    auth: {
      user: NODEMAILER_EMAIL,
      pass: NODEMAILER_PASSWORD,
    },
  },
  {
    from: NODEMAILER_EMAIL,
  },
);

transporter.verify((error, success) => {
  error ? console.log(error) : console.log('Email transporter is ready: ', success);
});

export const mailer = async message => {
  try {
    const info = await transporter.sendMail(message);
    console.log('Email sent: ', info);
  } catch (err) {
    console.log(err);
  }
};
