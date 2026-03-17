import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    password: z.ZodString;
    fullName: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    language: z.ZodOptional<z.ZodEnum<["bg", "en"]>>;
    referralSlug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName?: string | undefined;
    language?: "bg" | "en" | undefined;
    referralSlug?: string | undefined;
}, {
    email: string;
    password: string;
    fullName?: string | undefined;
    language?: "bg" | "en" | undefined;
    referralSlug?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export interface ValidationError {
    field: string;
    message: string;
}
export declare function formatZodErrors(error: z.ZodError): ValidationError[];
//# sourceMappingURL=validation.d.ts.map