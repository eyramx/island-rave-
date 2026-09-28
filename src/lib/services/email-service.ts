import { config } from '../config';

// ============================================
// Email Service Abstraction
// ============================================

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<boolean>;
}

// ============================================
// Console Provider (Development)
// ============================================

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<boolean> {
    console.log('═══════════════════════════════════════');
    console.log('📧 EMAIL (Dev Mode - Not Actually Sent)');
    console.log('═══════════════════════════════════════');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Body: ${message.text || 'See HTML'}`);
    console.log('═══════════════════════════════════════');
    return true;
  }
}

// ============================================
// SMTP Provider (Production)
// ============================================

class SMTPEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<boolean> {
    try {
      // Dynamic import to avoid loading nodemailer in demo mode
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
      
      await transporter.sendMail({
        from: config.email.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }
}

// ============================================
// Provider Factory
// ============================================

function getEmailProvider(): EmailProvider {
  switch (config.email.provider) {
    case 'smtp':
      return new SMTPEmailProvider();
    case 'console':
    default:
      return new ConsoleEmailProvider();
  }
}

// ============================================
// Email Templates
// ============================================

export async function sendOrderConfirmationEmail(
  to: string,
  orderData: {
    orderReference: string;
    customerName: string;
    totalAmount: number;
    currency: string;
    eventName: string;
    items: { name: string; quantity: number; price: number }[];
  }
): Promise<boolean> {
  const provider = getEmailProvider();
  
  const itemsHtml = orderData.items
    .map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${orderData.currency} ${item.price.toFixed(2)}</td></tr>`)
    .join('');
  
  return provider.send({
    to,
    subject: `Order Confirmation - ${orderData.orderReference} | Island Rave`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 30px; border-radius: 12px;">
        <h1 style="color: #f97316; text-align: center;">🎉 Island Rave</h1>
        <h2 style="text-align: center; color: #e2e8f0;">Order Confirmed!</h2>
        <p>Hi ${orderData.customerName},</p>
        <p>Your order <strong>${orderData.orderReference}</strong> has been confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="border-bottom: 1px solid #333;">
              <th style="text-align: left; padding: 8px; color: #f97316;">Ticket</th>
              <th style="text-align: left; padding: 8px; color: #f97316;">Qty</th>
              <th style="text-align: left; padding: 8px; color: #f97316;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size: 18px; font-weight: bold; color: #f97316;">
          Total: ${orderData.currency} ${orderData.totalAmount.toFixed(2)}
        </p>
        <p>Your tickets are ready! View them in your dashboard.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${config.app.url}/dashboard/tickets" style="background: linear-gradient(135deg, #f97316, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View My Tickets</a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
          Island Rave — La Plage
        </p>
      </div>
    `,
    text: `Order Confirmed - ${orderData.orderReference}\nHi ${orderData.customerName}, your order has been confirmed. Total: ${orderData.currency} ${orderData.totalAmount.toFixed(2)}`,
  });
}

export async function sendTicketEmail(
  to: string,
  ticketData: {
    customerName: string;
    ticketNumber: string;
    ticketType: string;
    eventName: string;
    venueName: string;
    ticketUrl: string;
  }
): Promise<boolean> {
  const provider = getEmailProvider();
  
  return provider.send({
    to,
    subject: `Your Ticket - ${ticketData.ticketNumber} | Island Rave`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 30px; border-radius: 12px;">
        <h1 style="color: #f97316; text-align: center;">🎫 Your Ticket</h1>
        <h2 style="text-align: center; color: #e2e8f0;">${ticketData.eventName}</h2>
        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #333;">
          <p><strong>Ticket:</strong> ${ticketData.ticketNumber}</p>
          <p><strong>Type:</strong> ${ticketData.ticketType}</p>
          <p><strong>Name:</strong> ${ticketData.customerName}</p>
          <p><strong>Venue:</strong> ${ticketData.venueName}</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${ticketData.ticketUrl}" style="background: linear-gradient(135deg, #f97316, #ec4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View & Download Ticket</a>
        </div>
        <p style="color: #888; text-align: center; margin-top: 20px;">Present the QR code on your ticket at the venue entrance.</p>
      </div>
    `,
    text: `Your Island Rave Ticket - ${ticketData.ticketNumber}\nType: ${ticketData.ticketType}\nView ticket: ${ticketData.ticketUrl}`,
  });
}
