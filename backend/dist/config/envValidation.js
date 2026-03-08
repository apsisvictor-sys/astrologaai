"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvValidationReport = getEnvValidationReport;
const REQUIRED_KEYS = ['DATABASE_URL', 'JWT_SECRET', 'CRON_SECRET'];
const OPTIONAL_KEYS = [
    'FRONTEND_URL',
    'FRONTEND_URLS',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REDIS_URL',
];
function hasValue(value) {
    return Boolean(value && value.trim().length > 0);
}
function getEnvValidationReport() {
    const checks = [
        ...REQUIRED_KEYS.map((key) => ({ key, required: true, present: hasValue(process.env[key]) })),
        ...OPTIONAL_KEYS.map((key) => ({ key, required: false, present: hasValue(process.env[key]) })),
    ];
    const missingRequired = checks.filter((check) => check.required && !check.present).map((check) => check.key);
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        checkedAt: new Date().toISOString(),
        required: checks.filter((check) => check.required),
        optional: checks.filter((check) => !check.required),
        ok: missingRequired.length === 0,
        missingRequired,
    };
}
//# sourceMappingURL=envValidation.js.map