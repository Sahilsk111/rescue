import 'dotenv/config';
import express from 'express';
import {
  ALLOWED_ADOPTION_STATUSES,
  ALLOWED_ANIMAL_CATEGORIES,
  ALLOWED_CONDITIONS,
  ALLOWED_REPORT_TYPES,
  ALLOWED_STATUSES,
  createAdoptionRequest,
  createAnimal,
  createReport,
  createVolunteer,
  deleteAdoptionRequest,
  deleteAnimal,
  deleteReport,
  deleteVolunteer,
  findUserByEmail,
  getOrCreateFirebaseUser,
  getStats,
  listActiveAlerts,
  listAdoptionRequests,
  listAnimals,
  listReports,
  listVolunteers,
  promoteReportToAnimal,
  updateAdoptionRequestStatus,
  updateAnimal,
  updateAnimalStatus,
  updateReportStatus,
} from './db/repository.ts';
import { signAdminToken, verifyPassword } from './lib/auth-token.ts';
import { adminAuth } from './lib/firebase-admin.ts';
import { requireAdmin, resolveAdminFromHeader, type AuthRequest } from './middleware/auth.ts';

function parsePositiveInt(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? '').trim().slice(0, maxLen);
}

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true, limit: '6mb' }));

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Public Stats ---
  app.get('/api/stats', async (_req, res) => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load stats';
      res.status(500).json({ error: message });
    }
  });

  // --- Admin Auth ---
  app.post('/api/admin/login', async (req, res) => {
    try {
      const email = cleanText(req.body?.email, 160).toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await findUserByEmail(email);
      if (!user || user.role !== 'admin' || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = signAdminToken({
        uid: user.uid,
        email: user.email,
        role: 'admin',
      });

      return res.json({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/firebase-login', async (req, res) => {
    try {
      const idToken = cleanText(req.body?.idToken, 4096);
      if (!idToken) {
        return res.status(400).json({ error: 'Missing Firebase ID token.' });
      }
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (!decoded.email) {
        return res.status(401).json({ error: 'Account email not available.' });
      }
      const user = await getOrCreateFirebaseUser(decoded.uid, decoded.email);
      if (user.role !== 'admin') {
        return res.status(403).json({
          error:
            'This Google account does not have Admin permissions. Sign in with your Admin email and password.',
        });
      }
      return res.json({
        token: idToken,
        user: {
          uid: user.uid,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Firebase admin login failed:', error);
      return res.status(401).json({ error: 'Unable to verify Google sign-in token.' });
    }
  });

  app.get('/api/admin/me', requireAdmin, (req: AuthRequest, res) => {
    res.json({ user: req.adminUser });
  });

  // --- Animals (Public read, Admin CRUD) ---
  app.get('/api/animals', async (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const list = await listAnimals(category);
      res.json(list);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load animals';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/animals', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const name = cleanText(req.body?.name, 100);
      const category = cleanText(req.body?.category, 30);
      const age = cleanText(req.body?.age, 40) || 'Unknown';
      const gender = cleanText(req.body?.gender, 20) || 'Male';
      const vaccinated = req.body?.vaccinated === 'Yes' ? 'Yes' : 'No';
      const location = cleanText(req.body?.location, 160) || 'Jammu';
      const photoUrl = cleanText(req.body?.photoUrl, 1_500_000);
      const status = cleanText(req.body?.status, 40) || 'Reported';
      const description = cleanText(req.body?.description, 1000);

      if (!name) {
        return res.status(400).json({ error: 'Animal name is required.' });
      }
      if (!ALLOWED_ANIMAL_CATEGORIES.includes(category as (typeof ALLOWED_ANIMAL_CATEGORIES)[number])) {
        return res.status(400).json({ error: 'Invalid animal category.' });
      }
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }

      const created = await createAnimal({
        name,
        category,
        age,
        gender,
        vaccinated,
        location,
        photoUrl,
        status,
        description,
      });
      return res.status(201).json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save animal';
      return res.status(500).json({ error: message });
    }
  });

  app.put('/api/animals/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid animal ID.' });

      const name = cleanText(req.body?.name, 100);
      const category = cleanText(req.body?.category, 30);
      const age = cleanText(req.body?.age, 40) || 'Unknown';
      const gender = cleanText(req.body?.gender, 20) || 'Male';
      const vaccinated = req.body?.vaccinated === 'Yes' ? 'Yes' : 'No';
      const location = cleanText(req.body?.location, 160) || 'Jammu';
      const photoUrl = cleanText(req.body?.photoUrl, 1_500_000);
      const status = cleanText(req.body?.status, 40) || 'Reported';
      const description = cleanText(req.body?.description, 1000);

      if (!name) return res.status(400).json({ error: 'Animal name is required.' });
      if (!ALLOWED_ANIMAL_CATEGORIES.includes(category as (typeof ALLOWED_ANIMAL_CATEGORIES)[number])) {
        return res.status(400).json({ error: 'Invalid animal category.' });
      }
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }

      const updated = await updateAnimal(id, {
        name,
        category,
        age,
        gender,
        vaccinated,
        location,
        photoUrl,
        status,
        description,
      });
      if (!updated) return res.status(404).json({ error: 'Animal not found.' });
      return res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update animal';
      return res.status(500).json({ error: message });
    }
  });

  app.patch('/api/animals/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid animal ID.' });
      const status = cleanText(req.body?.status, 40);
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }
      const updated = await updateAnimalStatus(id, status);
      if (!updated) return res.status(404).json({ error: 'Animal not found.' });
      return res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/animals/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid animal ID.' });
      const removed = await deleteAnimal(id);
      if (!removed) return res.status(404).json({ error: 'Animal not found.' });
      return res.json({ deleted: true, id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete animal';
      return res.status(500).json({ error: message });
    }
  });

  // --- Reports & Live Volunteer Alerts ---
  app.post('/api/reports', async (req, res) => {
    try {
      const animalType = cleanText(req.body?.animalType, 30);
      const condition = cleanText(req.body?.condition, 40);
      const location = cleanText(req.body?.location, 240);
      const mapPin = cleanText(req.body?.mapPin, 500);
      const description = cleanText(req.body?.description, 1500);
      const reporterName = cleanText(req.body?.reporterName, 120);
      const reporterPhone = cleanText(req.body?.reporterPhone, 30);
      const photoData = String(req.body?.photoData ?? '').trim();

      if (
        !photoData ||
        (!photoData.startsWith('data:image/') &&
          !photoData.startsWith('https://') &&
          !photoData.startsWith('http://'))
      ) {
        return res.status(400).json({ error: 'A valid animal photo is required.' });
      }
      if (photoData.length > 3_500_000) {
        return res.status(400).json({ error: 'Photo is too large. Please upload a smaller image.' });
      }
      if (!ALLOWED_REPORT_TYPES.includes(animalType as (typeof ALLOWED_REPORT_TYPES)[number])) {
        return res.status(400).json({ error: 'Animal type must be Dog or Cat.' });
      }
      if (!ALLOWED_CONDITIONS.includes(condition as (typeof ALLOWED_CONDITIONS)[number])) {
        return res.status(400).json({ error: 'Please choose a valid animal condition.' });
      }
      if (!location || !reporterName || !reporterPhone) {
        return res
          .status(400)
          .json({ error: 'Location, reporter name, and phone number are required.' });
      }

      const result = await createReport({
        animalType,
        condition,
        location,
        mapPin,
        description,
        reporterName,
        reporterPhone,
        photoData,
      });

      return res.status(201).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit rescue report';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/alerts', async (req, res) => {
    try {
      const area = typeof req.query.area === 'string' ? req.query.area : undefined;
      const alerts = await listActiveAlerts(area);
      res.json(alerts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load alerts';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/reports', requireAdmin, async (_req: AuthRequest, res) => {
    try {
      const list = await listReports();
      res.json(list);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load reports';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/reports/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid report ID.' });
      const status = cleanText(req.body?.status, 40);
      const assignedVolunteer =
        typeof req.body?.assignedVolunteer === 'string'
          ? cleanText(req.body.assignedVolunteer, 120)
          : undefined;
      if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
        return res.status(400).json({ error: 'Invalid status value.' });
      }
      const updated = await updateReportStatus(id, status, assignedVolunteer);
      if (!updated) return res.status(404).json({ error: 'Report not found.' });
      return res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update report status';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/reports/:id/promote', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid report ID.' });
      const name = typeof req.body?.name === 'string' ? cleanText(req.body.name, 100) : undefined;
      const animal = await promoteReportToAnimal(id, name);
      if (!animal) return res.status(404).json({ error: 'Report not found.' });
      return res.status(201).json(animal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to promote report';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/reports/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid report ID.' });
      const removed = await deleteReport(id);
      if (!removed) return res.status(404).json({ error: 'Report not found.' });
      return res.json({ deleted: true, id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete report';
      return res.status(500).json({ error: message });
    }
  });

  // --- Adoption Requests ---
  app.post('/api/adoptions', async (req, res) => {
    try {
      const animalId = parsePositiveInt(String(req.body?.animalId ?? ''));
      const applicantName = cleanText(req.body?.applicantName, 120);
      const applicantPhone = cleanText(req.body?.applicantPhone, 30);
      const reason = cleanText(req.body?.reason, 1000);

      if (!animalId) return res.status(400).json({ error: 'Valid animal ID is required.' });
      if (!applicantName || !applicantPhone) {
        return res.status(400).json({ error: 'Your name and phone number are required.' });
      }

      const created = await createAdoptionRequest({
        animalId,
        applicantName,
        applicantPhone,
        reason,
      });
      if (!created) return res.status(404).json({ error: 'Animal not found.' });
      return res.status(201).json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save adoption request';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/adoptions', requireAdmin, async (_req: AuthRequest, res) => {
    try {
      const list = await listAdoptionRequests();
      res.json(list);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load adoption requests';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/adoptions/:id/status', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid adoption request ID.' });
      const status = cleanText(req.body?.status, 40);
      if (
        !ALLOWED_ADOPTION_STATUSES.includes(status as (typeof ALLOWED_ADOPTION_STATUSES)[number])
      ) {
        return res.status(400).json({ error: 'Invalid adoption status.' });
      }
      const updated = await updateAdoptionRequestStatus(id, status);
      if (!updated) return res.status(404).json({ error: 'Adoption request not found.' });
      return res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update adoption request';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/adoptions/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid adoption request ID.' });
      const removed = await deleteAdoptionRequest(id);
      if (!removed) return res.status(404).json({ error: 'Adoption request not found.' });
      return res.json({ deleted: true, id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete adoption request';
      return res.status(500).json({ error: message });
    }
  });

  // --- Volunteers ---
  app.get('/api/volunteers', async (req, res) => {
    try {
      const admin = await resolveAdminFromHeader(req.headers.authorization);
      const list = await listVolunteers(Boolean(admin));
      res.json(list);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load volunteers';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/volunteers', async (req, res) => {
    try {
      const name = cleanText(req.body?.name, 120);
      const phone = cleanText(req.body?.phone, 30);
      const area = cleanText(req.body?.area, 160);
      const availableDays = cleanText(req.body?.availableDays, 120);

      if (!name || !phone || !area || !availableDays) {
        return res
          .status(400)
          .json({ error: 'Name, phone, area in Jammu, and available days are required.' });
      }

      const created = await createVolunteer({
        name,
        phone,
        area,
        availableDays,
      });

      return res.status(201).json({
        id: created.id,
        name: created.name,
        area: created.area,
        availableDays: created.availableDays,
        createdAt: created.createdAt,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to register volunteer';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/volunteers/:id', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parsePositiveInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid volunteer ID.' });
      const removed = await deleteVolunteer(id);
      if (!removed) return res.status(404).json({ error: 'Volunteer not found.' });
      return res.json({ deleted: true, id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete volunteer';
      return res.status(500).json({ error: message });
    }
  });

  return app;
}
