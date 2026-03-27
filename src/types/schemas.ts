/**
 * Zod schemas for runtime validation of SIMAP API responses.
 */

import { z } from "zod";

// --- Common schemas ---

export const TranslationSchema = z.object({
  de: z.string().nullish(),
  fr: z.string().nullish(),
  it: z.string().nullish(),
  en: z.string().nullish(),
});

export const PaginationSchema = z.object({
  lastItem: z.string().nullish(),
  itemsPerPage: z.number().nullish(),
});

// --- Code schemas ---

const CPVCodeBaseSchema = z.object({
  code: z.string(),
  label: TranslationSchema,
});

type CPVCodeSchema = z.infer<typeof CPVCodeBaseSchema> & {
  codes?: CPVCodeSchema[] | null;
};

export const CPVCodeSchema: z.ZodType<CPVCodeSchema> = CPVCodeBaseSchema.extend({
  codes: z.lazy(() => z.array(CPVCodeSchema)).nullish(),
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
  codes: z.array(CodeEntrySchema).nullish(),
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
  parentInstitutionId: z.string().nullish(),
});

export const InstitutionsResponseSchema = z.object({
  institutions: z.array(InstitutionSchema),
});

// --- Project search schemas ---

export const OrderAddressSchema = z
  .object({
    city: z.union([z.string(), TranslationSchema]).nullish(),
    cantonId: z.string().nullish(),
    countryId: z.string().nullish(),
    postalCode: z.string().nullish(),
    // Keep old field names for backward compatibility
    canton: z.string().nullish(),
    country: z.string().nullish(),
  })
  .passthrough();

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
  orderAddress: OrderAddressSchema.nullish(),
  lots: z.array(LotEntrySchema).nullish(),
});

export const ProjectsSearchResponseSchema = z.object({
  projects: z.array(ProjectSearchEntrySchema),
  pagination: PaginationSchema,
});

// --- Project header schemas ---

export const ProjectHeaderSchema = z.object({
  projectNumber: z.string().nullish(),
  title: TranslationSchema.nullish(),
  projectSubType: z.string().nullish(),
  processType: z.string().nullish(),
  latestPublication: z
    .object({
      publicationDate: z.string().nullish(),
      publicationNumber: z.string().nullish(),
      pubType: z.string().nullish(),
    })
    .nullish(),
  lots: z
    .array(
      z.object({
        lotNumber: z.number(),
        lotTitle: TranslationSchema,
        latestPublication: z
          .object({
            publicationNumber: z.string().nullish(),
            publicationDate: z.string().nullish(),
          })
          .nullish(),
      })
    )
    .nullish(),
});

// --- Publication details schemas ---

export const PublicationDetailsSchema = z
  .object({
    type: z.string().nullish(),
    "project-info": z
      .object({
        title: TranslationSchema.nullish(),
        description: TranslationSchema.nullish(),
      })
      .nullish(),
    procurement: z
      .object({
        estimatedValue: z
          .object({
            value: z.number(),
            currency: z.string().nullish(),
          })
          .nullish(),
        cpvCodes: z.array(z.string()).nullish(),
      })
      .nullish(),
    deadlines: z
      .object({
        offerDeadline: z.string().nullish(),
        questionDeadline: z.string().nullish(),
      })
      .nullish(),
    contact: z
      .object({
        organization: TranslationSchema.nullish(),
        contactPerson: z.string().nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish(),
      })
      .nullish(),
    decision: z
      .object({
        awardees: z
          .array(
            z.object({
              name: z.string().nullish(),
              organization: TranslationSchema.nullish(),
              price: z
                .object({
                  value: z.number(),
                  currency: z.string().nullish(),
                })
                .nullish(),
            })
          )
          .nullish(),
      })
      .nullish(),
  })
  .passthrough();

// --- Past publications schemas ---

export const PastPublicationEntrySchema = z.object({
  id: z.string(),
  publicationDate: z.string(),
  lotNumber: z.number().nullish(),
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
