import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "doctor", "patient"]).default("patient").notNull(),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Doctor Profiles - Extended information for healthcare providers
 */
export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 100 }).notNull().unique(),
  specialty: varchar("specialty", { length: 100 }).notNull(),
  subSpecialties: json("subSpecialties").$type<string[]>(),
  qualifications: json("qualifications").$type<string[]>(),
  experience: int("experience"), // years
  bio: text("bio"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: int("totalReviews").default(0),
  consultationFee: decimal("consultationFee", { precision: 10, scale: 2 }),
  isVerified: boolean("isVerified").default(false),
  isAvailable: boolean("isAvailable").default(true),
  availableSlots: json("availableSlots").$type<Record<string, string[]>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

/**
 * Patient Profiles - Medical history and health information
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  bloodType: varchar("bloodType", { length: 5 }),
  height: decimal("height", { precision: 5, scale: 2 }), // cm
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  allergies: json("allergies").$type<string[]>(),
  medicalConditions: json("medicalConditions").$type<string[]>(),
  medications: json("medications").$type<string[]>(),
  emergencyContact: varchar("emergencyContact", { length: 20 }),
  insuranceProvider: varchar("insuranceProvider", { length: 100 }),
  insurancePolicyNumber: varchar("insurancePolicyNumber", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Medical Specialties - Available medical fields
 */
export const specialties = mysqlTable("specialties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  doctorCount: int("doctorCount").default(0),
});

export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = typeof specialties.$inferInsert;

/**
 * Appointments - Booking and scheduling
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  appointmentDate: timestamp("appointmentDate").notNull(),
  duration: int("duration").default(30), // minutes
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no-show"]).default("scheduled"),
  consultationType: mysqlEnum("consultationType", ["in-person", "video", "phone"]).default("video"),
  notes: text("notes"),
  symptoms: json("symptoms").$type<string[]>(),
  diagnosis: text("diagnosis"),
  prescription: text("prescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Medical Records - Patient health history
 */
