import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateEvidence } from "./evidence";
import { ClinicianHandoffSchema, ConversationReplySchema, LIMITATION } from "./schemas";
import { semanticBoundaryViolations } from "./semanticValidation";
import type { PatientMessage } from "./sessionStore";

const id = randomUUID();
const message: PatientMessage = { id, role: "patient", content: "I have a headache since morning", createdAt: new Date().toISOString() };
const evidence = { sourceMessageId:id, quote:"headache since morning", kind:"direct" as const, requiresConfirmation:false, targetField:"summary" as const };
const appointment = { requested:false, reason:null, recommendedSpecialty:null, confirmationRequired:true as const, booked:false as const };
const baseReply = { message:"Please share whether this changed suddenly.", followUpQuestion:"Did it start suddenly?", informationGaps:["Onset"], careLevel:"routine_clinician_review" as const, careRationale:"More detail is needed.", warningSigns:[], emergencyGuidance:null, appointmentHandoff:appointment, evidence:[evidence], clinicianReviewRequired:true as const, limitations:LIMITATION };

describe("structured output consistency", () => {
  it("accepts a consistent conversation reply", () => expect(ConversationReplySchema.safeParse(baseReply).success).toBe(true));
  it("rejects emergency care without warning signs", () => expect(ConversationReplySchema.safeParse({...baseReply,careLevel:"emergency_services",emergencyGuidance:"Seek care"}).success).toBe(false));
  it("rejects emergency care without guidance", () => expect(ConversationReplySchema.safeParse({...baseReply,careLevel:"emergency_services",warningSigns:["warning"],emergencyGuidance:null}).success).toBe(false));
  it("requires clinician review", () => expect(ConversationReplySchema.safeParse({...baseReply,clinicianReviewRequired:false}).success).toBe(false));
  it("requires the exact limitation", () => expect(ConversationReplySchema.safeParse({...baseReply,limitations:"AI advice"}).success).toBe(false));
  it("requires appointment reason and specialty", () => expect(ConversationReplySchema.safeParse({...baseReply,appointmentHandoff:{...appointment,requested:true}}).success).toBe(false));
  it("rejects fabricated unrequested appointment details", () => expect(ConversationReplySchema.safeParse({...baseReply,appointmentHandoff:{...appointment,reason:"follow up"}}).success).toBe(false));
  it("requires confirmation and forbids booked=true", () => expect(ConversationReplySchema.safeParse({...baseReply,appointmentHandoff:{...appointment,confirmationRequired:false,booked:true}}).success).toBe(false));
  it("requires final handoff evidence", () => expect(ClinicianHandoffSchema.safeParse({title:"Clinician-review symptom-intake draft",summary:"Summary",reportedSymptoms:[],timeline:null,relevantHistory:[],reportedMedications:[],reportedAllergies:[],informationGaps:[],warningSigns:[],careLevel:"routine_clinician_review",careRationale:"Review",emergencyGuidance:null,patientNextSteps:[],questionsForClinician:[],appointmentHandoff:appointment,evidence:[],clinicianReviewRequired:true,limitations:LIMITATION}).success).toBe(false));
});

describe("semantic boundary", () => {
  it.each(["The diagnosis is flu","There is an 80% probability","Take 20 mg daily","Your doctor already reviewed this","Your appointment has been booked","An ambulance has been dispatched"])("rejects prohibited claim: %s", text => expect(semanticBoundaryViolations([text]).length).toBeGreaterThan(0));
  it("does not reject the required disclaimer", () => expect(semanticBoundaryViolations([LIMITATION])).toEqual([]));
  it("does not reject patient-reported medication history", () => expect(semanticBoundaryViolations(["Patient reports taking a previously prescribed medicine."])).toEqual([]));
});

describe("evidence resolution", () => {
  it("resolves a direct quote", () => expect(validateEvidence([evidence],[message])).toEqual([]));
  it("rejects an invalid message ID", () => expect(validateEvidence([{...evidence,sourceMessageId:randomUUID()}],[message])).toHaveLength(1));
  it("rejects a direct quote absent from the source", () => expect(validateEvidence([{...evidence,quote:"chest pain"}],[message])).toHaveLength(1));
  it("accepts translated evidence only with confirmation", () => expect(validateEvidence([{...evidence,kind:"translated",requiresConfirmation:true}],[message])).toEqual([]));
  it("accepts inferred evidence only with confirmation", () => expect(validateEvidence([{...evidence,kind:"inferred",requiresConfirmation:true}],[message])).toEqual([]));
});
