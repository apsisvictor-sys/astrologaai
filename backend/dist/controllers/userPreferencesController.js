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
var userPreferencesController_exports = {};
__export(userPreferencesController_exports, {
  default: () => userPreferencesController_default,
  detectLanguage: () => detectLanguage,
  getNotificationPreferences: () => getNotificationPreferences,
  getPreferences: () => getPreferences,
  getProfile: () => getProfile,
  unsubscribeFromEmails: () => unsubscribeFromEmails,
  updateNotificationPreferences: () => updateNotificationPreferences,
  updatePreferences: () => updatePreferences,
  updateProfile: () => updateProfile
});
module.exports = __toCommonJS(userPreferencesController_exports);
var import_prisma = __toESM(require("../utils/prisma"));
var import_languageDetection = require("../middleware/languageDetection");
var import_render = require("@react-email/render");
var import_VerificationEmail = require("../emails/VerificationEmail");
const DEFAULT_NOTIFICATION_SETTINGS = {
  email: true,
  // Email notifications enabled
  push: false,
  // Push notifications disabled by default
  daily: true,
  // Daily forecast
  weekly: true,
  // Weekly forecast
  transitAlerts: true,
  // Transit alerts
  promotions: false
  // Promotional emails
};
async function getPreferences(req, res, next) {
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
    const user = await import_prisma.default.user.findUnique({
      where: { id: req.user.id },
      include: {
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
    const notificationPrefs = user.profile?.notificationPrefs || {};
    const notifications = {
      email: notificationPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: notificationPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: notificationPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: notificationPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: notificationPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: notificationPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions
    };
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          language: user.language || "bg",
          notifications
        },
        supportedLanguages: [
          {
            code: "bg",
            name: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
            nativeName: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
            flag: "\u{1F1E7}\u{1F1EC}"
          },
          {
            code: "en",
            name: "English",
            nativeName: "English",
            flag: "\u{1F1EC}\u{1F1E7}"
          }
        ]
      }
    });
  } catch (error) {
    console.error("[User Preferences] Get preferences error:", error);
    next(error);
  }
}
async function updatePreferences(req, res, next) {
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
    const { language, notifications: notificationUpdates } = req.body;
    if (language !== void 0) {
      if (!import_languageDetection.SUPPORTED_LANGUAGES.includes(language)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid language code",
            details: [
              {
                field: "language",
                message: `Language must be one of: ${import_languageDetection.SUPPORTED_LANGUAGES.join(", ")}`
              }
            ]
          }
        });
        return;
      }
    }
    if (language !== void 0) {
      await import_prisma.default.user.update({
        where: { id: req.user.id },
        data: {
          language,
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    if (notificationUpdates !== void 0) {
      const currentProfile = await import_prisma.default.profile.findUnique({
        where: { userId: req.user.id }
      });
      const currentPrefs = currentProfile?.notificationPrefs || {};
      const mergedPrefs = {
        ...currentPrefs,
        ...notificationUpdates
      };
      await import_prisma.default.profile.upsert({
        where: { userId: req.user.id },
        update: {
          notificationPrefs: mergedPrefs,
          updatedAt: /* @__PURE__ */ new Date()
        },
        create: {
          userId: req.user.id,
          notificationPrefs: mergedPrefs
        }
      });
    }
    const updatedUser = await import_prisma.default.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true
      }
    });
    const finalPrefs = updatedUser?.profile?.notificationPrefs || {};
    const notifications = {
      email: finalPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: finalPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: finalPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: finalPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: finalPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: finalPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions
    };
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          language: updatedUser?.language || "bg",
          notifications
        },
        message: "Preferences updated successfully"
      }
    });
  } catch (error) {
    console.error("[User Preferences] Update preferences error:", error);
    next(error);
  }
}
async function detectLanguage(req, res) {
  const acceptLanguage = req.headers["accept-language"];
  const detectedLanguage = (0, import_languageDetection.detectLanguageFromHeader)(acceptLanguage);
  res.status(200).json({
    success: true,
    data: {
      detectedLanguage,
      supportedLanguages: [
        {
          code: "bg",
          name: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
          nativeName: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438",
          flag: "\u{1F1E7}\u{1F1EC}"
        },
        {
          code: "en",
          name: "English",
          nativeName: "English",
          flag: "\u{1F1EC}\u{1F1E7}"
        }
      ],
      defaultLanguage: "bg"
    }
  });
}
async function updateProfile(req, res, next) {
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
    const { fullName, email, timezone, avatarUrl } = req.body;
    let emailVerificationSent = false;
    if (email !== void 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email format",
            details: [
              {
                field: "email",
                message: "Please provide a valid email address"
              }
            ]
          }
        });
        return;
      }
      const currentUser = await import_prisma.default.user.findUnique({
        where: { id: req.user.id },
        select: { email: true, pendingEmail: true }
      });
      const newEmail = email.toLowerCase();
      if (currentUser?.email === newEmail) {
        if (currentUser?.pendingEmail) {
          await import_prisma.default.user.update({
            where: { id: req.user.id },
            data: { pendingEmail: null, pendingEmailToken: null }
          });
        }
      } else if (currentUser) {
        const existingUser = await import_prisma.default.user.findFirst({
          where: {
            email: newEmail,
            id: { not: req.user.id }
          }
        });
        if (existingUser) {
          res.status(409).json({
            success: false,
            error: {
              code: "EMAIL_EXISTS",
              message: "An account with this email already exists"
            }
          });
          return;
        }
        const { randomBytes } = await import("crypto");
        const verificationToken = randomBytes(32).toString("hex");
        await import_prisma.default.user.update({
          where: { id: req.user.id },
          data: {
            pendingEmail: newEmail,
            pendingEmailToken: verificationToken,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}&userId=${req.user.id}`;
          const userLanguage = req.user?.language || "bg";
          const html = await (0, import_render.render)((0, import_VerificationEmail.VerificationEmail)({ verifyUrl: verificationUrl, language: userLanguage }));
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
            to: newEmail,
            subject: userLanguage === "bg" ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0435\u0442\u0435 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438 - AstroLogAI" : "Verify your email address - AstroLogAI",
            html
          });
          emailVerificationSent = true;
        } catch (emailError) {
          console.error("[Profile Update] Failed to send verification email:", emailError);
        }
      }
    }
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (fullName !== void 0) updateData.fullName = fullName;
    if (avatarUrl !== void 0) updateData.avatarUrl = avatarUrl;
    const updatedUser = await import_prisma.default.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          tier: updatedUser.tier,
          language: updatedUser.language,
          avatarUrl: updatedUser.avatarUrl,
          emailVerified: updatedUser.emailVerified,
          pendingEmail: updatedUser.pendingEmail,
          updatedAt: updatedUser.updatedAt
        },
        message: emailVerificationSent ? "Profile updated. Please check your new email to verify the change." : "Profile updated successfully"
      }
    });
  } catch (error) {
    console.error("[User Preferences] Update profile error:", error);
    next(error);
  }
}
async function getProfile(req, res, next) {
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
    const user = await import_prisma.default.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        subscription: true
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
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          pendingEmail: user.pendingEmail,
          createdAt: user.createdAt,
          lastActive: user.updatedAt
        },
        subscription: user.subscription ? {
          tier: user.subscription.tier,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd
        } : null
      }
    });
  } catch (error) {
    console.error("[User Preferences] Get profile error:", error);
    next(error);
  }
}
async function getNotificationPreferences(req, res, next) {
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
    const profile = await import_prisma.default.profile.findUnique({
      where: { userId: req.user.id }
    });
    const notificationPrefs = profile?.notificationPrefs || {};
    const notifications = {
      email: notificationPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: notificationPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: notificationPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: notificationPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: notificationPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: notificationPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions
    };
    res.status(200).json({
      success: true,
      data: {
        notifications
      }
    });
  } catch (error) {
    console.error("[User Notifications] Get preferences error:", error);
    next(error);
  }
}
async function updateNotificationPreferences(req, res, next) {
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
    const { email, push, daily, weekly, transitAlerts, promotions } = req.body;
    const booleanFields = { email, push, daily, weekly, transitAlerts, promotions };
    for (const [key, value] of Object.entries(booleanFields)) {
      if (value !== void 0 && typeof value !== "boolean") {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid value for ${key}`,
            details: [
              {
                field: key,
                message: `${key} must be a boolean`
              }
            ]
          }
        });
        return;
      }
    }
    const currentProfile = await import_prisma.default.profile.findUnique({
      where: { userId: req.user.id }
    });
    const currentPrefs = currentProfile?.notificationPrefs || {};
    const updatedPrefs = {
      ...currentPrefs,
      ...email !== void 0 && { email },
      ...push !== void 0 && { push },
      ...daily !== void 0 && { daily },
      ...weekly !== void 0 && { weekly },
      ...transitAlerts !== void 0 && { transitAlerts },
      ...promotions !== void 0 && { promotions }
    };
    await import_prisma.default.profile.upsert({
      where: { userId: req.user.id },
      update: {
        notificationPrefs: updatedPrefs,
        updatedAt: /* @__PURE__ */ new Date()
      },
      create: {
        userId: req.user.id,
        notificationPrefs: updatedPrefs
      }
    });
    const notifications = {
      email: updatedPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
      push: updatedPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
      daily: updatedPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
      weekly: updatedPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
      transitAlerts: updatedPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
      promotions: updatedPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions
    };
    res.status(200).json({
      success: true,
      data: {
        notifications,
        message: "Notification preferences updated successfully"
      }
    });
  } catch (error) {
    console.error("[User Notifications] Update preferences error:", error);
    next(error);
  }
}
async function unsubscribeFromEmails(req, res, next) {
  try {
    const { token, type } = req.body;
    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Unsubscribe token is required"
        }
      });
      return;
    }
    const jwt = await import("jsonwebtoken");
    const { JWT_SECRET } = await import("../utils/jwt");
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired unsubscribe token"
        }
      });
      return;
    }
    const userId = decoded.userId;
    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid unsubscribe token"
        }
      });
      return;
    }
    const profile = await import_prisma.default.profile.findUnique({
      where: { userId }
    });
    const currentPrefs = profile?.notificationPrefs || {};
    let updatedPrefs = { ...currentPrefs };
    let message = "Successfully unsubscribed";
    if (type === "all") {
      updatedPrefs = {
        ...updatedPrefs,
        email: false,
        daily: false,
        weekly: false,
        transitAlerts: false,
        promotions: false
      };
      message = "Successfully unsubscribed from all email notifications";
    } else if (type === "promotions") {
      updatedPrefs.promotions = false;
      message = "Successfully unsubscribed from promotional emails";
    } else if (type === "daily") {
      updatedPrefs.daily = false;
      message = "Successfully unsubscribed from daily forecasts";
    } else if (type === "weekly") {
      updatedPrefs.weekly = false;
      message = "Successfully unsubscribed from weekly forecasts";
    } else if (type === "transitAlerts") {
      updatedPrefs.transitAlerts = false;
      message = "Successfully unsubscribed from transit alerts";
    } else {
      updatedPrefs.promotions = false;
      message = "Successfully unsubscribed from promotional emails";
    }
    await import_prisma.default.profile.upsert({
      where: { userId },
      update: {
        notificationPrefs: updatedPrefs,
        updatedAt: /* @__PURE__ */ new Date()
      },
      create: {
        userId,
        notificationPrefs: updatedPrefs
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message,
        preferences: {
          email: updatedPrefs.email ?? DEFAULT_NOTIFICATION_SETTINGS.email,
          push: updatedPrefs.push ?? DEFAULT_NOTIFICATION_SETTINGS.push,
          daily: updatedPrefs.daily ?? DEFAULT_NOTIFICATION_SETTINGS.daily,
          weekly: updatedPrefs.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weekly,
          transitAlerts: updatedPrefs.transitAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.transitAlerts,
          promotions: updatedPrefs.promotions ?? DEFAULT_NOTIFICATION_SETTINGS.promotions
        }
      }
    });
  } catch (error) {
    console.error("[User Notifications] Unsubscribe error:", error);
    next(error);
  }
}
var userPreferencesController_default = {
  getPreferences,
  updatePreferences,
  detectLanguage,
  updateProfile,
  getProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromEmails
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectLanguage,
  getNotificationPreferences,
  getPreferences,
  getProfile,
  unsubscribeFromEmails,
  updateNotificationPreferences,
  updatePreferences,
  updateProfile
});
