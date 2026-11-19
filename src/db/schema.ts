import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const animals = pgTable('animals', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'Dog' | 'Cat' | 'Puppy' | 'Kitten'
  age: text('age').notNull().default('Unknown'),
  gender: text('gender').notNull().default('Unknown'), // 'Male' | 'Female'
  vaccinated: text('vaccinated').notNull().default('No'), // 'Yes' | 'No'
  location: text('location').notNull().default('Jammu'),
  photoUrl: text('photo_url').notNull().default(''),
  status: text('status').notNull().default('Reported'), // 'Reported' | 'Rescued' | 'Under Treatment' | 'Adopted'
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  animalType: text('animal_type').notNull(), // 'Dog' | 'Cat'
  condition: text('condition').notNull(), // 'Injured' | 'Sick' | 'Hungry' | 'Accident'
  location: text('location').notNull(),
  mapPin: text('map_pin').notNull().default(''),
  description: text('description').notNull().default(''),
  reporterName: text('reporter_name').notNull(),
  reporterPhone: text('reporter_phone').notNull(),
  photoData: text('photo_data').notNull(),
  status: text('status').notNull().default('Reported'), // 'Reported' | 'Rescued' | 'Under Treatment' | 'Adopted'
  assignedVolunteer: text('assigned_volunteer').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adoptionRequests = pgTable('adoption_requests', {
  id: serial('id').primaryKey(),
  animalId: integer('animal_id')
    .references(() => animals.id, { onDelete: 'cascade' })
    .notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantPhone: text('applicant_phone').notNull(),
  reason: text('reason').notNull().default(''),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Completed' | 'Declined'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const volunteers = pgTable('volunteers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  area: text('area').notNull(),
  availableDays: text('available_days').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const animalsRelations = relations(animals, ({ many }) => ({
  adoptionRequests: many(adoptionRequests),
}));

export const adoptionRequestsRelations = relations(adoptionRequests, ({ one }) => ({
  animal: one(animals, {
    fields: [adoptionRequests.animalId],
    references: [animals.id],
  }),
}));

export type UserRecord = typeof users.$inferSelect;
export type AnimalRecord = typeof animals.$inferSelect;
export type ReportRecord = typeof reports.$inferSelect;
export type AdoptionRequestRecord = typeof adoptionRequests.$inferSelect;
export type VolunteerRecord = typeof volunteers.$inferSelect;
