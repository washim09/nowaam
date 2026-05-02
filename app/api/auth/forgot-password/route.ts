import crypto from "crypto";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import PasswordReset from "@/models/PasswordReset";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    await PasswordReset.deleteMany({ email: user.email });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await PasswordReset.create({ email: user.email, token, expiresAt });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your Nowaam password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#3b1f0e">Reset your password</h2>
          <p>Hi ${user.name},</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#7c4f2f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#888;font-size:12px">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request." },
      { status: 500 },
    );
  }
}
