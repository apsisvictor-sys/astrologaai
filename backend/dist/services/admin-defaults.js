"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminDefaults = seedAdminDefaults;
const prisma_1 = require("../utils/prisma");
const SYSTEM_ADMIN = 'system';
const DEFAULTS = [
    { key: 'price_input_claude-haiku-4-5-20251001',   value: '80'    },
    { key: 'price_output_claude-haiku-4-5-20251001',  value: '400'   },
    { key: 'price_input_claude-sonnet-4-6',            value: '300'   },
    { key: 'price_output_claude-sonnet-4-6',           value: '1500'  },
    { key: 'price_input_claude-opus-4-6',              value: '1500'  },
    { key: 'price_output_claude-opus-4-6',             value: '7500'  },
    { key: 'eur_usd_rate',                             value: '108'   },
    { key: 'alert_threshold_free_eur_cents',           value: '200'   },
    { key: 'alert_threshold_pro_eur_cents',            value: '500'   },
    { key: 'alert_threshold_premium_eur_cents',        value: '1000'  },
];
async function seedAdminDefaults() {
    const data = DEFAULTS.map(d => ({ key: d.key, value: d.value, updatedBy: SYSTEM_ADMIN }));
    await prisma_1.prisma.adminConfig.createMany({ data, skipDuplicates: true });
}
