"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var deleteAccountController_exports = {};
__export(deleteAccountController_exports, {
  default: () => deleteAccountController_default,
  deleteAccount: () => deleteAccount
});
module.exports = __toCommonJS(deleteAccountController_exports);
var bcrypt = __toESM(require("bcryptjs"));
var import_prisma = __toESM(require("../utils/prisma"));
var import_stripe = __toESM(require("stripe"));
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16"
    });
  }
} catch (error) {
  console.warn("[Delete Account] Stripe initialization failed:", error);
}
async function deleteAccount(req, res, next) {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
      return;
    }
    const { password } = req.body;
    const user = await import_prisma.default.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true,
        profile: true
      }
    });
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
      return;
    }
    const isOAuthOnly = !user.passwordHash;
    if (!isOAuthOnly) {
      if (!password) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Password confirmation is required",
            details: [
              {
                field: "password",
                message: "Please enter your password to confirm account deletion"
              }
            ]
          }
        });
        return;
      }
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Incorrect password. Please try again."
          }
        });
        return;
      }
    }
    const userEmail = user.email;
    const userLanguage = user.language || "bg";
    if (user.subscription?.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId, {
          prorate: false
          // Don't prorate - immediate cancellation
        });
        console.log(`[Delete Account] Cancelled Stripe subscription for user: ${user.id}`);
      } catch (stripeError) {
        console.warn("[Delete Account] Failed to cancel Stripe subscription:", stripeError);
      }
    }
    try {
      await import_prisma.default.notificationPreference.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.usageRecord.deleteMany({
        where: { userId: user.id }
      });
      const sessions = await import_prisma.default.chatSession.findMany({
        where: { userId: user.id },
        select: { id: true }
      });
      if (sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id);
        await import_prisma.default.chatMessage.deleteMany({
          where: { sessionId: { in: sessionIds } }
        });
        await import_prisma.default.chatSession.deleteMany({
          where: { userId: user.id }
        });
      }
      await import_prisma.default.message.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.partner.deleteMany({
        where: { userId: user.id }
      });
      const birthCharts = await import_prisma.default.birthChart.findMany({
        where: { userId: user.id },
        select: { id: true }
      });
      if (birthCharts.length > 0) {
        const chartIds = birthCharts.map((c) => c.id);
        await import_prisma.default.chartHistory.deleteMany({
          where: { chartId: { in: chartIds } }
        });
      }
      await import_prisma.default.birthChart.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.birthProfile.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.profile.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.subscription.deleteMany({
        where: { userId: user.id }
      });
      await import_prisma.default.user.delete({
        where: { id: user.id }
      });
      console.log(`[Delete Account] Successfully deleted user: ${user.id} (${userEmail})`);
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailSubject = userLanguage === "bg" ? "\u0410\u043A\u0430\u0443\u043D\u0442\u044A\u0442 \u0435 \u0438\u0437\u0442\u0440\u0438\u0442 - AstroLogAI" : "Account Deleted - AstroLogAI";
        const emailHtml = userLanguage === "bg" ? `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
              </div>
              <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">\u0412\u0430\u0448\u0438\u044F\u0442 \u0430\u043A\u0430\u0443\u043D\u0442 \u0435 \u0438\u0437\u0442\u0440\u0438\u0442</h2>
              <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                \u041F\u043E\u0442\u0432\u044A\u0440\u0436\u0434\u0430\u0432\u0430\u043C\u0435, \u0447\u0435 \u0432\u0430\u0448\u0438\u044F\u0442 \u0430\u043A\u0430\u0443\u043D\u0442 \u0438 \u0432\u0441\u0438\u0447\u043A\u0438 \u0441\u0432\u044A\u0440\u0437\u0430\u043D\u0438 \u0434\u0430\u043D\u043D\u0438 \u0431\u044F\u0445\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u0442\u0435\u043B\u043D\u043E \u0438\u0437\u0442\u0440\u0438\u0442\u0438 \u0441\u044A\u0433\u043B\u0430\u0441\u043D\u043E \u0432\u0430\u0448\u0435\u0442\u043E \u0438\u0441\u043A\u0430\u043D\u0435.
              </p>
              <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">\u0418\u0437\u0442\u0440\u0438\u0442\u0438 \u0434\u0430\u043D\u043D\u0438</h3>
                <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u0437\u0430 \u0430\u043A\u0430\u0443\u043D\u0442\u0430</li>
                  <li style="margin-bottom: 8px;">\u0420\u043E\u0436\u0434\u0435\u043D\u0438 \u0434\u0430\u043D\u043D\u0438 \u0438 \u043A\u0430\u0440\u0442\u0438</li>
                  <li style="margin-bottom: 8px;">\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043D\u0430 \u0447\u0430\u0442\u043E\u0432\u0435\u0442\u0435</li>
                  <li style="margin-bottom: 8px;">\u041F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0438 \u0438 \u0432\u0440\u044A\u0437\u043A\u0438</li>
                  <li style="margin-bottom: 8px;">\u0410\u0431\u043E\u043D\u0430\u043C\u0435\u043D\u0442 \u0438 \u043F\u043B\u0430\u0449\u0430\u043D\u0438\u044F</li>
                  <li>\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0438\u0442\u0430\u043D\u0438\u044F</li>
                </ul>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #EF4444; font-size: 14px; margin: 0;">
                  \u26A0\uFE0F \u0422\u043E\u0432\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E. \u0412\u0441\u0438\u0447\u043A\u0438 \u0434\u0430\u043D\u043D\u0438 \u0441\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u0442\u0435\u043B\u043D\u043E \u0438\u0437\u0442\u0440\u0438\u0442\u0438.
                </p>
              </div>
              <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
                \u0411\u043B\u0430\u0433\u043E\u0434\u0430\u0440\u0438\u043C \u0432\u0438, \u0447\u0435 \u0438\u0437\u043F\u043E\u043B\u0437\u0432\u0430\u0445\u0442\u0435 AstroLogAI. \u041D\u0430\u0434\u044F\u0432\u0430\u043C\u0435 \u0441\u0435 \u0434\u0430 \u0441\u0435 \u0432\u0438\u0434\u0438\u043C \u043E\u0442\u043D\u043E\u0432\u043E!
              </p>
              <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
                \xA9 2026 AstroLogAI. \u0412\u0441\u0438\u0447\u043A\u0438 \u043F\u0440\u0430\u0432\u0430 \u0437\u0430\u043F\u0430\u0437\u0435\u043D\u0438.<br>
                \u0417\u0430 \u0432\u044A\u043F\u0440\u043E\u0441\u0438: support@astrologaai.com
              </p>
            </div>
          ` : `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #FAFAFA; font-size: 32px; margin: 0;">\u2728 AstroLogAI</h1>
              </div>
              <h2 style="color: #FAFAFA; font-size: 24px; margin-bottom: 20px;">Your Account Has Been Deleted</h2>
              <p style="color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                We confirm that your account and all associated data have been permanently deleted as requested.
              </p>
              <div style="background: #12121A; border: 1px solid #252532; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #FAFAFA; font-size: 18px; margin: 0 0 16px 0;">Deleted Data</h3>
                <ul style="color: #A1A1AA; font-size: 14px; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Account information</li>
                  <li style="margin-bottom: 8px;">Birth data and charts</li>
                  <li style="margin-bottom: 8px;">Chat history</li>
                  <li style="margin-bottom: 8px;">Partners and relationships</li>
                  <li style="margin-bottom: 8px;">Subscription and payments</li>
                  <li>Settings and preferences</li>
                </ul>
              </div>
              <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #EF4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="color: #EF4444; font-size: 14px; margin: 0;">
                  \u26A0\uFE0F This action is irreversible. All data has been permanently deleted.
                </p>
              </div>
              <p style="color: #71717A; font-size: 14px; margin-top: 30px;">
                Thank you for using AstroLogAI. We hope to see you again!
              </p>
              <p style="color: #52525B; font-size: 12px; margin-top: 40px; border-top: 1px solid #252532; padding-top: 20px;">
                \xA9 2026 AstroLogAI. All rights reserved.<br>
                Questions? support@astrologaai.com
              </p>
            </div>
          `;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
          to: userEmail,
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`[Delete Account] Confirmation email sent to: ${userEmail}`);
      } catch (emailError) {
        console.error("[Delete Account] Failed to send confirmation email:", emailError);
      }
      res.status(200).json({
        success: true,
        data: {
          message: userLanguage === "bg" ? "\u0412\u0430\u0448\u0438\u044F\u0442 \u0430\u043A\u0430\u0443\u043D\u0442 \u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0438\u0437\u0442\u0440\u0438\u0442. \u0412\u0441\u0438\u0447\u043A\u0438 \u0434\u0430\u043D\u043D\u0438 \u0441\u0430 \u043F\u0440\u0435\u043C\u0430\u0445\u043D\u0430\u0442\u0438." : "Your account has been successfully deleted. All data has been removed.",
          deletedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (deleteError) {
      console.error("[Delete Account] Error during data deletion:", deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error("[Delete Account] Error:", error);
    next(error);
  }
}
var deleteAccountController_default = {
  deleteAccount
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deleteAccount
});
