import { z } from "zod";

export const LIMITATION =
  "This draft is not a diagnosis, prescription, or treatment plan." as const;

export const CareLevelSchema = z.enum([
  "emergency_services",
  "urgent_clinician_review",
  "routine_clinician_review",
  "collect_more_information",
]);

export const EvidenceTargetSchema = z.enum([
  "summary",
  "reportedSymptoms",
  "timeline",
  "relevantHistory",
  "reportedMedications",
  "reportedAllergies",
  "warningSigns",
  "careRationale",
]);

export const EvidenceReferenceSchema = z
  .object({
    sourceMessageId: z.string().uuid(),
    quote: z.string().trim().min(1).max(500),
    kind: z.enum(["direct", "translated", "inferred"]),
    requiresConfirmation: z.boolean(),
    targetField: EvidenceTargetSchema,
  })
  .strict()
  .superRefine((evidence, ctx) => {
    if (evidence.kind !== "direct" && !evidence.requiresConfirmation) {
      ctx.addIssue({
        code: "custom",
        message: "Translated and inferred evidence requires patient confirmation.",
        path: ["requiresConfirmation"],
      });
    }
  });

export const AppointmentHandoffSchema = z
  .object({
    requested: z.boolean(),
    reason: z.string().trim().min(1).max(500).nullable(),
    recommendedSpecialty: z.string().trim().min(1).max(120).nullable(),
    confirmationRequired: z.literal(true),
    booked: z.literal(false),
  })
  .strict()
  .superRefine((handoff, ctx) => {
    if (handoff.requested && (!handoff.reason || !handoff.recommendedSpecialty)) {
      ctx.addIssue({
        code: "custom",
        message: "A requested handoff needs a reason and broad specialty.",
      });
    }
    if (!handoff.requested && (handoff.reason || handoff.recommendedSpecialty)) {
      ctx.addIssue({
        code: "custom",
        message: "An unrequested handoff cannot contain booking details.",
      });
    }
  });

export const AppointmentHandoffModelSchema = z
  .object({
    requested: z.boolean(),
    reason: z.string().max(500).nullable(),
    recommendedSpecialty: z.string().max(120).nullable(),
    confirmationRequired: z.literal(true),
    booked: z.literal(false),
  })
  .strict();

const emergencyConsistency = (
  value: {
    careLevel: z.infer<typeof CareLevelSchema>;
    warningSigns: string[];
    emergencyGuidance: string | null;
  },
  ctx: z.RefinementCtx
) => {
  if (
    value.careLevel === "emergency_services" &&
    (!value.emergencyGuidance || value.warningSigns.length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Emergency care requires warning signs and immediate guidance.",
    });
  }
  if (
    value.careLevel !== "emergency_services" &&
    value.emergencyGuidance?.toLowerCase().includes("dispatched")
  ) {
    ctx.addIssue({ code: "custom", message: "Emergency dispatch cannot be claimed." });
  }
};

function conversationConsistency(
  value: { careLevel: z.infer<typeof CareLevelSchema>; followUpQuestion: string | null; informationGaps: string[] },
  ctx: z.RefinementCtx
) {
  if (value.careLevel === "emergency_services" && value.followUpQuestion) {
    ctx.addIssue({ code: "custom", message: "Emergency guidance must not be replaced by a follow-up question." });
  }
  if (value.careLevel === "collect_more_information" && (!value.followUpQuestion || value.informationGaps.length === 0)) {
    ctx.addIssue({ code: "custom", message: "Collect-more-information replies need one focused question and an information gap." });
  }
  if (value.informationGaps.length > 0 && !value.followUpQuestion && value.careLevel !== "emergency_services") {
    ctx.addIssue({ code: "custom", message: "Information gaps must be paired with a focused question." });
  }
}

export const ConversationReplyModelSchema = z
  .object({
    message: z.string().trim().min(1).max(2_000),
    followUpQuestion: z.string().trim().min(1).max(500).nullable(),
    informationGaps: z.array(z.string().trim().min(1).max(300)).max(10),
    careLevel: CareLevelSchema,
    careRationale: z.string().trim().min(1).max(600),
    warningSigns: z.array(z.string().trim().min(1).max(200)).max(10),
    emergencyGuidance: z.string().trim().min(1).max(700).nullable(),
    appointmentHandoff: AppointmentHandoffModelSchema,
    evidence: z.array(EvidenceReferenceSchema).max(30),
    clinicianReviewRequired: z.literal(true),
    limitations: z.literal(LIMITATION),
  })
  .strict();

export const ConversationReplySchema = ConversationReplyModelSchema.superRefine(
  (value, ctx) => {
    emergencyConsistency(value, ctx);
    conversationConsistency(value, ctx);
    const handoff = AppointmentHandoffSchema.safeParse(value.appointmentHandoff);
    if (!handoff.success) {
      ctx.addIssue({ code: "custom", message: "Appointment handoff is inconsistent." });
    }
  }
);

export const ClinicianHandoffModelSchema = z
  .object({
    title: z.literal("Clinician-review symptom-intake draft"),
    summary: z.string().trim().min(1).max(2_000),
    reportedSymptoms: z.array(z.string().trim().min(1).max(500)).max(30),
    timeline: z.string().trim().min(1).max(1_000).nullable(),
    relevantHistory: z.array(z.string().trim().min(1).max(500)).max(20),
    reportedMedications: z.array(z.string().trim().min(1).max(300)).max(20),
    reportedAllergies: z.array(z.string().trim().min(1).max(300)).max(20),
    informationGaps: z.array(z.string().trim().min(1).max(300)).max(20),
    warningSigns: z.array(z.string().trim().min(1).max(200)).max(10),
    careLevel: CareLevelSchema,
    careRationale: z.string().trim().min(1).max(800),
    emergencyGuidance: z.string().trim().min(1).max(700).nullable(),
    patientNextSteps: z.array(z.string().trim().min(1).max(400)).max(12),
    questionsForClinician: z.array(z.string().trim().min(1).max(400)).max(12),
    appointmentHandoff: AppointmentHandoffModelSchema,
    evidence: z.array(EvidenceReferenceSchema).min(1).max(100),
    clinicianReviewRequired: z.literal(true),
    limitations: z.literal(LIMITATION),
  })
  .strict();

export const ClinicianHandoffSchema = ClinicianHandoffModelSchema.superRefine(
  (value, ctx) => {
    emergencyConsistency(value, ctx);
    const handoff = AppointmentHandoffSchema.safeParse(value.appointmentHandoff);
    if (!handoff.success) {
      ctx.addIssue({ code: "custom", message: "Appointment handoff is inconsistent." });
    }
  }
);

export type CareLevel = z.infer<typeof CareLevelSchema>;
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
export type ConversationReply = z.infer<typeof ConversationReplySchema>;
export type ClinicianHandoff = z.infer<typeof ClinicianHandoffSchema>;
