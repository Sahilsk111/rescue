import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { api, type PublicRescueAlert, type VolunteerItem } from '../lib/api';

interface VolunteerSectionProps {
  volunteers: VolunteerItem[];
  onVolunteerJoined: () => void;
}

const WORK_LIST = [
  'Rescue injured animals on call',
  'Feed street animals in your area',
  'Help with adoption events',
  'Transport to vet / shelter',
];

export function VolunteerSection({ volunteers, onVolunteerJoined }: VolunteerSectionProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('');
  const [availableDays, setAvailableDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joinedOk, setJoinedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [areaSearch, setAreaSearch] = useState('');
  const [alerts, setAlerts] = useState<PublicRescueAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const fetchAlerts = async (areaQuery?: string) => {
    setLoadingAlerts(true);
    try {
      const data = await api.getAlerts(areaQuery);
      setAlerts(data);
    } catch {
      // keep existing alerts on transient network issues
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJoinedOk(false);
    setSubmitting(true);
    try {
      await api.registerVolunteer({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        availableDays: availableDays.trim(),
      });
      setJoinedOk(true);
      setName('');
      setPhone('');
      setArea('');
      setAvailableDays('');
      onVolunteerJoined();
      fetchAlerts(areaSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register volunteer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterAlerts = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAlerts(areaSearch);
  };

  return (
    <section id="volunteer" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6">
        <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Become a Volunteer (Jammu)
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Register your Jammu neighborhood to receive area-matched rescue alerts and coordinate on
          WhatsApp.
        </p>
      </div>

      {/* Registration Form */}
      <form
        onSubmit={handleJoin}
        className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="vName" className="mb-1 block text-xs font-bold text-slate-700">
              Full Name *
            </label>
            <input
              id="vName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="vPhone" className="mb-1 block text-xs font-bold text-slate-700">
              Phone / WhatsApp Number *
            </label>
            <input
              id="vPhone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="vArea" className="mb-1 block text-xs font-bold text-slate-700">
              Area in Jammu *
            </label>
            <input
              id="vArea"
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Janipur, Gandhi Nagar, Trikuta Nagar"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="vDays" className="mb-1 block text-xs font-bold text-slate-700">
            Available Days *
          </label>
          <input
            id="vDays"
            type="text"
            required
            value={availableDays}
            onChange={(e) => setAvailableDays(e.target.value)}
            placeholder="e.g. Mon, Wed, Sat or All Days"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {joinedOk && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Thank you for joining Rescue Paws Jammu! You are now listed for area alerts.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-700 to-orange-800 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-65"
        >
          {submitting ? 'Saving...' : 'Join as Volunteer'}
        </button>
      </form>

      {/* Live Area-Matched Rescue Alerts */}
      <div className="mb-8 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Live Jammu Rescue Alerts
            </h3>
            <p className="text-xs text-slate-600">
              Filter active reports by Jammu neighborhood and coordinate via WhatsApp.
            </p>
          </div>
          <form onSubmit={handleFilterAlerts} className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                placeholder="Filter area (e.g. Janipur)"
                className="rounded-full border border-slate-300 py-1.5 pr-3 pl-9 text-sm text-slate-900 focus:border-orange-700 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#0b1226] px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => fetchAlerts(areaSearch)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </form>
        </div>

        {loadingAlerts ? (
          <p className="py-4 text-sm text-slate-500">Loading active rescue alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center text-sm text-slate-600">
            No active rescue alerts matching your area right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert) => {
              const mapUrlMatch = alert.mapPin.match(/https?:\/\/\S+/);
              const mapLink = mapUrlMatch
                ? mapUrlMatch[0]
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    alert.location
                  )}`;
              return (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex gap-3">
                    {alert.photoData && (
                      <img
                        src={alert.photoData}
                        alt={`${alert.animalType} alert`}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                          {alert.condition}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                          {alert.animalType}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                          {alert.status}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-center gap-1 text-sm font-bold text-slate-900">
                        <MapPin className="h-4 w-4 shrink-0 text-orange-700" />
                        <span className="truncate">{alert.location}</span>
                      </p>
                      {alert.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                          {alert.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
                    <span className="text-xs font-medium text-slate-600">
                      {alert.matchedVolunteerCount > 0
                        ? `${alert.matchedVolunteerCount} nearby volunteer${
                            alert.matchedVolunteerCount > 1 ? 's' : ''
                          } matched`
                        : 'Open for any Jammu volunteer'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100"
                      >
                        Map
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={alert.whatsappShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp Alert
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Directory & Work List */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Users className="h-5 w-5 text-orange-700" />
            Volunteers Joined ({volunteers.length})
          </h3>
          {volunteers.length === 0 ? (
            <p className="text-sm text-slate-600">
              No volunteers registered yet. Be the first to join in your Jammu area!
            </p>
          ) : (
            <div className="space-y-2.5">
              {volunteers.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{v.name}</div>
                    <div className="text-xs text-slate-600">{v.area}</div>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-900">
                    {v.availableDays}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-extrabold text-slate-900">Volunteer Work List</h3>
          <ul className="space-y-2.5 text-sm text-slate-700">
            {WORK_LIST.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
