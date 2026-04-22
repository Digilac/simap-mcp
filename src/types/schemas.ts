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

const PublicationCpvCodeSchema = z.object({
  code: z.string(),
  label: TranslationSchema.nullish(),
});

export const PublicationDetailsSchema = z
  .object({
    id: z.string().nullish(),
    type: z.string().nullish(),
    projectType: z.string().nullish(),
    hasProjectDocuments: z.boolean().nullish(),
    base: z
      .object({
        id: z.string().nullish(),
        type: z.string().nullish(),
        projectType: z.string().nullish(),
        projectId: z.string().nullish(),
        projectNumber: z.string().nullish(),
        publicationNumber: z.string().nullish(),
        publicationDate: z.string().nullish(),
        title: TranslationSchema.nullish(),
        processType: z.string().nullish(),
        orderType: z.string().nullish(),
        lotsType: z.string().nullish(),
        cpvCode: PublicationCpvCodeSchema.nullish(),
        procOfficeId: z.string().nullish(),
        creationLanguage: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
    "project-info": z
      .object({
        title: TranslationSchema.nullish(),
        processType: z.string().nullish(),
        orderType: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
    procurement: z
      .object({
        orderDescription: TranslationSchema.nullish(),
        cpvCode: PublicationCpvCodeSchema.nullish(),
        processType: z.string().nullish(),
        orderType: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
    dates: z
      .object({
        publicationDate: z.string().nullish(),
        offerDeadline: z.string().nullish(),
        offerOpening: z
          .object({
            dateTime: z.string().nullish(),
            ignoreTime: z.boolean().nullish(),
          })
          .passthrough()
          .nullish(),
        offerValidityDeadlineDays: z.number().nullish(),
        offerValidityDeadlineDate: z.string().nullish(),
        qnas: z
          .array(
            z
              .object({
                id: z.string().nullish(),
                date: z.string().nullish(),
                note: TranslationSchema.nullish(),
                externalLink: z.string().nullish(),
              })
              .passthrough()
          )
          .nullish(),
      })
      .passthrough()
      .nullish(),
    terms: z
      .object({
        consortiumAllowed: z.string().nullish(),
        subContractorAllowed: z.string().nullish(),
        termsType: z.string().nullish(),
        termsNote: TranslationSchema.nullish(),
        termsOfBusiness: TranslationSchema.nullish(),
        termsOfPayment: TranslationSchema.nullish(),
        remediesNotice: TranslationSchema.nullish(),
      })
      .passthrough()
      .nullish(),
    criteria: z
      .object({
        qualificationCriteriaInDocuments: z.string().nullish(),
        qualificationCriteria: z.array(z.unknown()).nullish(),
        qualificationCriteriaNote: TranslationSchema.nullish(),
        awardCriteriaSelection: z.string().nullish(),
        awardCriteria: z.array(z.unknown()).nullish(),
        awardCriteriaNote: TranslationSchema.nullish(),
      })
      .passthrough()
      .nullish(),
    publishers: z
      .array(
        z
          .object({
            id: z.string().nullish(),
            name: z.string().nullish(),
          })
          .passthrough()
      )
      .nullish(),
    lots: z.array(z.unknown()).nullish(),
    decision: z
      .object({
        awardDecisionDate: z.string().nullish(),
        numberOfSubmissions: z.number().nullish(),
        totalPriceSelection: z.string().nullish(),
        vendors: z
          .array(
            z
              .object({
                vendorId: z.string().nullish(),
                vendorName: z.string().nullish(),
                price: z
                  .object({
                    currency: z.string().nullish(),
                    price: z.number().nullish(),
                    vatType: z.string().nullish(),
                  })
                  .passthrough()
                  .nullish(),
                note: TranslationSchema.nullish(),
                rank: z.number().nullish(),
              })
              .passthrough()
          )
          .nullish(),
      })
      .passthrough()
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