export const medicalRecords = mysqlTable("medicalRecords", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  recordType: mysqlEnum("recordType", ["lab-report", "imaging", "prescription", "diagnosis", "vaccination", "surgery"]),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("fileUrl"),
  recordDate: timestamp("recordDate"),
  doctorId: int("doctorId"),
  visibility: mysqlEnum("visibility", ["private", "doctors", "public"]).default("doctors"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

/**
 * Prescriptions - Medication management
 */
export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId"),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  medications: json("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>>(),
  notes: text("notes"),
  issuedDate: timestamp("issuedDate").defaultNow(),
  expiryDate: timestamp("expiryDate"),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

/**
 * Health Metrics - Vital signs and health tracking
 */
export const healthMetrics = mysqlTable("healthMetrics", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  bloodPressure: varchar("bloodPressure", { length: 20 }), // 120/80
  heartRate: int("heartRate"), // bpm
  temperature: decimal("temperature", { precision: 4, scale: 1 }), // celsius
  bloodSugar: decimal("bloodSugar", { precision: 5, scale: 2 }), // mg/dL
  oxygenSaturation: int("oxygenSaturation"), // percentage
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertHealthMetric = typeof healthMetrics.$inferInsert;

/**
 * Doctor Reviews - Patient feedback and ratings
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: int("doctorId").notNull(),
  patientId: int("patientId").notNull(),
  appointmentId: int("appointmentId"),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  isAnonymous: boolean("isAnonymous").default(false),
  helpful: int("helpful").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * AI Diagnostics - AI-powered health analysis
 */
export const aiDiagnostics = mysqlTable("aiDiagnostics", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  symptoms: json("symptoms").$type<string[]>(),
  medicalHistory: json("medicalHistory").$type<string[]>(),
  analysis: text("analysis"),
  possibleConditions: json("possibleConditions").$type<Array<{
    condition: string;
    probability: number;
    description: string;
  }>>(),
  recommendations: json("recommendations").$type<string[]>(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  status: mysqlEnum("status", ["pending", "completed", "reviewed"]).default("pending"),
  reviewedByDoctor: int("reviewedByDoctor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIDiagnostic = typeof aiDiagnostics.$inferSelect;
export type InsertAIDiagnostic = typeof aiDiagnostics.$inferInsert;

/**
 * Hospitals & Clinics - Healthcare facilities
 */
export const facilities = mysqlTable("facilities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["hospital", "clinic", "diagnostic-center", "pharmacy"]).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  specialties: json("specialties").$type<string[]>(),
  operatingHours: json("operatingHours").$type<Record<string, string>>(),
  isVerified: boolean("isVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = typeof facilities.$inferInsert;

/**
 * Skin Analysis Results - Dermatology AI analysis
 */
export const skinAnalysisResults = mysqlTable("skinAnalysisResults", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  imageUrl: text("imageUrl"),
  analysisType: varchar("analysisType", { length: 100 }),
  conditions: json("conditions").$type<Array<{
    name: string;
    confidence: number;
    severity: string;
    description: string;
  }>>(),
  recommendations: json("recommendations").$type<string[]>(),
  followUpRequired: boolean("followUpRequired").default(false),
  dermatologistReview: text("dermatologistReview"),
  reviewedByDoctor: int("reviewedByDoctor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SkinAnalysisResult = typeof skinAnalysisResults.$inferSelect;
export type InsertSkinAnalysisResult = typeof skinAnalysisResults.$inferInsert;

/**
 * AI Conversation History - Multi-message conversation persistence
 */
export const conversationHistory = mysqlTable("conversationHistory", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  conversationId: varchar("conversationId", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  tokens: int("tokens").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversationHistory = typeof conversationHistory.$inferSelect;
export type InsertConversationHistory = typeof conversationHistory.$inferInsert;

/**
 * Prescriptions - Medication prescriptions from doctors
 */
export const prescriptionDetails = mysqlTable("prescriptionDetails", {
  id: int("id").autoincrement().primaryKey(),
  prescriptionId: int("prescriptionId").notNull(),
  medicationName: varchar("medicationName", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 100 }),
  instructions: text("instructions"),
  sideEffects: json("sideEffects").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrescriptionDetail = typeof prescriptionDetails.$inferSelect;
export type InsertPrescriptionDetail = typeof prescriptionDetails.$inferInsert;

/**
 * Telemedicine Consultations - Video/audio consultations
 */
export const telemedicineConsultations = mysqlTable("telemedicineConsultations", {
  id: int("id").autoincrement().primaryKey(),
  appointmentId: int("appointmentId").notNull(),
  patientId: int("patientId").notNull(),
  doctorId: int("doctorId").notNull(),
  consultationType: mysqlEnum("consultationType", ["video", "audio", "chat"]).notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  duration: int("duration"), // minutes
  status: mysqlEnum("status", ["scheduled", "ongoing", "completed", "cancelled"]).default("scheduled"),
  roomId: varchar("roomId", { length: 255 }),
  recordingUrl: text("recordingUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelemedicineConsultation = typeof telemedicineConsultations.$inferSelect;
export type InsertTelemedicineConsultation = typeof telemedicineConsultations.$inferInsert;

/**
 * Health Analytics - Aggregated health metrics and trends
 */
export const healthAnalytics = mysqlTable("healthAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  date: timestamp("date").notNull(),
  averageBloodPressure: varchar("averageBloodPressure", { length: 20 }),
  averageHeartRate: decimal("averageHeartRate", { precision: 5, scale: 1 }),
  averageTemperature: decimal("averageTemperature", { precision: 5, scale: 2 }),
  averageBloodSugar: decimal("averageBloodSugar", { precision: 5, scale: 1 }),
  averageOxygenSaturation: decimal("averageOxygenSaturation", { precision: 5, scale: 1 }),
  averageWeight: decimal("averageWeight", { precision: 5, scale: 2 }),
  metricsCount: int("metricsCount").default(0),
  trend: mysqlEnum("trend", ["improving", "stable", "declining"]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HealthAnalytic = typeof healthAnalytics.$inferSelect;
export type InsertHealthAnalytic = typeof healthAnalytics.$inferInsert;

/**
 * Medication Reminders - Medication reminder notifications
 */
export const medicationReminders = mysqlTable("medicationReminders", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  prescriptionDetailId: int("prescriptionDetailId").notNull(),
  medicationName: varchar("medicationName", { length: 255 }).notNull(),
  reminderTime: varchar("reminderTime", { length: 10 }).notNull(), // HH:MM format
  daysOfWeek: json("daysOfWeek").$type<number[]>(), // 0-6 for Sunday-Saturday
  isActive: boolean("isActive").default(true),
  lastReminderSent: timestamp("lastReminderSent"),
  reminderCount: int("reminderCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicationReminder = typeof medicationReminders.$inferSelect;
export type InsertMedicationReminder = typeof medicationReminders.$inferInsert;
