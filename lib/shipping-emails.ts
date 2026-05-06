import { sendEmail } from "@/lib/email";

type ShipmentEmailData = {
  to: string;
  buyerName: string;
  orderId: string;
  awb: string;
  carrier: string;
  estimatedDelivery?: string;
  trackingUrl: string;
};

type DeliveredEmailData = {
  to: string;
  buyerName: string;
  orderId: string;
};

type ReturnEmailData = {
  to: string;
  buyerName: string;
  orderId: string;
  adminNote?: string;
  returnLabel?: string;
};

type RefundEmailData = {
  to: string;
  buyerName: string;
  orderId: string;
  amount: number;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://nowaam.com";

export async function sendShipmentCreatedEmail(data: ShipmentEmailData): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: `Your order has been shipped — AWB ${data.awb}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#1c1917;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-.04em;">Nowaam</p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.6);font-size:13px;">Your order is on the way</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;color:#78716c;">Hello</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:-.04em;color:#1c1917;">${data.buyerName}</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#57534e;line-height:1.6;">
            Great news! Your order <strong style="color:#1c1917;">#${data.orderId.slice(-8)}</strong> has been shipped and is on its way to you.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border-radius:16px;margin-bottom:28px;">
            <tr><td style="padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#78716c;font-weight:600;text-transform:uppercase;letter-spacing:.15em;">AWB Number</td>
                  <td style="padding:6px 0;font-size:15px;font-weight:700;color:#1c1917;text-align:right;font-family:monospace;">${data.awb}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#78716c;font-weight:600;text-transform:uppercase;letter-spacing:.15em;">Courier</td>
                  <td style="padding:6px 0;font-size:15px;font-weight:600;color:#1c1917;text-align:right;">${data.carrier}</td>
                </tr>
                ${data.estimatedDelivery ? `<tr>
                  <td style="padding:6px 0;font-size:13px;color:#78716c;font-weight:600;text-transform:uppercase;letter-spacing:.15em;">Est. Delivery</td>
                  <td style="padding:6px 0;font-size:15px;font-weight:600;color:#1c1917;text-align:right;">${new Date(data.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</td>
                </tr>` : ""}
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center">
              <a href="${data.trackingUrl}" style="display:inline-block;background:#1c1917;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:-.01em;">
                Track Your Order →
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#a8a29e;text-align:center;">
            You can also track your order at <a href="${APP_URL}/account" style="color:#78716c;">${APP_URL}/account</a>
          </p>
        </td></tr>
        <tr><td style="background:#fafaf9;padding:24px 40px;border-top:1px solid #e7e5e4;">
          <p style="margin:0;font-size:12px;color:#a8a29e;text-align:center;">
            © ${new Date().getFullYear()} Nowaam Marketplace · You received this because you placed an order.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendOutForDeliveryEmail(data: Omit<ShipmentEmailData, "estimatedDelivery">): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: "Your order is out for delivery today! 🚚",
    html: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#ea580c;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🚚 Out for Delivery</p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Your package will arrive today</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
            Hi <strong>${data.buyerName}</strong>, your order <strong>#${data.orderId.slice(-8)}</strong> is out for delivery with <strong>${data.carrier}</strong>. AWB: <code>${data.awb}</code>
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#57534e;">Please ensure someone is available to receive the package.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${data.trackingUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:100px;">
                Live Track →
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendDeliveredEmail(data: DeliveredEmailData & { to: string; buyerName: string }): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: "Your order has been delivered ✅",
    html: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#16a34a;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">✅ Order Delivered!</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
            Hi <strong>${data.buyerName}</strong>, your order <strong>#${data.orderId.slice(-8)}</strong> has been delivered successfully. We hope you love it!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${APP_URL}/account" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:100px;">
                View Order & Leave Review
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#a8a29e;text-align:center;">
            Need to return something? Visit your <a href="${APP_URL}/account" style="color:#78716c;">account page</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendReturnApprovedEmail(data: ReturnEmailData): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: "Your return request has been approved",
    html: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#0284c7;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Return Approved</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
            Hi <strong>${data.buyerName}</strong>, your return request for order <strong>#${data.orderId.slice(-8)}</strong> has been approved.
            ${data.adminNote ? `<br><br><em style="color:#78716c;">"${data.adminNote}"</em>` : ""}
          </p>
          ${data.returnLabel ? `<p style="margin:0 0 20px;font-size:15px;color:#57534e;">
            A return shipping label has been generated. <a href="${data.returnLabel}" style="color:#0284c7;font-weight:600;">Download Label</a>
          </p>` : ""}
          <p style="margin:0 0 24px;font-size:15px;color:#57534e;">
            Once we receive the item, your refund will be initiated within 3–5 business days.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${APP_URL}/account" style="display:inline-block;background:#0284c7;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:100px;">
                Track Return
              </a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendRefundCompletedEmail(data: RefundEmailData): Promise<void> {
  await sendEmail({
    to: data.to,
    subject: `Refund of ₹${data.amount.toLocaleString("en-IN")} credited to your account`,
    html: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;">
        <tr><td style="background:#7c3aed;padding:32px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Refund Completed 💳</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
            Hi <strong>${data.buyerName}</strong>, your refund of <strong>₹${data.amount.toLocaleString("en-IN")}</strong> for order <strong>#${data.orderId.slice(-8)}</strong> has been credited.
          </p>
          <p style="margin:0;font-size:13px;color:#a8a29e;">Please allow 3–5 business days for it to reflect in your bank account.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
