import { z } from 'zod';

/**
 * NCHQ Module 18: India Jurisdictional Pack (BNS/BNSS)
 * Sprint C4: Section 12 Structural Validation
 */

export const Section12FilingSchema = z.object({
  jurisdiction: z.object({
    state: z.string().min(1),
    district: z.string().min(1),
    court_code: z.string().regex(/^IN-[A-Z]{2}-[0-9]{2}$/, "Invalid India Court Code format (e.g. IN-DL-01)"),
  }),
  procedural_marker: z.string().includes("SEC-12", { message: "Filing must contain explicit Section 12 procedural marker." }),
  metadata: z.record(z.string(), z.any()),
});

/**
 * Validates a legal filing against Section 12 criteria.
 * @throws 422 Unprocessable Entity if validation fails.
 */
export function validateSection12Filing(data: unknown) {
  const result = Section12FilingSchema.safeParse(data);

  if (!result.success) {
    return {
      valid: false,
      error: {
        code: 'UNPROCESSABLE_ENTITY',
        message: 'Section 12 Jurisdictional Validation Failed.',
        details: result.error.format(),
        ndl_tokens: {
          background: '#FDFBF7',
          text: '#111111'
        }
      }
    };
  }

  return { valid: true, data: result.data };
}
