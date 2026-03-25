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
var authController_exports = {};
__export(authController_exports, {
  default: () => authController_default,
  forgotPassword: () => forgotPassword,
  login: () => login,
  logout: () => logout,
  refresh: () => refresh,
  register: () => register,
  resendVerification: () => resendVerification,
  resetPassword: () => resetPassword,
  verifyEmail: () => verifyEmail
});
module.exports = __toCommonJS(authController_exports);
var bcrypt = __toESM(require("bcryptjs"));
var jwt = __toESM(require("jsonwebtoken"));
var import_client = require("@prisma/client");
var import_prisma = __toESM(require("../utils/prisma"));
var import_validation = require("../utils/validation");
var import_languageDetection = require("../middleware/languageDetection");
var import_jwt = require("../utils/jwt");
var import_render = require("@react-email/render");
var import_PasswordResetEmail = require("../emails/PasswordResetEmail");
var import_PasswordChangedEmail = require("../emails/PasswordChangedEmail");
var import_lifecycle = require("../services/email/lifecycle");
var import_refreshTokens = require("../utils/refreshTokens");
var import_streakService = require("../services/streakService");
function generateAccessToken(userId, email, tier) {
  return jwt.sign(
    { sub: userId, email, tier },
    import_jwt.JWT_SECRET,
    { expiresIn: import_jwt.JWT_CONFIG.expiresIn }
  );
}
function handleAuthInfraError(error, res) {
  const isPrismaInfraError = error instanceof import_client.Prisma.PrismaClientKnownRequestError || error instanceof import_client.Prisma.PrismaClientUnknownRequestError || error instanceof import_client.Prisma.PrismaClientRustPanicError || error instanceof import_client.Prisma.PrismaClientInitializationError;
  const message = error instanceof Error ? error.message : String(error);
  const looksLikeInfraFailure = /\b(connect|connection|database|prisma|timeout|pool|P1001|P1002|P1017)\b/i.test(message);
  if (isPrismaInfraError || looksLikeInfraFailure) {
    console.error("[Auth] Infrastructure error:", message);
    res.status(503).json({
      success: false,
      error: {
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "Authentication service temporarily unavailable"
      }
    });
    return true;
  }
  return false;
}
async function register(req, res, next) {
  try {
    const validationResult = import_validation.registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid registration data",
          details: (0, import_validation.formatZodErrors)(validationResult.error)
        }
      });
      return;
    }
    const { email, password, fullName, language: bodyLanguage, referralSlug } = validationResult.data;
    const existingUser = await import_prisma.default.user.findUnique({
      where: { email }
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
    const acceptLanguage = req.headers["accept-language"];
    const detectedLanguage = bodyLanguage || (0, import_languageDetection.detectLanguageFromHeader)(acceptLanguage);
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const user = await import_prisma.default.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        tier: import_client.Tier.FREE,
        language: detectedLanguage,
        // US-26: Use detected language
        emailVerified: false,
        referredBySlug: referralSlug || null,
        // Create profile with default preferences
        profile: {
          create: {
            onboardingComplete: false,
            notificationPrefs: {
              daily: true,
              weekly: true,
              promotions: false
            }
          }
        },
        // Create subscription record
        subscription: {
          create: {
            tier: import_client.Tier.FREE,
            status: "ACTIVE"
          }
        },
        // Create usage record for current month
        usageRecords: {
          create: {
            month: getCurrentMonth(),
            queryCount: 0
          }
        }
      },
      include: {
        profile: true,
        subscription: true
      }
    });
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = await (0, import_refreshTokens.createRefreshToken)(user.id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 90 * 24 * 60 * 60 * 1e3,
      path: "/"
    });
    (0, import_lifecycle.sendWelcomeEmail)(user.id, user.email, user.fullName, detectedLanguage).catch((e) => {
      console.error("[Auth] Failed to send welcome email:", e);
    });
    const verificationToken = require("crypto").randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    import_prisma.default.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiry }
    }).then(() => (0, import_lifecycle.sendVerificationEmail)(user.email, verificationToken, detectedLanguage)).catch((e) => console.error("[Auth] Failed to send verification email:", e));
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString()
        },
        tokens: {
          accessToken,
          expiresIn: import_jwt.JWT_CONFIG.expiresIn
        },
        message: "Registration successful. Please check your email for verification."
      }
    });
  } catch (error) {
    if (handleAuthInfraError(error, res)) {
      return;
    }
    console.error("[Auth] Registration error:", error);
    next(error);
  }
}
async function login(req, res, next) {
  try {
    const validationResult = import_validation.loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login data",
          details: (0, import_validation.formatZodErrors)(validationResult.error)
        }
      });
      return;
    }
    const { email, password } = validationResult.data;
    const { deviceInfo } = req.body || {};
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "unknown";
    const user = await import_prisma.default.user.findUnique({
      where: { email },
      include: {
        profile: true,
        subscription: true
      }
    });
    const invalidCredentialsError = {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    };
    if (!user) {
      console.log(`[Auth] Failed login attempt for email: ${email} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }
    if (!user.passwordHash) {
      console.log(`[Auth] Failed login attempt for user without password hash: ${user.id} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log(`[Auth] Failed login attempt for user: ${user.id} from IP: ${clientIp}`);
      res.status(401).json(invalidCredentialsError);
      return;
    }
    await (0, import_streakService.checkTrialExpiry)(user.id).catch(() => {
    });
    const freshUserTier = await import_prisma.default.user.findUnique({ where: { id: user.id }, select: { tier: true } });
    if (freshUserTier) user.tier = freshUserTier.tier;
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = await (0, import_refreshTokens.createRefreshToken)(user.id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 90 * 24 * 60 * 60 * 1e3,
      path: "/"
    });
    console.log(`[Auth] Successful login for user: ${user.id}`, {
      userId: user.id,
      email: user.email,
      ip: clientIp,
      userAgent,
      deviceInfo,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          emailVerified: user.emailVerified
        },
        tokens: {
          accessToken,
          expiresIn: import_jwt.JWT_CONFIG.expiresIn
        }
      }
    });
  } catch (error) {
    if (handleAuthInfraError(error, res)) {
      return;
    }
    console.error("[Auth] Login error:", error);
    next(error);
  }
}
async function refresh(req, res, next) {
  try {
    const raw = req.cookies?.refreshToken;
    if (!raw) {
      res.status(401).json({
        success: false,
        error: { code: "MISSING_REFRESH_TOKEN", message: "Refresh token is required" }
      });
      return;
    }
    if (raw.startsWith("eyJ")) {
      try {
        const decoded = jwt.verify(raw, import_jwt.JWT_SECRET);
        if (decoded.type !== "refresh") throw new Error("not a refresh token");
        const user = await import_prisma.default.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, email: true, tier: true }
        });
        if (!user) throw new Error("user not found");
        const newToken2 = await (0, import_refreshTokens.createRefreshToken)(user.id);
        const accessToken2 = generateAccessToken(user.id, user.email, user.tier);
        res.cookie("refreshToken", newToken2, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 90 * 24 * 60 * 60 * 1e3,
          path: "/"
        });
        res.json({ success: true, data: { accessToken: accessToken2, expiresIn: import_jwt.JWT_CONFIG.expiresIn } });
        return;
      } catch {
        res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
        res.status(401).json({ success: false, error: { code: "SESSION_EXPIRED", message: "Please log in again." } });
        return;
      }
    }
    const result = await (0, import_refreshTokens.validateAndRotate)(raw);
    if (!result) {
      res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
      res.status(401).json({
        success: false,
        error: { code: "INVALID_REFRESH_TOKEN", message: "Session expired. Please log in again." }
      });
      return;
    }
    const { userId, email, tier, newToken } = result;
    const accessToken = generateAccessToken(userId, email, tier);
    res.cookie("refreshToken", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 90 * 24 * 60 * 60 * 1e3,
      path: "/"
    });
    res.json({ success: true, data: { accessToken, expiresIn: import_jwt.JWT_CONFIG.expiresIn } });
  } catch (error) {
    if (handleAuthInfraError(error, res)) return;
    console.error("[Auth] Refresh error:", error);
    next(error);
  }
}
async function logout(req, res) {
  const raw = req.cookies?.refreshToken;
  if (raw && !raw.startsWith("eyJ")) {
    await (0, import_refreshTokens.revokeToken)(raw).catch(() => {
    });
  }
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/"
  });
  res.status(200).json({
    success: true,
    data: {
      message: "Logged out successfully"
    }
  });
}
async function forgotPassword(req, res) {
  try {
    const { email, language = "bg" } = req.body;
    const user = await import_prisma.default.user.findUnique({
      where: { email: email?.toLowerCase().trim() }
    });
    if (!user) {
      res.status(200).json({
        success: true,
        data: {
          message: "If an account with that email exists, a password reset link has been sent."
        }
      });
      return;
    }
    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const { storeResetToken } = await import("../utils/redis");
    await storeResetToken(resetToken, user.id);
    const resetUrl = `${process.env.FRONTEND_URL}/${language === "bg" ? "" : "en/"}reset-password?token=${resetToken}`;
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailSubject = language === "bg" ? "\u041D\u0443\u043B\u0438\u0440\u0430\u043D\u0435 \u043D\u0430 \u043F\u0430\u0440\u043E\u043B\u0430\u0442\u0430 - AstroLogAI" : "Password Reset - AstroLogAI";
      const emailHtml = await (0, import_render.render)((0, import_PasswordResetEmail.PasswordResetEmail)({ resetUrl, language }));
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`[Auth] Password reset email sent to: ${email}`);
    } catch (emailError) {
      console.error("[Auth] Failed to send password reset email:", emailError);
    }
    res.status(200).json({
      success: true,
      data: {
        message: "If an account with that email exists, a password reset link has been sent."
      }
    });
  } catch (error) {
    console.error("[Auth] Forgot password error:", error);
    res.status(200).json({
      success: true,
      data: {
        message: "If an account with that email exists, a password reset link has been sent."
      }
    });
  }
}
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword, confirmPassword, language = "bg" } = req.body;
    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Reset token is required"
        }
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Passwords do not match",
          details: [
            {
              field: "confirmPassword",
              message: "Passwords do not match"
            }
          ]
        }
      });
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Password does not meet requirements",
          details: [
            {
              field: "newPassword",
              message: "Password must be at least 8 characters with 1 uppercase letter and 1 number"
            }
          ]
        }
      });
      return;
    }
    const { getResetToken, invalidateResetToken, invalidateUserSessions } = await import("../utils/redis");
    const userId = await getResetToken(token);
    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired reset token"
        }
      });
      return;
    }
    const user = await import_prisma.default.user.findUnique({
      where: { id: userId }
    });
    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found"
        }
      });
      return;
    }
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await import_prisma.default.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    await invalidateResetToken(token);
    await Promise.all([
      invalidateUserSessions(userId),
      (0, import_refreshTokens.revokeUserTokens)(userId)
    ]);
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailSubject = language === "bg" ? "\u041F\u0430\u0440\u043E\u043B\u0430\u0442\u0430 \u0435 \u043F\u0440\u043E\u043C\u0435\u043D\u0435\u043D\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E - AstroLogAI" : "Password Changed Successfully - AstroLogAI";
      const emailHtml = await (0, import_render.render)((0, import_PasswordChangedEmail.PasswordChangedEmail)({ language }));
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`[Auth] Password change confirmation email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("[Auth] Failed to send confirmation email:", emailError);
    }
    res.status(200).json({
      success: true,
      data: {
        message: "Password updated successfully"
      }
    });
  } catch (error) {
    console.error("[Auth] Reset password error:", error);
    next(error);
  }
}
async function verifyEmail(req, res) {
  const { token } = req.query;
  if (!token) {
    res.status(400).json({ success: false, error: { code: "MISSING_TOKEN" } });
    return;
  }
  const user = await import_prisma.default.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiry: { gt: /* @__PURE__ */ new Date() },
      emailVerified: false
    }
  });
  if (!user) {
    res.status(400).json({ success: false, error: { code: "INVALID_OR_EXPIRED_TOKEN", message: "Verification link is invalid or has expired." } });
    return;
  }
  await import_prisma.default.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null }
  });
  res.json({ success: true, data: { message: "Email verified successfully." } });
}
async function resendVerification(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false });
    return;
  }
  const user = await import_prisma.default.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) {
    res.status(400).json({ success: false, error: { code: "ALREADY_VERIFIED" } });
    return;
  }
  const verificationToken = require("crypto").randomBytes(32).toString("hex");
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1e3);
  await import_prisma.default.user.update({
    where: { id: userId },
    data: { verificationToken, verificationTokenExpiry }
  });
  await (0, import_lifecycle.sendVerificationEmail)(user.email, verificationToken, user.language || "en");
  res.json({ success: true, data: { message: "Verification email sent." } });
}
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
var authController_default = {
  register,
  login,
  refresh,
  logout,
  forgotPassword
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail
});
