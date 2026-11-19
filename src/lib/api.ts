export interface StatsData {
  rescued: number;
  adopted: number;
  volunteers: number;
  totalReports: number;
  totalAnimals: number;
  totalAdoptions: number;
  activeAlerts: number;
}

export interface AnimalItem {
  id: number;
  name: string;
  category: 'Dog' | 'Cat' | 'Puppy' | 'Kitten' | string;
  age: string;
  gender: 'Male' | 'Female' | string;
  vaccinated: 'Yes' | 'No' | string;
  location: string;
  photoUrl: string;
  status: 'Reported' | 'Rescued' | 'Under Treatment' | 'Adopted' | string;
  description: string;
  createdAt: string;
}

export interface MatchedVolunteer {
  id: number;
  name: string;
  area: string;
  availableDays: string;
  matchType: 'area' | 'city';
  whatsappUrl: string;
}

export interface RescueReport {
  id: number;
  animalType: string;
  condition: string;
  location: string;
  mapPin: string;
  description: string;
  reporterName: string;
  reporterPhone: string;
  photoData: string;
  status: string;
  assignedVolunteer: string;
  createdAt: string;
}

export interface ReportSubmissionResponse {
  report: RescueReport;
  matchedVolunteers: MatchedVolunteer[];
  whatsappMessage: string;
  generalWhatsappUrl: string;
}

export interface PublicRescueAlert {
  id: number;
  animalType: string;
  condition: string;
  location: string;
  mapPin: string;
  description: string;
  photoData: string;
  status: string;
  assignedVolunteer: string;
  createdAt: string;
  matchedVolunteerCount: number;
  matchedVolunteers: MatchedVolunteer[];
  whatsappShareUrl: string;
}

export interface AdoptionRequestItem {
  id: number;
  animalId: number;
  applicantName: string;
  applicantPhone: string;
  reason: string;
  status: string;
  createdAt: string;
  animalName: string | null;
  animalCategory: string | null;
  animalPhoto: string | null;
}

export interface VolunteerItem {
  id: number;
  name: string;
  phone?: string;
  area: string;
  availableDays: string;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function compressImageFile(file: File, maxDimension = 1024, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected photo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Invalid image file.'));
        }
      };
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const api = {
  getStats: () => apiRequest<StatsData>('/api/stats'),

  getAnimals: (category?: string) => {
    const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest<AnimalItem[]>(`/api/animals${query}`);
  },

  createAnimal: (
    payload: Omit<AnimalItem, 'id' | 'createdAt'>,
    token: string
  ) =>
    apiRequest<AnimalItem>(
      '/api/animals',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    ),

  updateAnimal: (
    id: number,
    payload: Omit<AnimalItem, 'id' | 'createdAt'>,
    token: string
  ) =>
    apiRequest<AnimalItem>(
      `/api/animals/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      token
    ),

  updateAnimalStatus: (id: number, status: string, token: string) =>
    apiRequest<AnimalItem>(
      `/api/animals/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token
    ),

  deleteAnimal: (id: number, token: string) =>
    apiRequest<{ deleted: boolean; id: number }>(
      `/api/animals/${id}`,
      { method: 'DELETE' },
      token
    ),

  submitReport: (payload: {
    animalType: string;
    condition: string;
    location: string;
    mapPin: string;
    description: string;
    reporterName: string;
    reporterPhone: string;
    photoData: string;
  }) =>
    apiRequest<ReportSubmissionResponse>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAlerts: (area?: string) => {
    const query = area && area.trim() ? `?area=${encodeURIComponent(area.trim())}` : '';
    return apiRequest<PublicRescueAlert[]>(`/api/alerts${query}`);
  },

  getReportsAdmin: (token: string) =>
    apiRequest<RescueReport[]>('/api/reports', {}, token),

  updateReportStatus: (
    id: number,
    status: string,
    token: string,
    assignedVolunteer?: string
  ) =>
    apiRequest<RescueReport>(
      `/api/reports/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status, assignedVolunteer }) },
      token
    ),

  promoteReportToAnimal: (id: number, name: string | undefined, token: string) =>
    apiRequest<AnimalItem>(
      `/api/reports/${id}/promote`,
      { method: 'POST', body: JSON.stringify({ name }) },
      token
    ),

  deleteReport: (id: number, token: string) =>
    apiRequest<{ deleted: boolean; id: number }>(
      `/api/reports/${id}`,
      { method: 'DELETE' },
      token
    ),

  submitAdoptionRequest: (payload: {
    animalId: number;
    applicantName: string;
    applicantPhone: string;
    reason: string;
  }) =>
    apiRequest<AdoptionRequestItem>('/api/adoptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdoptionsAdmin: (token: string) =>
    apiRequest<AdoptionRequestItem[]>('/api/adoptions', {}, token),

  updateAdoptionStatus: (id: number, status: string, token: string) =>
    apiRequest<AdoptionRequestItem>(
      `/api/adoptions/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token
    ),

  deleteAdoptionRequest: (id: number, token: string) =>
    apiRequest<{ deleted: boolean; id: number }>(
      `/api/adoptions/${id}`,
      { method: 'DELETE' },
      token
    ),

  getVolunteers: (token?: string | null) =>
    apiRequest<VolunteerItem[]>('/api/volunteers', {}, token),

  registerVolunteer: (payload: {
    name: string;
    phone: string;
    area: string;
    availableDays: string;
  }) =>
    apiRequest<VolunteerItem>('/api/volunteers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteVolunteer: (id: number, token: string) =>
    apiRequest<{ deleted: boolean; id: number }>(
      `/api/volunteers/${id}`,
      { method: 'DELETE' },
      token
    ),

  adminLogin: (email: string, password: string) =>
    apiRequest<{ token: string; user: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  adminFirebaseLogin: (idToken: string) =>
    apiRequest<{ token: string; user: AdminUser }>('/api/admin/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
};
