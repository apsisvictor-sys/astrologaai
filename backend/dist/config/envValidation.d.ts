type EnvCheck = {
    key: string;
    required: boolean;
    present: boolean;
};
export declare function getEnvValidationReport(): {
    nodeEnv: string;
    checkedAt: string;
    required: EnvCheck[];
    optional: EnvCheck[];
    ok: boolean;
    missingRequired: string[];
};
export {};
//# sourceMappingURL=envValidation.d.ts.map