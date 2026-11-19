import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PawPrint,
  Phone,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { SITE_CONFIG } from './config';
import { api, type AnimalItem, type StatsData, type VolunteerItem } from './lib/api';
import { ReportSection } from './components/ReportSection';
import { AdoptSection } from './components/AdoptSection';
import { DonateSection } from './components/DonateSection';
import { VolunteerSection } from './components/VolunteerSection';
import { AdminSection } from './components/AdminSection';

type PageId = 'home' | 'report' | 'adopt' | 'donate' | 'volunteer' | 'contact' | 'admin';

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'report', label: 'Report' },
  { id: 'adopt', label: 'Adopt' },
  { id: 'donate', label: 'Donate' },
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'contact', label: 'Contact' },
  { id: 'admin', label: 'Admin' },
];

const INITIAL_STATS: StatsData = {
  rescued: 0,
  adopted: 0,
  volunteers: 0,
  totalReports: 0,
  totalAnimals: 0,
  totalAdoptions: 0,
  activeAlerts: 0,
};

function getPageFromHash(): PageId {
  const raw = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  const valid = NAV_ITEMS.find((item) => item.id === raw);
  return valid ? valid.id : 'home';
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(() => getPageFromHash());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState<StatsData>(INITIAL_STATS);
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const navigate = useCallback((page: PageId) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    const targetHash = `#/${page}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setActivePage(getPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshPublicData = useCallback(async () => {
    setLoadError(null);
    try {
      const [statsData, animalsData, volunteersData] = await Promise.all([
        api.getStats(),
        api.getAnimals(),
        api.getVolunteers(),
      ]);
      setStats(statsData);
      setAnimals(animalsData);
      setVolunteers(volunteersData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to load latest rescue data right now.'
      );
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    void refreshPublicData();
  }, [refreshPublicData]);

  const whatsappHelplineUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(
    'Hello Rescue Paws Jammu, I need help with a street animal.'
  )}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900">
      {/* Top Emergency Helpline Bar */}
      <div className="bg-gradient-to-r from-[#7c2d12] via-[#9a3412] to-[#881337] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold tracking-wide">
              <Phone className="h-3.5 w-3.5" />
              24x7 Emergency Helpline:
            </span>
            <a
              href={`tel:${SITE_CONFIG.helplineTel}`}
              className="font-extrabold underline decoration-white/60 underline-offset-2 hover:text-orange-100"
            >
              {SITE_CONFIG.helplineDisplay}
            </a>
            <span className="hidden text-white/50 sm:inline">|</span>
            <a
              href={whatsappHelplineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 font-semibold text-orange-100 hover:text-white sm:inline-flex"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Rescue Desk
            </a>
          </div>

          <button
            type="button"
            onClick={() => navigate('report')}
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/25"
          >
            Report injured animal in 1 min
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sticky Navy Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-[#0b1226] via-[#111c3a] to-[#1e2a52] text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-sm">
              <PawPrint className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-extrabold leading-tight tracking-tight sm:text-lg">
                {SITE_CONFIG.brandName}{' '}
                <span className="text-orange-400">{SITE_CONFIG.city}</span>
              </span>
              <span className="block text-[11px] font-semibold tracking-wider text-slate-300 uppercase">
                {SITE_CONFIG.tagline}
              </span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white/15 text-white shadow-inner'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop CTA + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('report')}
              className="rescue-gradient-btn hidden items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition sm:inline-flex"
            >
              <AlertTriangle className="h-4 w-4" />
              Report Animal
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0b1226] px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      isActive
                        ? 'bg-orange-600 text-white'
                        : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Optional inline error notice if initial load failed */}
      {loadError && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void refreshPublicData()}
              className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {activePage === 'home' && (
          <div>
            {/* Hero Banner */}
            <section className="rescue-hero-bg border-b border-slate-200/80">
              <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:py-20">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1 text-xs font-bold text-orange-800">
                    <MapPin className="h-3.5 w-3.5" />
                    Jammu Street Animal Rescue Network
                  </div>

                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]">
                    Save Street Cats &amp; Dogs —{' '}
                    <span className="bg-gradient-to-r from-[#c2410c] via-[#be123c] to-[#9d174d] bg-clip-text text-transparent">
                      Report, Rescue, Adopt
                    </span>
                  </h1>

                  <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                    Found an injured, sick, or stranded cat or dog on the road? Submit a photo
                    and pin in under 1 minute so the nearest Jammu volunteer can rush to help.
                  </p>

                  {/* 2 Big CTA Buttons */}
                  <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => navigate('report')}
                      className="rescue-gradient-btn inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-900/15 transition"
                    >
                      <AlertTriangle className="h-5 w-5" />
                      Report Injured Animal
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('adopt')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-7 py-4 text-base font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-900 hover:text-white"
                    >
                      <Heart className="h-5 w-5" />
                      Adopt a Street Pet
                    </button>
                  </div>
                </div>

                {/* Live Counters */}
                <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                      {stats.rescued}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">Rescued</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <Heart className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                      {stats.adopted}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">Adopted</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                      {stats.volunteers}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">Volunteers</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3 Steps Section */}
            <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  How Rescue Paws Jammu Works
                </h2>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Three simple steps from a roadside emergency to a safe, loving home.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                      <Camera className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-extrabold tracking-wider text-orange-700 uppercase">
                      Step 1
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">1. Report</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Snap a quick photo of the injured cat or dog, tap GPS or type the Jammu
                    landmark, and submit in under a minute.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('report')}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-orange-700 hover:text-orange-900"
                  >
                    Open report form <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-extrabold tracking-wider text-rose-700 uppercase">
                      Step 2
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">2. Rescue</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Nearby volunteers in Gandhi Nagar, Trikuta Nagar, Channi Himmat, and across
                    Jammu get matched and coordinate vet care immediately.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('volunteer')}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-rose-700 hover:text-rose-900"
                  >
                    View live alerts &amp; volunteer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Heart className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase">
                      Step 3
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">3. Adopt</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Once treated and recovered, rescued puppies, kittens, dogs, and cats are
                    listed for loving local families to adopt.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('adopt')}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900"
                  >
                    Browse adoptable pets <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'report' && (
          <ReportSection onReportSubmitted={() => void refreshPublicData()} />
        )}

        {activePage === 'adopt' && (
          <AdoptSection
            animals={animals}
            loading={loadingPublic}
            onAdoptionSubmitted={() => void refreshPublicData()}
          />
        )}

        {activePage === 'donate' && <DonateSection />}

        {activePage === 'volunteer' && (
          <VolunteerSection
            volunteers={volunteers}
            onVolunteerJoined={() => void refreshPublicData()}
          />
        )}

        {activePage === 'contact' && (
          <section id="contact" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="mb-8">
              <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Contact Rescue Paws Jammu
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Reach our Jammu rescue coordinators directly via WhatsApp, email, or Instagram.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-extrabold text-slate-900">Direct Channels</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    For urgent roadside accidents, call the helpline or submit a 1-minute report
                    with GPS location.
                  </p>

                  <div className="mt-5 space-y-3">
                    <a
                      href={whatsappHelplineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <MessageCircle className="h-5 w-5" />
                        Chat on WhatsApp
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </a>

                    <a
                      href={`tel:${SITE_CONFIG.helplineTel}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Phone className="h-5 w-5 text-orange-700" />
                        Helpline: {SITE_CONFIG.helplineDisplay}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </a>

                    <a
                      href={`mailto:${SITE_CONFIG.email}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Mail className="h-5 w-5 text-rose-700" />
                        {SITE_CONFIG.email}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </a>

                    <a
                      href={SITE_CONFIG.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Instagram className="h-5 w-5 text-fuchsia-700" />
                        Follow on Instagram
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                      <MapPin className="h-4 w-4 text-orange-600" />
                      Rescue Coverage Area — Jammu, J&amp;K
                    </span>
                  </div>
                  <iframe
                    title="Jammu Rescue Coverage Map"
                    src="https://www.google.com/maps?q=Jammu,Jammu+and+Kashmir&output=embed"
                    className="h-[340px] w-full border-0 sm:h-[400px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'admin' && (
          <AdminSection
            stats={stats}
            animals={animals}
            onDataChanged={() => void refreshPublicData()}
          />
        )}
      </main>

      {/* Navy Footer CTA */}
      <footer className="mt-auto bg-gradient-to-r from-[#0b1226] via-[#111c3a] to-[#1e2a52] text-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-center">
            <div>
              <h3 className="text-xl font-extrabold text-white">
                Found an injured animal? Help takes 1 minute.
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                Report a roadside emergency, adopt a rescued pet, or fund daily street meals in
                Jammu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate('report')}
                className="rescue-gradient-btn rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition"
              >
                Report Injured Animal
              </button>
              <button
                type="button"
                onClick={() => navigate('adopt')}
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Adopt
              </button>
              <button
                type="button"
                onClick={() => navigate('donate')}
                className="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Donate
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
            <p>
              © {new Date().getFullYear()} {SITE_CONFIG.brandName} {SITE_CONFIG.city} — Community
              Street Cats &amp; Dogs Rescue Network.
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('volunteer')}
                className="hover:text-white"
              >
                Volunteer Alerts
              </button>
              <button
                type="button"
                onClick={() => navigate('contact')}
                className="hover:text-white"
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => navigate('admin')}
                className="hover:text-white"
              >
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
