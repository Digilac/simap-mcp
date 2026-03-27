/**
 * Zod schemas for runtime validation of SIMAP API responses.
 */

import { z } from "zod";

// --- Common schemas ---

export const TranslationSchema = z.object({
  de: z.string().optional(),
  fr: z.string().optional(),
  it: z.string().optional(),
  en: z.string().optional(),
});

export const PaginationSchema = z.object({
  lastItem: z.string().optional(),
  itemsPerPage: z.number().optional(),
});

// --- Code schemas ---

const CPVCodeBaseSchema = z.object({
  code: z.string(),
  label: TranslationSchema,
});

type CPVCodeSchema = z.infer<typeof CPVCodeBaseSchema> & {
  codes?: CPVCodeSchema[];
};

export const CPVCodeSchema: z.ZodType<CPVCodeSchema> = CPVCodeBaseSchema.extend({
  codes: z.lazy(() => z.array(CPVCodeSchema)).optional(),
});

export const CPVSearchResponseSchema = z.object({
  codes: z.array(CPVCodeSchema),
});

export const CodeEntrySchema = z.object({
  code: z.string(),
  label: TranslationSchema,
});

export const CodeSearchResponseSchema = z.object({
  codes: z.array(CodeEntrySchema),
});

const CodeEntryWithChildrenSchema = CodeEntrySchema.extend({
  codes: z.array(CodeEntrySchema).optional(),
});

export const CodeTreeResponseSchema = z.object({
  codes: z.array(CodeEntryWithChildrenSchema),
});

// --- Canton schemas ---

export const CantonSchema = z.object({
  id: z.string(),
  nuts3: z.string(),
});

export const CantonsResponseSchema = z.object({
  cantons: z.array(CantonSchema),
});

// --- Institution schemas ---

export const InstitutionSchema = z.object({
  id: z.string(),
  name: TranslationSchema,
  parentInstitutionId: z.string().nullable().optional(),
});

export const InstitutionsResponseSchema = z.object({
  institutions: z.array(InstitutionSchema),
});

// --- Project search schemas ---

export const OrderAddressSchema = z.object({
  city: z.string().optional(),
  canton: z.string().optional(),
  country: z.string().optional(),
});

export const LotEntrySchema = z.object({
  lotId: z.string(),
  lotNumber: z.number(),
  lotTitle: TranslationSchema,
  publicationId: z.string(),
  publicationDate: z.string(),
});

export const ProjectSearchEntrySchema = z.object({
  id: z.string(),
  title: TranslationSchema,
  projectNumber: z.string(),
  projectType: z.string(),
  projectSubType: z.string(),
  processType: z.string(),
  lotsType: z.string(),
  publicationId: z.string(),
  publicationDate: z.string(),
  publicationNumber: z.string(),
  pubType: z.string(),
  corrected: z.boolean(),
  procOfficeName: TranslationSchema,
  orderAddress: OrderAddressSchema.optional(),
  lots: z.array(LotEntrySchema).optional(),
});

export const ProjectsSearchResponseSchema = z.object({
  projects: z.array(ProjectSearchEntrySchema),
  pagination: PaginationSchema,
});

// --- Project header schemas ---

export const ProjectHeaderSchema = z.object({
  projectNumber: z.string().optional(),
  title: TranslationSchema.optional(),
  projectSubType: z.string().optional(),
  processType: z.string().optional(),
  latestPublication: z
    .object({
      publicationDate: z.string().optional(),
      publicationNumber: z.string().optional(),
      pubType: z.string().optional(),
    })
    .optional(),
  lots: z
    .array(
      z.object({
        lotNumber: z.number(),
        lotTitle: TranslationSchema,
        latestPublication: z
          .object({
            publicationNumber: z.string().optional(),
            publicationDate: z.string().optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

// --- Publication details schemas ---

export const PublicationDetailsSchema = z
  .object({
    type: z.string().optional(),
    "project-info": z
      .object({
        title: TranslationSchema.optional(),
        description: TranslationSchema.optional(),
      })
      .optional(),
    procurement: z
      .object({
        estimatedValue: z
          .object({
            value: z.number(),
            currency: z.string().optional(),
          })
          .optional(),
        cpvCodes: z.array(z.string()).optional(),
      })
      .optional(),
    deadlines: z
      .object({
        offerDeadline: z.string().optional(),
        questionDeadline: z.string().optional(),
      })
      .optional(),
    contact: z
      .object({
        organization: TranslationSchema.optional(),
        contactPerson: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    decision: z
      .object({
        awardees: z
          .array(
            z.object({
              name: z.string().optional(),
              organization: TranslationSchema.optional(),
              price: z
                .object({
                  value: z.number(),
                  currency: z.string().optional(),
                })
                .optional(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();

// --- Past publications schemas ---

export const PastPublicationEntrySchema = z.object({
  id: z.string(),
  publicationDate: z.string(),
  lotNumber: z.number().nullable().optional(),
  projectType: z.string(),
  projectSubType: z.string(),
  processType: z.string(),
  publicationNumber: z.string(),
  pubType: z.string(),
  corrected: z.boolean(),
});

export const PastPublicationsResponseSchema = z.object({
  pastPublications: z.array(PastPublicationEntrySchema),
});

// --- Procurement office schemas ---

export const ProcOfficeTypeSchema = z.enum([
  "federal",
  "cantonal",
  "inter_cantonal",
  "communal",
  "other_communal",
  "international",
]);

export const ProcOfficePublicDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ProcOfficeTypeSchema,
  institutionId: z.string(),
  compCentreId: z.string(),
});

export const ProcOfficesPublicResponseSchema = z.object({
  procOffices: z.array(ProcOfficePublicDataSchema),
});
