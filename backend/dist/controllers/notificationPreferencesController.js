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
var notificationPreferencesController_exports = {};
__export(notificationPreferencesController_exports, {
  default: () => notificationPreferencesController_default,
  getNotificationPreferences: () => getNotificationPreferences,
  getSmsStatus: () => getSmsStatus,
  regenerateUnsubscribeToken: () => regenerateUnsubscribeToken,
  unsubscribeFromNotifications: () => unsubscribeFromNotifications,
  updateNotificationPreferences: () => updateNotificationPreferences
});
module.exports = __toCommonJS(notificationPreferencesController_exports);
var crypto = __toESM(require("crypto"));
var import_prisma = __toESM(require("../utils/prisma"));
const DEFAULT_NOTIFICATION_PREFERENCES = {
  dailyHoroscope: true,
  weeklyForecast: true,
  newReading: true,
  partnerUpdates: false,
  marketing: false,
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  phoneNumber: null
};
function generateUnsubscribeToken() {
  return crypto.randomBytes(32).toString("hex");
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
    let preferences = await import_prisma.default.notificationPreference.findUnique({
      where: { userId: req.user.id }
    });
    if (!preferences) {
      preferences = await import_prisma.default.notificationPreference.create({
        data: {
          userId: req.user.id,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          unsubscribeToken: generateUnsubscribeToken()
        }
      });
    }
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          // Notification types
          types: {
            dailyHoroscope: preferences.dailyHoroscope,
            weeklyForecast: preferences.weeklyForecast,
            newReading: preferences.newReading,
            partnerUpdates: preferences.partnerUpdates,
            marketing: preferences.marketing
          },
          // Delivery channels
          channels: {
            email: preferences.emailEnabled,
            push: preferences.pushEnabled,
            sms: preferences.smsEnabled
          },
          // Phone number for SMS (masked for privacy)
          phoneNumber: preferences.phoneNumber ? `****${preferences.phoneNumber.slice(-4)}` : null
        },
        // Available options for reference
        availableTypes: [
          {
            id: "dailyHoroscope",
            name: "Daily Horoscope",
            nameBg: "\u0414\u043D\u0435\u0432\u0435\u043D \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F",
            description: "Get your personalized daily horoscope",
            descriptionBg: "\u041F\u043E\u043B\u0443\u0447\u0430\u0432\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0430\u043D \u0434\u043D\u0435\u0432\u0435\u043D \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F"
          },
          {
            id: "weeklyForecast",
            name: "Weekly Forecast",
            nameBg: "\u0421\u0435\u0434\u043C\u0438\u0447\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430",
            description: "Weekly astrological forecast based on transits",
            descriptionBg: "\u0421\u0435\u0434\u043C\u0438\u0447\u043D\u0430 \u0430\u0441\u0442\u0440\u043E\u043B\u043E\u0433\u0438\u0447\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430 \u0431\u0430\u0437\u0438\u0440\u0430\u043D\u0430 \u043D\u0430 \u0442\u0440\u0430\u043D\u0437\u0438\u0442\u0438"
          },
          {
            id: "newReading",
            name: "New Reading",
            nameBg: "\u041D\u043E\u0432\u043E \u0447\u0435\u0442\u0435\u043D\u0435",
            description: "Notifications about new chart interpretations",
            descriptionBg: "\u0418\u0437\u0432\u0435\u0441\u0442\u0438\u044F \u0437\u0430 \u043D\u043E\u0432\u0438 \u0442\u044A\u043B\u043A\u0443\u0432\u0430\u043D\u0438\u044F \u043D\u0430 \u043A\u0430\u0440\u0442\u0438"
          },
          {
            id: "partnerUpdates",
            name: "Partner Updates",
            nameBg: "\u041F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0441\u043A\u0438 \u0430\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438",
            description: "Compatibility alerts and partner insights",
            descriptionBg: "\u0418\u0437\u0432\u0435\u0441\u0442\u0438\u044F \u0437\u0430 \u0441\u044A\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442 \u0438 \u043F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0441\u043A\u0438 \u0430\u043D\u0430\u043B\u0438\u0437\u0438"
          },
          {
            id: "marketing",
            name: "Marketing & Promotions",
            nameBg: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433 \u0438 \u043F\u0440\u043E\u043C\u043E\u0446\u0438\u0438",
            description: "Special offers and announcements",
            descriptionBg: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u043D\u0438 \u043E\u0444\u0435\u0440\u0442\u0438 \u0438 \u0441\u044A\u043E\u0431\u0449\u0435\u043D\u0438\u044F"
          }
        ],
        availableChannels: [
          {
            id: "email",
            name: "Email",
            nameBg: "\u0418\u043C\u0435\u0439\u043B",
            icon: "\u{1F4E7}"
          },
          {
            id: "push",
            name: "Push Notifications",
            nameBg: "Push \u0438\u0437\u0432\u0435\u0441\u0442\u0438\u044F",
            icon: "\u{1F514}"
          },
          {
            id: "sms",
            name: "SMS",
            nameBg: "SMS",
            icon: "\u{1F4F1}"
          }
        ]
      }
    });
  } catch (error) {
    console.error("[Notification Preferences] Get error:", error);
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
    const { types, channels, phoneNumber } = req.body;
    const validTypes = ["dailyHoroscope", "weeklyForecast", "newReading", "partnerUpdates", "marketing"];
    if (types) {
      for (const key of Object.keys(types)) {
        if (!validTypes.includes(key)) {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid notification type: ${key}`,
              details: [{
                field: "types",
                message: `Valid types are: ${validTypes.join(", ")}`
              }]
            }
          });
          return;
        }
        if (typeof types[key] !== "boolean") {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Notification type value must be boolean: ${key}`,
              details: [{
                field: `types.${key}`,
                message: "Value must be true or false"
              }]
            }
          });
          return;
        }
      }
    }
    const validChannels = ["email", "push", "sms"];
    if (channels) {
      for (const key of Object.keys(channels)) {
        if (!validChannels.includes(key)) {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid channel: ${key}`,
              details: [{
                field: "channels",
                message: `Valid channels are: ${validChannels.join(", ")}`
              }]
            }
          });
          return;
        }
        if (typeof channels[key] !== "boolean") {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Channel value must be boolean: ${key}`,
              details: [{
                field: `channels.${key}`,
                message: "Value must be true or false"
              }]
            }
          });
          return;
        }
      }
    }
    if (phoneNumber !== void 0 && phoneNumber !== null) {
      const phoneRegex = /^\+[1-9]\d{6,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid phone number format",
            details: [{
              field: "phoneNumber",
              message: "Phone number must be in international format (e.g., +359888123456)"
            }]
          }
        });
        return;
      }
    }
    const updateData = {};
    if (types) {
      if (types.dailyHoroscope !== void 0) updateData.dailyHoroscope = types.dailyHoroscope;
      if (types.weeklyForecast !== void 0) updateData.weeklyForecast = types.weeklyForecast;
      if (types.newReading !== void 0) updateData.newReading = types.newReading;
      if (types.partnerUpdates !== void 0) updateData.partnerUpdates = types.partnerUpdates;
      if (types.marketing !== void 0) updateData.marketing = types.marketing;
    }
    if (channels) {
      if (channels.email !== void 0) updateData.emailEnabled = channels.email;
      if (channels.push !== void 0) updateData.pushEnabled = channels.push;
      if (channels.sms !== void 0) updateData.smsEnabled = channels.sms;
    }
    if (phoneNumber !== void 0) updateData.phoneNumber = phoneNumber;
    const preferences = await import_prisma.default.notificationPreference.upsert({
      where: { userId: req.user.id },
      update: updateData,
      create: {
        userId: req.user.id,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...updateData,
        unsubscribeToken: generateUnsubscribeToken()
      }
    });
    res.status(200).json({
      success: true,
      data: {
        preferences: {
          types: {
            dailyHoroscope: preferences.dailyHoroscope,
            weeklyForecast: preferences.weeklyForecast,
            newReading: preferences.newReading,
            partnerUpdates: preferences.partnerUpdates,
            marketing: preferences.marketing
          },
          channels: {
            email: preferences.emailEnabled,
            push: preferences.pushEnabled,
            sms: preferences.smsEnabled
          },
          phoneNumber: preferences.phoneNumber ? `****${preferences.phoneNumber.slice(-4)}` : null
        },
        message: "Notification preferences updated successfully"
      }
    });
  } catch (error) {
    console.error("[Notification Preferences] Update error:", error);
    next(error);
  }
}
async function unsubscribeFromNotifications(req, res, next) {
  try {
    const { token, type, all } = req.query;
    if (!token || typeof token !== "string") {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Unsubscribe token is required"
        }
      });
      return;
    }
    const preferences = await import_prisma.default.notificationPreference.findUnique({
      where: { unsubscribeToken: token },
      include: { user: true }
    });
    if (!preferences) {
      res.status(404).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired unsubscribe token"
        }
      });
      return;
    }
    const lang = preferences.user.language === "en" ? "en" : "bg";
    if (all === "true") {
      await import_prisma.default.notificationPreference.update({
        where: { id: preferences.id },
        data: {
          emailEnabled: false,
          dailyHoroscope: false,
          weeklyForecast: false,
          newReading: false,
          partnerUpdates: false,
          marketing: false
        }
      });
      res.status(200).json({
        success: true,
        data: {
          message: lang === "bg" ? "\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u0435 \u043E\u0442\u043F\u0438\u0441\u0430\u0445\u0442\u0435 \u043E\u0442 \u0432\u0441\u0438\u0447\u043A\u0438 \u0438\u043C\u0435\u0439\u043B \u0438\u0437\u0432\u0435\u0441\u0442\u0438\u044F." : "You have been successfully unsubscribed from all email notifications.",
          unsubscribedFrom: "all"
        }
      });
      return;
    }
    if (type && typeof type === "string") {
      const validTypes = ["dailyHoroscope", "weeklyForecast", "newReading", "partnerUpdates", "marketing"];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_TYPE",
            message: `Invalid notification type: ${type}`
          }
        });
        return;
      }
      await import_prisma.default.notificationPreference.update({
        where: { id: preferences.id },
        data: {
          [type]: false
        }
      });
      const typeNames = {
        dailyHoroscope: { en: "Daily Horoscope", bg: "\u0414\u043D\u0435\u0432\u0435\u043D \u0445\u043E\u0440\u043E\u0441\u043A\u043E\u043F" },
        weeklyForecast: { en: "Weekly Forecast", bg: "\u0421\u0435\u0434\u043C\u0438\u0447\u043D\u0430 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430" },
        newReading: { en: "New Reading", bg: "\u041D\u043E\u0432\u043E \u0447\u0435\u0442\u0435\u043D\u0435" },
        partnerUpdates: { en: "Partner Updates", bg: "\u041F\u0430\u0440\u0442\u043D\u044C\u043E\u0440\u0441\u043A\u0438 \u0430\u043A\u0442\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438" },
        marketing: { en: "Marketing", bg: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433" }
      };
      res.status(200).json({
        success: true,
        data: {
          message: lang === "bg" ? `\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u0435 \u043E\u0442\u043F\u0438\u0441\u0430\u0445\u0442\u0435 \u043E\u0442 "${typeNames[type].bg}".` : `You have been unsubscribed from "${typeNames[type].en}".`,
          unsubscribedFrom: type
        }
      });
      return;
    }
    await import_prisma.default.notificationPreference.update({
      where: { id: preferences.id },
      data: {
        marketing: false
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message: lang === "bg" ? "\u0423\u0441\u043F\u0435\u0448\u043D\u043E \u0441\u0435 \u043E\u0442\u043F\u0438\u0441\u0430\u0445\u0442\u0435 \u043E\u0442 \u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433\u043E\u0432\u0438 \u0438\u043C\u0435\u0439\u043B\u0438." : "You have been unsubscribed from marketing emails.",
        unsubscribedFrom: "marketing"
      }
    });
  } catch (error) {
    console.error("[Notification Preferences] Unsubscribe error:", error);
    next(error);
  }
}
async function regenerateUnsubscribeToken(req, res, next) {
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
    const newToken = generateUnsubscribeToken();
    await import_prisma.default.notificationPreference.update({
      where: { userId: req.user.id },
      data: {
        unsubscribeToken: newToken
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message: "Unsubscribe token regenerated successfully"
      }
    });
  } catch (error) {
    console.error("[Notification Preferences] Regenerate token error:", error);
    next(error);
  }
}
async function getSmsStatus(req, res, next) {
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
    const preferences = await import_prisma.default.notificationPreference.findUnique({
      where: { userId: req.user.id }
    });
    res.status(200).json({
      success: true,
      data: {
        smsEnabled: preferences?.smsEnabled ?? false,
        hasPhoneNumber: !!preferences?.phoneNumber,
        phoneNumber: preferences?.phoneNumber ? `****${preferences.phoneNumber.slice(-4)}` : null
      }
    });
  } catch (error) {
    console.error("[Notification Preferences] SMS status error:", error);
    next(error);
  }
}
var notificationPreferencesController_default = {
  getNotificationPreferences,
  updateNotificationPreferences,
  unsubscribeFromNotifications,
  regenerateUnsubscribeToken,
  getSmsStatus
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getNotificationPreferences,
  getSmsStatus,
  regenerateUnsubscribeToken,
  unsubscribeFromNotifications,
  updateNotificationPreferences
});
