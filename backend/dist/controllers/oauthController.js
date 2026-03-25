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
var oauthController_exports = {};
__export(oauthController_exports, {
  appleLogin: () => appleLogin,
  default: () => oauthController_default,
  getOAuthUrl: () => getOAuthUrl,
  googleLogin: () => googleLogin,
  oauthCallback: () => oauthCallback
});
module.exports = __toCommonJS(oauthController_exports);
var import_supabase_js = require("@supabase/supabase-js");
var import_client = require("@prisma/client");
var import_prisma = __toESM(require("../utils/prisma"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_jwt = require("../utils/jwt");
var import_refreshTokens = require("../utils/refreshTokens");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
function generateAccessToken(userId, email, tier) {
  return import_jsonwebtoken.default.sign(
    { sub: userId, email, tier },
    import_jwt.JWT_SECRET,
    { expiresIn: import_jwt.JWT_CONFIG.expiresIn }
  );
}
async function googleLogin(req, res) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured on the server"
        }
      });
      return;
    }
    const supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });
    if (error) {
      console.error("[OAuth] Google login error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message
        }
      });
      return;
    }
    res.redirect(data.url);
  } catch (error) {
    console.error("[OAuth] Google login error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to initiate Google login"
      }
    });
  }
}
async function appleLogin(req, res) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured on the server"
        }
      });
      return;
    }
    const supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`
      }
    });
    if (error) {
      console.error("[OAuth] Apple login error:", error);
      res.status(400).json({
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message
        }
      });
      return;
    }
    res.redirect(data.url);
  } catch (error) {
    console.error("[OAuth] Apple login error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to initiate Apple login"
      }
    });
  }
}
async function oauthCallback(req, res, next) {
  try {
    const { code, provider } = req.body;
    if (!code) {
      res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CODE",
          message: "Authorization code is required"
        }
      });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured on the server"
        }
      });
      return;
    }
    const supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError || !sessionData.session) {
      console.error("[OAuth] Code exchange error:", sessionError);
      res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CODE",
          message: "Failed to exchange authorization code"
        }
      });
      return;
    }
    const { user: supabaseUser, session } = sessionData;
    if (!supabaseUser.email) {
      res.status(400).json({
        success: false,
        error: {
          code: "NO_EMAIL",
          message: "Email is required from OAuth provider"
        }
      });
      return;
    }
    let user = await import_prisma.default.user.findUnique({
      where: { email: supabaseUser.email },
      include: {
        profile: true,
        subscription: true
      }
    });
    if (!user) {
      const randomPassword = require("crypto").randomBytes(32).toString("hex");
      const passwordHash = await import_bcryptjs.default.hash(randomPassword, 12);
      user = await import_prisma.default.user.create({
        data: {
          email: supabaseUser.email,
          passwordHash,
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          tier: import_client.Tier.FREE,
          language: (req.headers["accept-language"]?.split(",")[0]?.split("-")[0] || "en") === "bg" ? "bg" : "en",
          emailVerified: !!supabaseUser.email_confirmed_at,
          oauthProvider: provider || supabaseUser.app_metadata?.provider || "unknown",
          oauthId: supabaseUser.id,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
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
      console.log(`[OAuth] Created new user via ${provider}: ${user.email}`);
    } else {
      if (!user.oauthProvider) {
        await import_prisma.default.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: provider || supabaseUser.app_metadata?.provider || "unknown",
            oauthId: supabaseUser.id,
            emailVerified: !!supabaseUser.email_confirmed_at,
            avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || user.avatarUrl
          }
        });
      }
    }
    const accessToken = generateAccessToken(user.id, user.email, user.tier);
    const refreshToken = await (0, import_refreshTokens.createRefreshToken)(user.id);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 90 * 24 * 60 * 60 * 1e3,
      path: "/"
    });
    console.log(`[OAuth] Successful login for user: ${user.id} via ${provider}`);
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          tier: user.tier,
          language: user.language,
          emailVerified: user.emailVerified,
          avatarUrl: user.avatarUrl
        },
        tokens: {
          accessToken,
          expiresIn: import_jwt.JWT_CONFIG.expiresIn
        },
        message: "Login successful"
      }
    });
  } catch (error) {
    console.error("[OAuth] Callback error:", error);
    next(error);
  }
}
async function getOAuthUrl(req, res) {
  try {
    const { provider } = req.params;
    if (!["google", "apple"].includes(provider)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROVIDER",
          message: 'Provider must be "google" or "apple"'
        }
      });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured on the server"
        }
      });
      return;
    }
    const supabase = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`,
        queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : void 0
      }
    });
    if (error) {
      console.error(`[OAuth] ${provider} URL error:`, error);
      res.status(400).json({
        success: false,
        error: {
          code: "OAUTH_ERROR",
          message: error.message
        }
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        url: data.url,
        provider
      }
    });
  } catch (error) {
    console.error("[OAuth] Get URL error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get OAuth URL"
      }
    });
  }
}
function getCurrentMonth() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
var oauthController_default = {
  googleLogin,
  appleLogin,
  oauthCallback,
  getOAuthUrl
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appleLogin,
  getOAuthUrl,
  googleLogin,
  oauthCallback
});
