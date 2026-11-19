import React, { useCallback, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import {
  ArrowUpRight,
  ExternalLink,
  LogOut,
  MessageCircle,
  Pencil,
  PlusCircle,
  Shield,
  Trash2,
} from 'lucide-react';
import { FALLBACK_ANIMAL_IMAGE } from '../config';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  api,
  compressImageFile,
  type AdminUser,
  type AdoptionRequestItem,
  type AnimalItem,
  type RescueReport,
  type StatsData,
  type VolunteerItem,
} from '../lib/api';

const STATUS_OPTIONS = ['Reported', 'Rescued', 'Under Treatment', 'Adopted'] as const;
const ADOPTION_STATUS_OPTIONS = ['Pending', 'Approved', 'Completed', 'Declined'] as const;

interface AdminSectionProps {
  stats: StatsData;
  animals: AnimalItem[];
  onDataChanged: () => void;
}

export function AdminSection({ stats, animals, onDataChanged }: AdminSectionProps) {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Login state
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin data state
  const [reports, setReports] = useState<RescueReport[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionRequestItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Animal form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aName, setAName] = useState('');
  const [aCat, setACat] = useState('Dog');
  const [aAge, setAAge] = useState('');
  const [aGender, setAGender] = useState('Male');
  const [aVacc, setAVacc] = useState('No');
  const [aLoc, setALoc] = useState('Jammu');
  const [aPhoto, setAPhoto] = useState('');
  const [aStatus, setAStatus] = useState('Rescued');
  const [aDesc, setADesc] = useState('');
  const [savingAnimal, setSavingAnimal] = useState(false);

  const loadAdminData = useCallback(async (authToken: string) => {
    setLoadingAdminData(true);
    try {
      const [reps, reqs, vols] = await Promise.all([
        api.getReportsAdmin(authToken),
        api.getAdoptionsAdmin(authToken),
        api.getVolunteers(authToken),
      ]);
      setReports(reps);
      setAdoptions(reqs);
      setVolunteers(vols);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to load admin records.');
    } finally {
      setLoadingAdminData(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadAdminData(token);
    }
  }, [token, loadAdminData]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await api.adminLogin(email.trim(), password);
      setToken(res.token);
      setAdminUser(res.user);
      setPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Wrong email or password.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    setLoggingIn(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await api.adminFirebaseLogin(idToken);
      setToken(res.token);
      setAdminUser(res.user);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Google Sign-In failed. Use email & password login.'
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setToken(null);
    setAdminUser(null);
    setReports([]);
    setAdoptions([]);
    setVolunteers([]);
    try {
      await signOut(auth);
    } catch {
      // ignore if signed in via password
    }
  };

  const resetAnimalForm = () => {
    setEditingId(null);
    setAName('');
    setACat('Dog');
    setAAge('');
    setAGender('Male');
    setAVacc('No');
    setALoc('Jammu');
    setAPhoto('');
    setAStatus('Rescued');
    setADesc('');
  };

  const handleAnimalPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAPhoto(compressed);
    } catch {
      setActionMessage('Could not process the selected animal image.');
    }
  };

  const handleSaveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingAnimal(true);
    setActionMessage(null);
    try {
      const payload = {
        name: aName.trim(),
        category: aCat,
        age: aAge.trim() || 'Unknown',
        gender: aGender,
        vaccinated: aVacc,
        location: aLoc.trim() || 'Jammu',
        photoUrl: aPhoto.trim(),
        status: aStatus,
        description: aDesc.trim(),
      };

      if (editingId) {
        await api.updateAnimal(editingId, payload, token);
        setActionMessage(`Updated ${payload.name}.`);
      } else {
        await api.createAnimal(payload, token);
        setActionMessage(`Added ${payload.name} to Adopt listings.`);
      }
      resetAnimalForm();
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save animal.');
    } finally {
      setSavingAnimal(false);
    }
  };

  const startEditAnimal = (animal: AnimalItem) => {
    setEditingId(animal.id);
    setAName(animal.name);
    setACat(animal.category);
    setAAge(animal.age);
    setAGender(animal.gender);
    setAVacc(animal.vaccinated);
    setALoc(animal.location);
    setAPhoto(animal.photoUrl);
    setAStatus(animal.status);
    setADesc(animal.description);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnimalStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      await api.updateAnimalStatus(id, status, token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not update status.');
    }
  };

  const handleDeleteAnimal = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteAnimal(id, token);
      setActionMessage('Animal removed.');
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not delete animal.');
    }
  };

  const handleReportStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      await api.updateReportStatus(id, status, token);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not update report status.');
    }
  };

  const handlePromoteReport = async (report: RescueReport) => {
    if (!token) return;
    try {
      await api.promoteReportToAnimal(report.id, undefined, token);
      setActionMessage(`Report #${report.id} added to the Adopt page.`);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not promote report.');
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteReport(id, token);
      setActionMessage(`Report #${id} deleted.`);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not delete report.');
    }
  };

  const handleAdoptionStatus = async (id: number, status: string) => {
    if (!token) return;
    try {
      await api.updateAdoptionStatus(id, status, token);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not update adoption request.');
    }
  };

  const handleDeleteAdoption = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteAdoptionRequest(id, token);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not delete adoption request.');
    }
  };

  const handleDeleteVolunteer = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteVolunteer(id, token);
      await loadAdminData(token);
      onDataChanged();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not remove volunteer.');
    }
  };

  const toWaPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  };

  if (!token) {
    return (
      <section id="admin" className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md sm:p-8">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1226] text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Admin Panel Login</h2>
              <p className="text-xs text-slate-600">Rescue Paws Jammu Management</p>
            </div>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <div>
              <label htmlFor="admEmail" className="mb-1 block text-xs font-bold text-slate-700">
                Admin Email
              </label>
              <input
                id="admEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="admPass" className="mb-1 block text-xs font-bold text-slate-700">
                Password
              </label>
              <input
                id="admPass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
              />
            </div>

            {loginError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-full bg-[#0b1226] py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-65"
            >
              {loggingIn ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>OR</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={loggingIn}
            onClick={handleGoogleLogin}
            className="w-full rounded-full border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-65"
          >
            Sign in with Google
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Authorized Rescue Paws Jammu administrators only.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="admin" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Admin Panel
          </h2>
          <p className="mt-1 text-xs text-slate-600">Signed in as {adminUser?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {actionMessage && (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-950">
          {actionMessage}
        </div>
      )}

      {/* Dashboard Counters */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Total Reports</p>
          <p className="mt-1 text-3xl font-extrabold text-orange-800">{stats.totalReports}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Total Adoptions
          </p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{stats.totalAdoptions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Animals Listed</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{animals.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Volunteers</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{volunteers.length}</p>
        </div>
      </div>

      {/* Add / Edit Animal Form */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <PlusCircle className="h-5 w-5 text-orange-700" />
            {editingId ? `Edit Animal (#${editingId})` : 'Add New Animal'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetAnimalForm}
              className="text-xs font-bold text-slate-600 underline hover:text-slate-900"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSaveAnimal} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              placeholder="Name *"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            />
            <select
              value={aCat}
              onChange={(e) => setACat(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            >
              <option value="Cat">Cat</option>
              <option value="Dog">Dog</option>
              <option value="Puppy">Puppy</option>
              <option value="Kitten">Kitten</option>
            </select>
            <input
              type="text"
              value={aAge}
              onChange={(e) => setAAge(e.target.value)}
              placeholder="Age (e.g. 1 yr)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            />
            <select
              value={aGender}
              onChange={(e) => setAGender(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select
              value={aVacc}
              onChange={(e) => setAVacc(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            >
              <option value="Yes">Vaccinated: Yes</option>
              <option value="No">Vaccinated: No</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={aLoc}
              onChange={(e) => setALoc(e.target.value)}
              placeholder="Location in Jammu"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            />
            <input
              type="text"
              value={aPhoto}
              onChange={(e) => setAPhoto(e.target.value)}
              placeholder="Photo URL (or upload file ->)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleAnimalPhotoFile}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-2.5 file:py-1 file:font-semibold file:text-orange-800"
            />
            <select
              value={aStatus}
              onChange={(e) => setAStatus(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={aDesc}
              onChange={(e) => setADesc(e.target.value)}
              placeholder="Short description / medical notes"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingAnimal}
              className="rounded-full bg-gradient-to-r from-orange-700 to-orange-800 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-65"
            >
              {savingAnimal ? 'Saving...' : editingId ? 'Update Animal' : 'Save Animal'}
            </button>
          </div>
        </form>
      </div>

      {/* Incoming Rescue Reports */}
      <div className="mb-8">
        <h3 className="mb-3 text-lg font-extrabold text-slate-900">
          Incoming Rescue Reports ({reports.length})
        </h3>
        {loadingAdminData ? (
          <p className="text-sm text-slate-500">Loading reports...</p>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No rescue reports submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const mapUrlMatch = r.mapPin.match(/https?:\/\/\S+/);
              const waText = encodeURIComponent(
                `RESCUE ALERT #${r.id}\n${r.animalType} (${r.condition})\nLocation: ${r.location}\n${
                  r.mapPin ? `Pin: ${r.mapPin}\n` : ''
                }Reporter: ${r.reporterName} (${r.reporterPhone})`
              );
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex gap-3.5">
                    {r.photoData && (
                      <img
                        src={r.photoData}
                        alt="Reported animal"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                          REPORT #{r.id}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {r.animalType} — {r.condition}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{r.location}</p>
                      <p className="text-xs text-slate-600">
                        Reporter: <strong>{r.reporterName}</strong> ({r.reporterPhone})
                      </p>
                      {r.description && <p className="text-xs text-slate-600">{r.description}</p>}
                      {mapUrlMatch && (
                        <a
                          href={mapUrlMatch[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 underline"
                        >
                          Open Google Map Pin <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Change status for report ${r.id}`}
                      value={r.status}
                      onChange={(e) => handleReportStatus(r.id, e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <a
                      href={`https://wa.me/?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Alert Volunteers
                    </a>
                    <button
                      type="button"
                      onClick={() => handlePromoteReport(r)}
                      className="inline-flex items-center gap-1 rounded-full border border-orange-700 px-3 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-50"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Add to Adopt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(r.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Animals Management */}
      <div className="mb-8">
        <h3 className="mb-3 text-lg font-extrabold text-slate-900">
          Adoptable / Rescued Animals ({animals.length})
        </h3>
        <div className="space-y-3">
          {animals.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={a.photoUrl || FALLBACK_ANIMAL_IMAGE}
                  alt={a.name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_ANIMAL_IMAGE;
                  }}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {a.name}{' '}
                    <span className="font-normal text-slate-500">
                      ({a.category} · {a.age} · {a.gender})
                    </span>
                  </p>
                  <p className="text-xs text-slate-600">
                    {a.location} · Vaccinated: {a.vaccinated}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Change status for ${a.name}`}
                  value={a.status}
                  onChange={(e) => handleAnimalStatus(a.id, e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => startEditAnimal(a)}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAnimal(a.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adoption Requests & Volunteers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-lg font-extrabold text-slate-900">
            Adoption Requests ({adoptions.length})
          </h3>
          {adoptions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No adoption requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {adoptions.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {req.applicantName}{' '}
                        <span className="font-normal text-slate-600">({req.applicantPhone})</span>
                      </p>
                      <p className="text-xs font-semibold text-orange-800">
                        Animal: {req.animalName || `#${req.animalId}`}
                      </p>
                      {req.reason && <p className="mt-1 text-xs text-slate-600">{req.reason}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={req.status}
                        onChange={(e) => handleAdoptionStatus(req.id, e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                      >
                        {ADOPTION_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <a
                        href={`https://wa.me/${toWaPhone(req.applicantPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdoption(req.id)}
                        className="rounded-full bg-rose-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-lg font-extrabold text-slate-900">
            Registered Volunteers ({volunteers.length})
          </h3>
          {volunteers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No volunteers registered yet.
            </div>
          ) : (
            <div className="space-y-3">
              {volunteers.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{v.name}</p>
                    <p className="text-xs text-slate-600">
                      {v.area} · {v.availableDays}
                    </p>
                    {v.phone && (
                      <p className="text-xs font-semibold text-slate-700">Phone: {v.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {v.phone && (
                      <a
                        href={`https://wa.me/${toWaPhone(v.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteVolunteer(v.id)}
                      className="rounded-full bg-rose-700 px-3 py-1 text-xs font-bold text-white hover:bg-rose-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
