import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adoptionRequests,
  animals,
  reports,
  users,
  volunteers,
  type AnimalRecord,
  type ReportRecord,
  type VolunteerRecord,
} from './schema.ts';
import { hashPassword } from '../lib/auth-token.ts';

export const ALLOWED_ANIMAL_CATEGORIES = ['Dog', 'Cat', 'Puppy', 'Kitten'] as const;
export const ALLOWED_STATUSES = ['Reported', 'Rescued', 'Under Treatment', 'Adopted'] as const;
export const ALLOWED_REPORT_TYPES = ['Dog', 'Cat'] as const;
export const ALLOWED_CONDITIONS = ['Injured', 'Sick', 'Hungry', 'Accident'] as const;
export const ALLOWED_ADOPTION_STATUSES = ['Pending', 'Approved', 'Completed', 'Declined'] as const;

const DEFAULT_ANIMALS = [
  {
    name: 'Moti',
    category: 'Dog',
    age: '2 yrs',
    gender: 'Male',
    vaccinated: 'Yes',
    location: 'Janipur, Jammu',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
    status: 'Under Treatment',
    description: 'Friendly, rescued from road.',
  },
  {
    name: 'Simran',
    category: 'Cat',
    age: '1 yr',
    gender: 'Female',
    vaccinated: 'Yes',
    location: 'Gandhi Nagar, Jammu',
    photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
    status: 'Rescued',
    description: 'Calm indoor cat.',
  },
  {
    name: 'Tuffy',
    category: 'Puppy',
    age: '6 months',
    gender: 'Male',
    vaccinated: 'No',
    location: 'Trikuta Nagar, Jammu',
    photoUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
    status: 'Reported',
    description: 'Playful puppy.',
  },
  {
    name: 'Kitty',
    category: 'Kitten',
    age: '3 months',
    gender: 'Female',
    vaccinated: 'No',
    location: 'Talab Tillo, Jammu',
    photoUrl: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600',
    status: 'Reported',
    description: 'Tiny kitten.',
  },
];

let seedPromise: Promise<void> | null = null;

export function ensureInitialDataSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        // Seed default admin account if not present
        await db
          .insert(users)
          .values({
            uid: 'admin-default',
            email: 'admin@gmail.com',
            passwordHash: hashPassword('Rescue@100'),
            role: 'admin',
          })
          .onConflictDoNothing();

        // Seed starter adoptable animals only if the table is completely empty
        const existingAnimals = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(animals);
        const count = existingAnimals[0]?.count ?? 0;
        if (count === 0) {
          await db.insert(animals).values(DEFAULT_ANIMALS);
        }
      } catch (error) {
        seedPromise = null;
        console.error('Failed to seed initial database records:', error);
        throw new Error('Database initialization failed. Please try again later.', {
          cause: error,
        });
      }
    })();
  }
  return seedPromise;
}

