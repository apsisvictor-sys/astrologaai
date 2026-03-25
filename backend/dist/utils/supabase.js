"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var supabase_exports = {};
__export(supabase_exports, {
  default: () => supabase_default,
  getSupabaseUser: () => getSupabaseUser,
  supabaseAdmin: () => supabaseAdmin,
  verifyOAuthSession: () => verifyOAuthSession
});
module.exports = __toCommonJS(supabase_exports);
var import_supabase_js = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. OAuth login will not work.");
}
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;
async function getSupabaseUser(userId) {
  if (!supabaseAdmin) {
    throw new Error("Supabase client not configured");
  }
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    console.error("[Supabase] Error getting user:", error);
    return null;
  }
  return data.user;
}
async function verifyOAuthSession(accessToken) {
  if (!supabaseAdmin) {
    throw new Error("Supabase client not configured");
  }
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error) {
    console.error("[Supabase] Error verifying session:", error);
    return null;
  }
  return data.user;
}
var supabase_default = supabaseAdmin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSupabaseUser,
  supabaseAdmin,
  verifyOAuthSession
});
