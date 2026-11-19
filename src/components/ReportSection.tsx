import React, { useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  LocateFixed,
  MapPin,
  MessageCircle,
  Send,
  AlertCircle,
} from 'lucide-react';
import { api, compressImageFile, type ReportSubmissionResponse } from '../lib/api';

interface ReportSectionProps {
  onReportSubmitted: () => void;
}

export function ReportSection({ onReportSubmitted }: ReportSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoData, setPhotoData] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [animalType, setAnimalType] = useState('Dog');
  const [condition, setCondition] = useState('Injured');
  const [location, setLocation] = useState('');
  const [mapPin, setMapPin] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ReportSubmissionResponse | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoData('');
      setPhotoName('');
      return;
    }
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      setPhotoData(compressed);
      setPhotoName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process photo.');
    }
  };

  const handleUseGpsPin = () => {
    setGpsStatus(null);
    if (!navigator.geolocation) {
      setGpsStatus('GPS is not supported in this browser. Please paste a Google Maps link.');
      return;
    }
    setGpsStatus('Fetching GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setMapPin(`${lat},${lng} - https://www.google.com/maps?q=${lat},${lng}`);
        setGpsStatus('GPS pin captured.');
      },
      () => {
        setGpsStatus('Location permission denied. You can paste a Google Maps link below.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!photoData) {
      setError('Please upload a photo of the animal.');
      return;
    }
    if (!location.trim() || !reporterName.trim() || !reporterPhone.trim()) {
      setError('Please fill in location, your name, and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitReport({
        animalType,
        condition,
        location: location.trim(),
        mapPin: mapPin.trim(),
        description: description.trim(),
        reporterName: reporterName.trim(),
        reporterPhone: reporterPhone.trim(),
        photoData,
      });
      setSubmission(result);
      setPhotoData('');
      setPhotoName('');
      setLocation('');
      setMapPin('');
      setDescription('');
      setReporterName('');
      setReporterPhone('');
      setGpsStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onReportSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="report" className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="mb-6">
        <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Report Injured Animal (1-Minute Form)
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Upload a clear photo and exact Jammu landmark so the nearest volunteer can reach quickly.
        </p>
      </div>

      {submission && (
        <div
          role="status"
          className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div className="w-full">
              <h3 className="text-lg font-bold text-emerald-900">
                Thank You! Volunteer will contact you soon.
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                Report #{submission.report.id} ({submission.report.animalType} —{' '}
                {submission.report.condition} at {submission.report.location}) has been saved.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={submission.generalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share Rescue Alert on WhatsApp
                </a>
              </div>

              {submission.matchedVolunteers.length > 0 && (
                <div className="mt-4 border-t border-emerald-200 pt-4">
                  <p className="mb-2 text-xs font-bold tracking-wider text-emerald-900 uppercase">
                    {submission.matchedVolunteers.some((v) => v.matchType === 'area')
                      ? 'Matched Jammu Area Volunteers — Tap to Alert Immediately'
                      : 'Available Jammu Volunteers — Tap to Alert Immediately'}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {submission.matchedVolunteers.map((vol) => (
                      <div
                        key={vol.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {vol.name}
                          </div>
                          <div className="truncate text-xs text-slate-600">
                            {vol.area} · {vol.availableDays}
                          </div>
                        </div>
                        <a
                          href={vol.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Alert
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-5">
          <label htmlFor="rPhoto" className="mb-1.5 block text-sm font-bold text-slate-900">
            Upload Photo *
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              id="rPhoto"
              type="file"
              accept="image/*"
              capture="environment"
              required
              onChange={handlePhotoChange}
              className="block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-orange-800 hover:file:bg-orange-100"
            />
          </div>
          {photoData && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <img
                src={photoData}
                alt="Uploaded rescue preview"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  <Camera className="mr-1 inline h-4 w-4 text-orange-700" />
                  {photoName || 'Photo ready'}
                </p>
                <p className="text-xs text-slate-500">Optimized for fast mobile upload</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rType" className="mb-1.5 block text-sm font-bold text-slate-900">
              Animal Type
            </label>
            <select
              id="rType"
              value={animalType}
              onChange={(e) => setAnimalType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            >
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
            </select>
          </div>
          <div>
            <label htmlFor="rCond" className="mb-1.5 block text-sm font-bold text-slate-900">
              Condition
            </label>
            <select
              id="rCond"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            >
              <option value="Injured">Injured</option>
              <option value="Sick">Sick</option>
              <option value="Hungry">Hungry</option>
              <option value="Accident">Accident</option>
            </select>
          </div>
        </div>

        <div className="mb-5">
          <label htmlFor="rLoc" className="mb-1.5 block text-sm font-bold text-slate-900">
            Location (Text / Jammu Landmark) *
          </label>
          <input
            id="rLoc"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Janipur, Jammu near bus stand"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="rPin" className="mb-1.5 block text-sm font-bold text-slate-900">
            Google Map Pin
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Jammu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-700 bg-white px-3.5 py-1.5 text-xs font-bold text-orange-800 transition hover:bg-orange-700 hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5" />
              Open Google Map (drop pin &amp; copy link)
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={handleUseGpsPin}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-slate-800 hover:text-white"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Use Phone GPS Pin
            </button>
          </div>
          {gpsStatus && <p className="mb-2 text-xs font-medium text-slate-600">{gpsStatus}</p>}
          <input
            id="rPin"
            type="text"
            value={mapPin}
            onChange={(e) => setMapPin(e.target.value)}
            placeholder="Paste Google Maps link or GPS coordinates"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="rDesc" className="mb-1.5 block text-sm font-bold text-slate-900">
            Description
          </label>
          <textarea
            id="rDesc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe injury, color/markings, or exact roadside spot..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="rName" className="mb-1.5 block text-sm font-bold text-slate-900">
              Reporter Name *
            </label>
            <input
              id="rName"
              type="text"
              required
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="rPhone" className="mb-1.5 block text-sm font-bold text-slate-900">
              Phone Number *
            </label>
            <input
              id="rPhone"
              type="tel"
              required
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder:text-slate-500 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rescue-gradient-btn inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65"
        >
          <Send className="h-5 w-5" />
          {submitting ? 'Submitting Rescue Report...' : 'Submit Report'}
        </button>
      </form>
    </section>
  );
}