export async function getOrCreateFirebaseUser(uid: string, email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const existing = existingByEmail[0];
      if (existing.uid !== uid && existing.uid !== 'admin-default') {
        const updated = await db
          .update(users)
          .set({ uid })
          .where(eq(users.id, existing.id))
          .returning();
        return updated[0];
      }
      return existing;
    }

    const defaultRole = normalizedEmail === 'admin@gmail.com' ? 'admin' : 'user';
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        role: defaultRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: normalizedEmail },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed (getOrCreateFirebaseUser):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  try {
    await ensureInitialDataSeeded();
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed (findUserByEmail):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getStats() {
  try {
    await ensureInitialDataSeeded();
    const [allAnimals, allReports, adoptionCountRows, volunteerCountRows] = await Promise.all([
      db.select({ status: animals.status }).from(animals),
      db.select({ status: reports.status }).from(reports),
      db.select({ count: sql<number>`count(*)::int` }).from(adoptionRequests),
      db.select({ count: sql<number>`count(*)::int` }).from(volunteers),
    ]);

    const rescuedAnimals = allAnimals.filter((a) =>
      ['Rescued', 'Under Treatment', 'Adopted'].includes(a.status)
    ).length;
    const rescuedReports = allReports.filter((r) =>
      ['Rescued', 'Under Treatment', 'Adopted'].includes(r.status)
    ).length;
    const adoptedAnimals = allAnimals.filter((a) => a.status === 'Adopted').length;
    const activeAlerts = allReports.filter((r) =>
      ['Reported', 'Rescued', 'Under Treatment'].includes(r.status)
    ).length;

    return {
      rescued: rescuedAnimals + rescuedReports,
      adopted: adoptedAnimals,
      volunteers: volunteerCountRows[0]?.count ?? 0,
      totalReports: allReports.length,
      totalAnimals: allAnimals.length,
      totalAdoptions: adoptionCountRows[0]?.count ?? 0,
      activeAlerts,
    };
  } catch (error) {
    console.error('Database query failed (getStats):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listAnimals(category?: string): Promise<AnimalRecord[]> {
  try {
    await ensureInitialDataSeeded();
    if (category && category !== 'All') {
      return await db
        .select()
        .from(animals)
        .where(eq(animals.category, category))
        .orderBy(desc(animals.createdAt), desc(animals.id));
    }
    return await db
      .select()
      .from(animals)
      .orderBy(desc(animals.createdAt), desc(animals.id));
  } catch (error) {
    console.error('Database query failed (listAnimals):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createAnimal(input: {
  name: string;
  category: string;
  age: string;
  gender: string;
  vaccinated: string;
  location: string;
  photoUrl: string;
  status: string;
  description: string;
}): Promise<AnimalRecord> {
  try {
    const inserted = await db.insert(animals).values(input).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed (createAnimal):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAnimal(
  id: number,
  input: {
    name: string;
    category: string;
    age: string;
    gender: string;
    vaccinated: string;
    location: string;
    photoUrl: string;
    status: string;
    description: string;
  }
): Promise<AnimalRecord | null> {
  try {
    const updated = await db
      .update(animals)
      .set(input)
      .where(eq(animals.id, id))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed (updateAnimal):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAnimalStatus(id: number, status: string): Promise<AnimalRecord | null> {
  try {
    const updated = await db
      .update(animals)
      .set({ status })
      .where(eq(animals.id, id))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed (updateAnimalStatus):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteAnimal(id: number): Promise<boolean> {
  try {
    const deleted = await db.delete(animals).where(eq(animals.id, id)).returning({ id: animals.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed (deleteAnimal):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

const GENERIC_LOCATION_STOPWORDS = new Set([
  'jammu',
  'near',
  'road',
  'rd',
  'street',
  'st',
  'lane',
  'chowk',
  'main',
  'bazar',
  'bazaar',
  'bus',
  'stand',
  'stop',
  'opposite',
  'opp',
  'behind',
  'in',
  'at',
  'of',
  'the',
  'and',
  'area',
  'jammu&kashmir',
  'jk',
]);

function tokenizeArea(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !GENERIC_LOCATION_STOPWORDS.has(token));
}

export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function buildRescueWhatsAppMessage(report: {
  id?: number;
  animalType: string;
  condition: string;
  location: string;
  mapPin?: string;
  description?: string;
  reporterName?: string;
  reporterPhone?: string;
}): string {
  const lines = [
    `RESCUE ALERT - Rescue Paws Jammu${report.id ? ` (#${report.id})` : ''}`,
    `Animal: ${report.animalType} (${report.condition})`,
    `Location: ${report.location}`,
  ];
  if (report.mapPin) lines.push(`Map Pin: ${report.mapPin}`);
  if (report.description) lines.push(`Details: ${report.description}`);
  if (report.reporterName && report.reporterPhone) {
    lines.push(`Reporter: ${report.reporterName} (${report.reporterPhone})`);
  }
  lines.push('Please respond if you can help rescue this animal.');
  return lines.join('\n');
}

export interface MatchedVolunteerAlert {
  id: number;
  name: string;
  area: string;
  availableDays: string;
  matchType: 'area' | 'city';
  whatsappUrl: string;
}

export function matchVolunteersForLocation(
  location: string,
  allVolunteers: VolunteerRecord[],
  whatsappMessage: string
): MatchedVolunteerAlert[] {
  const locationLower = location.toLowerCase();
  const locationTokens = tokenizeArea(location);

  const areaMatches: MatchedVolunteerAlert[] = [];
  const cityFallback: MatchedVolunteerAlert[] = [];

  for (const vol of allVolunteers) {
    const volAreaLower = vol.area.toLowerCase();
    const volTokens = tokenizeArea(vol.area);
    const directSubMatch =
      (volAreaLower.length >= 3 && locationLower.includes(volAreaLower)) ||
      (locationLower.length >= 3 && volAreaLower.includes(locationLower));
    const tokenOverlap = volTokens.some((vt) =>
      locationTokens.some((lt) => lt === vt || lt.includes(vt) || vt.includes(lt))
    );

    const waNumber = normalizePhoneForWhatsApp(vol.phone);
    const whatsappUrl = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(whatsappMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    if (directSubMatch || tokenOverlap) {
      areaMatches.push({
        id: vol.id,
        name: vol.name,
        area: vol.area,
        availableDays: vol.availableDays,
        matchType: 'area',
        whatsappUrl,
      });
    } else {
      cityFallback.push({
        id: vol.id,
        name: vol.name,
        area: vol.area,
        availableDays: vol.availableDays,
        matchType: 'city',
        whatsappUrl,
      });
    }
  }

  return areaMatches.length > 0 ? areaMatches.slice(0, 6) : cityFallback.slice(0, 4);
}

export async function createReport(input: {
  animalType: string;
  condition: string;
  location: string;
  mapPin: string;
  description: string;
  reporterName: string;
  reporterPhone: string;
  photoData: string;
}) {
  try {
    const inserted = await db
      .insert(reports)
      .values({
        ...input,
        status: 'Reported',
      })
      .returning();
    const created = inserted[0];

    const allVolunteers = await db
      .select()
      .from(volunteers)
      .orderBy(desc(volunteers.createdAt));

    const whatsappMessage = buildRescueWhatsAppMessage(created);
    const matchedVolunteers = matchVolunteersForLocation(
      created.location,
      allVolunteers,
      whatsappMessage
    );

    return {
      report: created,
      matchedVolunteers,
      whatsappMessage,
      generalWhatsappUrl: `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    };
  } catch (error) {
    console.error('Database query failed (createReport):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listReports(): Promise<ReportRecord[]> {
  try {
    return await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt), desc(reports.id));
  } catch (error) {
    console.error('Database query failed (listReports):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listActiveAlerts(areaFilter?: string) {
  try {
    const [activeReports, allVolunteers] = await Promise.all([
      db
        .select()
        .from(reports)
        .where(inArray(reports.status, ['Reported', 'Rescued', 'Under Treatment']))
        .orderBy(desc(reports.createdAt), desc(reports.id)),
      db.select().from(volunteers).orderBy(desc(volunteers.createdAt)),
    ]);

    const normalizedFilter = (areaFilter || '').trim().toLowerCase();
    const filtered = normalizedFilter
      ? activeReports.filter(
          (r) =>
            r.location.toLowerCase().includes(normalizedFilter) ||
            r.description.toLowerCase().includes(normalizedFilter) ||
            r.animalType.toLowerCase().includes(normalizedFilter)
        )
      : activeReports;

    return filtered.map((r) => {
      const publicMessage = buildRescueWhatsAppMessage({
        id: r.id,
        animalType: r.animalType,
        condition: r.condition,
        location: r.location,
        mapPin: r.mapPin,
        description: r.description,
      });
      const matched = matchVolunteersForLocation(r.location, allVolunteers, publicMessage);
      return {
        id: r.id,
        animalType: r.animalType,
        condition: r.condition,
        location: r.location,
        mapPin: r.mapPin,
        description: r.description,
        photoData: r.photoData,
        status: r.status,
        assignedVolunteer: r.assignedVolunteer,
        createdAt: r.createdAt,
        matchedVolunteerCount: matched.filter((v) => v.matchType === 'area').length,
        matchedVolunteers: matched,
        whatsappShareUrl: `https://wa.me/?text=${encodeURIComponent(publicMessage)}`,
      };
    });
  } catch (error) {
    console.error('Database query failed (listActiveAlerts):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateReportStatus(
  id: number,
  status: string,
  assignedVolunteer?: string
): Promise<ReportRecord | null> {
  try {
    const updateData: { status: string; assignedVolunteer?: string } = { status };
    if (typeof assignedVolunteer === 'string') {
      updateData.assignedVolunteer = assignedVolunteer;
    }
    const updated = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, id))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed (updateReportStatus):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteReport(id: number): Promise<boolean> {
  try {
    const deleted = await db.delete(reports).where(eq(reports.id, id)).returning({ id: reports.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed (deleteReport):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function promoteReportToAnimal(
  reportId: number,
  name?: string
): Promise<AnimalRecord | null> {
  try {
    const found = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    const report = found[0];
    if (!report) return null;

    const inserted = await db
      .insert(animals)
      .values({
        name: (name || '').trim() || `Rescued ${report.animalType} #${report.id}`,
        category: report.animalType === 'Cat' ? 'Cat' : 'Dog',
        age: 'Unknown',
        gender: 'Unknown',
        vaccinated: 'No',
        location: report.location,
        photoUrl: report.photoData,
        status: report.status === 'Reported' ? 'Rescued' : report.status,
        description: report.description || `${report.condition} ${report.animalType} rescued from ${report.location}.`,
      })
      .returning();

    if (report.status === 'Reported') {
      await db.update(reports).set({ status: 'Rescued' }).where(eq(reports.id, reportId));
    }

    return inserted[0];
  } catch (error) {
    console.error('Database query failed (promoteReportToAnimal):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createAdoptionRequest(input: {
  animalId: number;
  applicantName: string;
  applicantPhone: string;
  reason: string;
}) {
  try {
    const animalExists = await db
      .select({ id: animals.id, name: animals.name })
      .from(animals)
      .where(eq(animals.id, input.animalId))
      .limit(1);

    if (animalExists.length === 0) {
      return null;
    }

    const inserted = await db
      .insert(adoptionRequests)
      .values({
        animalId: input.animalId,
        applicantName: input.applicantName,
        applicantPhone: input.applicantPhone,
        reason: input.reason,
        status: 'Pending',
      })
      .returning();

    return {
      ...inserted[0],
      animalName: animalExists[0].name,
    };
  } catch (error) {
    console.error('Database query failed (createAdoptionRequest):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listAdoptionRequests() {
  try {
    const rows = await db
      .select({
        id: adoptionRequests.id,
        animalId: adoptionRequests.animalId,
        applicantName: adoptionRequests.applicantName,
        applicantPhone: adoptionRequests.applicantPhone,
        reason: adoptionRequests.reason,
        status: adoptionRequests.status,
        createdAt: adoptionRequests.createdAt,
        animalName: animals.name,
        animalCategory: animals.category,
        animalPhoto: animals.photoUrl,
      })
      .from(adoptionRequests)
      .leftJoin(animals, eq(adoptionRequests.animalId, animals.id))
      .orderBy(desc(adoptionRequests.createdAt), desc(adoptionRequests.id));
    return rows;
  } catch (error) {
    console.error('Database query failed (listAdoptionRequests):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateAdoptionRequestStatus(id: number, status: string) {
  try {
    const updated = await db
      .update(adoptionRequests)
      .set({ status })
      .where(eq(adoptionRequests.id, id))
      .returning();
    if (!updated[0]) return null;

    if (status === 'Completed') {
      await db
        .update(animals)
        .set({ status: 'Adopted' })
        .where(eq(animals.id, updated[0].animalId));
    }
    return updated[0];
  } catch (error) {
    console.error('Database query failed (updateAdoptionRequestStatus):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteAdoptionRequest(id: number): Promise<boolean> {
  try {
    const deleted = await db
      .delete(adoptionRequests)
      .where(eq(adoptionRequests.id, id))
      .returning({ id: adoptionRequests.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed (deleteAdoptionRequest):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function listVolunteers(includePhone = false) {
  try {
    const rows = await db
      .select()
      .from(volunteers)
      .orderBy(desc(volunteers.createdAt), desc(volunteers.id));

    if (includePhone) {
      return rows;
    }

    return rows.map((v) => ({
      id: v.id,
      name: v.name,
      area: v.area,
      availableDays: v.availableDays,
      createdAt: v.createdAt,
    }));
  } catch (error) {
    console.error('Database query failed (listVolunteers):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createVolunteer(input: {
  name: string;
  phone: string;
  area: string;
  availableDays: string;
}) {
  try {
    const inserted = await db.insert(volunteers).values(input).returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed (createVolunteer):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteVolunteer(id: number): Promise<boolean> {
  try {
    const deleted = await db
      .delete(volunteers)
      .where(eq(volunteers.id, id))
      .returning({ id: volunteers.id });
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed (deleteVolunteer):', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
