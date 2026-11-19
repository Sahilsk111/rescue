import React, { useRef, useState } from 'react';
import { CheckCircle2, Heart, MapPin, ShieldCheck, X } from 'lucide-react';
import { FALLBACK_ANIMAL_IMAGE } from '../config';
import { api, type AnimalItem } from '../lib/api';

const FILTER_OPTIONS = ['All', 'Cat', 'Dog', 'Puppy', 'Kitten'] as const;

interface AdoptSectionProps {
  animals: AnimalItem[];
  loading: boolean;
  onAdoptionSubmitted: () => void;
}

export function AdoptSection({ animals, loading, onAdoptionSubmitted }: AdoptSectionProps) {
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<AnimalItem | null>(null);
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adoptSuccess, setAdoptSuccess] = useState<string | null>(null);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const visibleAnimals = animals.filter((a) => filter === 'All' || a.category === filter);

  const openAnimal = (animal: AnimalItem) => {
    setSelected(animal);
    setAdoptSuccess(null);
    setAdoptError(null);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleSubmitAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setAdoptError(null);
    setAdoptSuccess(null);
    setSubmitting(true);
    try {
      await api.submitAdoptionRequest({
        animalId: selected.id,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim(),
        reason: reason.trim(),
      });
      setAdoptSuccess(
        `Adoption request for ${selected.name} has been submitted! Our Jammu team will contact you soon.`
      );
      setApplicantName('');
      setApplicantPhone('');
      setReason('');
      onAdoptionSubmitted();
    } catch (err) {
      setAdoptError(err instanceof Error ? err.message : 'Failed to send adoption request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="adopt" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6">
        <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Adopt a Rescued Animal
        </h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Give a rescued street cat, dog, puppy, or kitten a loving forever home in Jammu.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter animals">
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-[#0b1226] text-white shadow-sm'
                  : 'border border-slate-300 bg-white text-slate-800 hover:bg-[#0b1226] hover:text-white'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 h-48 rounded-xl bg-slate-200" />
              <div className="mb-2 h-5 w-1/2 rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : visibleAnimals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No animals currently listed under <strong>{filter}</strong>.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAnimals.map((animal) => (
            <article
              key={animal.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative mb-3 overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={animal.photoUrl || FALLBACK_ANIMAL_IMAGE}
                  alt={animal.name}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_ANIMAL_IMAGE;
                  }}
                  className="h-52 w-full object-cover"
                />
                <span className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm">
                  {animal.status}
                </span>
              </div>

              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">{animal.name}</h3>
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800">
                  {animal.category}
                </span>
              </div>

              <div className="mb-4 space-y-1 text-sm text-slate-600">
                <p>
                  {animal.age} · {animal.gender}
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Vaccinated: <strong className="text-slate-800">{animal.vaccinated}</strong>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-orange-700" />
                  {animal.location}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openAnimal(animal)}
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-700 to-orange-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              >
                <Heart className="h-4 w-4" />
                View + Adopt
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div
          ref={detailRef}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-7"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">{selected.name}</h3>
              <p className="text-sm text-slate-600">
                {selected.category} · {selected.age} · {selected.gender} · Vaccinated:{' '}
                <strong>{selected.vaccinated}</strong> · {selected.location}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close animal details"
              className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <img
                src={selected.photoUrl || FALLBACK_ANIMAL_IMAGE}
                alt={selected.name}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_ANIMAL_IMAGE;
                }}
                className="max-h-72 w-full rounded-xl object-cover"
              />
              {selected.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {selected.description}
                </p>
              )}
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Current Status: <span className="text-slate-900">{selected.status}</span>
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-lg font-bold text-slate-900">
                Adopt Request Form for {selected.name}
              </h4>

              {adoptSuccess && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{adoptSuccess}</span>
                </div>
              )}

              {adoptError && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                  {adoptError}
                </div>
              )}

              <form onSubmit={handleSubmitAdoption} className="space-y-3">
                <div>
                  <label htmlFor="adName" className="mb-1 block text-xs font-bold text-slate-700">
                    Your Name *
                  </label>
                  <input
                    id="adName"
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="adPhone" className="mb-1 block text-xs font-bold text-slate-700">
                    Phone Number *
                  </label>
                  <input
                    id="adPhone"
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="Mobile / WhatsApp number"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="adReason" className="mb-1 block text-xs font-bold text-slate-700">
                    Why do you want to adopt?
                  </label>
                  <textarea
                    id="adReason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us about your home in Jammu and pet experience..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-65"
                >
                  {submitting ? 'Sending Request...' : 'Send Adoption Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
