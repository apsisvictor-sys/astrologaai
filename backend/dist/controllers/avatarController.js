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
var avatarController_exports = {};
__export(avatarController_exports, {
  cancelEmailChange: () => cancelEmailChange,
  confirmEmailChange: () => confirmEmailChange,
  default: () => avatarController_default,
  deleteAvatar: () => deleteAvatar,
  sendEmailVerification: () => sendEmailVerification,
  uploadAvatar: () => uploadAvatar
});
module.exports = __toCommonJS(avatarController_exports);
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_prisma = __toESM(require("../utils/prisma"));
var import_crypto = require("crypto");
var import_render = require("@react-email/render");
var import_VerificationEmail = require("../emails/VerificationEmail");
const AVATAR_DIR = import_path.default.join(process.cwd(), "public", "avatars");
function ensureAvatarDir() {
  if (!import_fs.default.existsSync(AVATAR_DIR)) {
    import_fs.default.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}
async function uploadAvatar(req, res, next) {
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
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: {
          code: "NO_FILE",
          message: "No avatar file provided"
        }
      });
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      if (import_fs.default.existsSync(file.path)) {
        import_fs.default.unlinkSync(file.path);
      }
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: "Only JPG and PNG images are allowed"
        }
      });
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      if (import_fs.default.existsSync(file.path)) {
        import_fs.default.unlinkSync(file.path);
      }
      res.status(400).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "Avatar file must be less than 2MB"
        }
      });
      return;
    }
    ensureAvatarDir();
    let finalPath;
    let filename;
    try {
      const sharp = require("sharp");
      filename = `avatar_${req.user.id}_${Date.now()}.jpg`;
      finalPath = import_path.default.join(AVATAR_DIR, filename);
      await sharp(file.path).resize(256, 256, {
        fit: "cover",
        position: "center"
      }).jpeg({ quality: 85 }).toFile(finalPath);
      if (import_fs.default.existsSync(file.path)) {
        import_fs.default.unlinkSync(file.path);
      }
    } catch (sharpError) {
      console.warn("[Avatar Upload] Sharp not available, using original file");
      const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
      filename = `avatar_${req.user.id}_${Date.now()}${ext}`;
      finalPath = import_path.default.join(AVATAR_DIR, filename);
      import_fs.default.copyFileSync(file.path, finalPath);
      if (import_fs.default.existsSync(file.path)) {
        import_fs.default.unlinkSync(file.path);
      }
    }
    const oldUser = await import_prisma.default.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true }
    });
    if (oldUser?.avatarUrl) {
      const oldFilename = import_path.default.basename(oldUser.avatarUrl);
      const oldPath = import_path.default.join(AVATAR_DIR, oldFilename);
      if (import_fs.default.existsSync(oldPath)) {
        import_fs.default.unlinkSync(oldPath);
      }
    }
    const avatarUrl = `/avatars/${filename}`;
    await import_prisma.default.user.update({
      where: { id: req.user.id },
      data: {
        avatarUrl,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.status(200).json({
      success: true,
      data: {
        avatarUrl,
        message: "Avatar uploaded successfully"
      }
    });
  } catch (error) {
    console.error("[Avatar Upload] Error:", error);
    const file = req.file;
    if (file?.path && import_fs.default.existsSync(file.path)) {
      try {
        import_fs.default.unlinkSync(file.path);
      } catch (cleanupError) {
        console.error("[Avatar Upload] Cleanup error:", cleanupError);
      }
    }
    next(error);
  }
}
async function deleteAvatar(req, res, next) {
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
      select: { avatarUrl: true }
    });
    if (!user?.avatarUrl) {
      res.status(404).json({
        success: false,
        error: {
          code: "NO_AVATAR",
          message: "No avatar to delete"
        }
      });
      return;
    }
    const filename = import_path.default.basename(user.avatarUrl);
    const filePath = import_path.default.join(AVATAR_DIR, filename);
    if (import_fs.default.existsSync(filePath)) {
      import_fs.default.unlinkSync(filePath);
    }
    await import_prisma.default.user.update({
      where: { id: req.user.id },
      data: {
        avatarUrl: null,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message: "Avatar deleted successfully"
      }
    });
  } catch (error) {
    console.error("[Avatar Delete] Error:", error);
    next(error);
  }
}
async function sendEmailVerification(req, res, next) {
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
    const { email, language = "bg" } = req.body;
    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: "EMAIL_REQUIRED",
          message: "Email address is required"
        }
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_EMAIL",
          message: "Please provide a valid email address"
        }
      });
      return;
    }
    const existingUser = await import_prisma.default.user.findFirst({
      where: {
        email: email.toLowerCase(),
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
    const verificationToken = (0, import_crypto.randomBytes)(32).toString("hex");
    await import_prisma.default.user.update({
      where: { id: req.user.id },
      data: {
        pendingEmail: email.toLowerCase(),
        pendingEmailToken: verificationToken,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}&userId=${req.user.id}`;
      const html = await (0, import_render.render)((0, import_VerificationEmail.VerificationEmail)({ verifyUrl: verificationUrl, language }));
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@astrologaai.com",
        to: email,
        subject: language === "bg" ? "\u041F\u043E\u0442\u0432\u044A\u0440\u0434\u0435\u0442\u0435 \u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u0438 - AstroLogAI" : "Verify your email address - AstroLogAI",
        html
      });
    } catch (emailError) {
      console.error("[Email Verification] Failed to send email:", emailError);
    }
    res.status(200).json({
      success: true,
      data: {
        message: "Verification email sent. Please check your inbox."
      }
    });
  } catch (error) {
    console.error("[Email Verification] Error:", error);
    next(error);
  }
}
async function confirmEmailChange(req, res, next) {
  try {
    const { token, userId } = req.body;
    if (!token || !userId) {
      res.status(400).json({
        success: false,
        error: {
          code: "TOKEN_REQUIRED",
          message: "Verification token and user ID are required"
        }
      });
      return;
    }
    const user = await import_prisma.default.user.findFirst({
      where: {
        id: userId,
        pendingEmailToken: token
      }
    });
    if (!user) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired verification token"
        }
      });
      return;
    }
    if (!user.pendingEmail) {
      res.status(400).json({
        success: false,
        error: {
          code: "NO_PENDING_EMAIL",
          message: "No pending email change to confirm"
        }
      });
      return;
    }
    await import_prisma.default.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        pendingEmailToken: null,
        emailVerified: true,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message: "Email confirmed successfully"
      }
    });
  } catch (error) {
    console.error("[Email Confirmation] Error:", error);
    next(error);
  }
}
async function cancelEmailChange(req, res, next) {
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
    await import_prisma.default.user.update({
      where: { id: req.user.id },
      data: {
        pendingEmail: null,
        pendingEmailToken: null,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.status(200).json({
      success: true,
      data: {
        message: "Pending email change cancelled"
      }
    });
  } catch (error) {
    console.error("[Cancel Email Change] Error:", error);
    next(error);
  }
}
var avatarController_default = {
  uploadAvatar,
  deleteAvatar,
  sendEmailVerification,
  confirmEmailChange,
  cancelEmailChange
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cancelEmailChange,
  confirmEmailChange,
  deleteAvatar,
  sendEmailVerification,
  uploadAvatar
});
