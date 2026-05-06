type SmsOptions = {
  phone: string;
  message: string;
};

type Fast2SmsResponse = {
  return: boolean;
  request_id: string;
  message: string[];
};

export async function sendSms({ phone, message }: SmsOptions): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS MOCK] To: ${phone} | ${message}`);
    }
    return true;
  }

  const normalized = phone.replace(/\D/g, "").replace(/^91/, "");
  if (normalized.length !== 10) return false;

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message,
        language: "english",
        flash: 0,
        numbers: normalized,
      }),
    });

    const data = (await response.json()) as Fast2SmsResponse;
    return data.return === true;
  } catch (error) {
    console.error("[SMS] Fast2SMS error:", error);
    return false;
  }
}

export const SMS_TEMPLATES = {
  orderPlaced: (orderId: string) =>
    `Your Nowaam order ${orderId.slice(-8)} has been placed successfully. Track at nowaam.com/account`,

  shipmentCreated: (awb: string, carrier: string) =>
    `Your Nowaam order has been shipped via ${carrier}. AWB: ${awb}. Track: nowaam.com/track/${awb}`,

  outForDelivery: (awb: string) =>
    `Your Nowaam package is out for delivery today! AWB: ${awb}. Keep your phone handy.`,

  delivered: (orderId: string) =>
    `Your Nowaam order ${orderId.slice(-8)} has been delivered. Enjoy your purchase! Rate us at nowaam.com/account`,

  returnApproved: (orderId: string) =>
    `Your return request for Nowaam order ${orderId.slice(-8)} has been approved. Reverse pickup will be arranged.`,

  refundInitiated: (amount: number, orderId: string) =>
    `Refund of ₹${amount} for Nowaam order ${orderId.slice(-8)} has been initiated. It will reflect in 5-7 business days.`,

  codCollected: (amount: number) =>
    `Cash on Delivery of ₹${amount} collected by our courier. Thank you for shopping on Nowaam!`,
};
