import React, { useState } from 'react';
import { HeartHandshake, QrCode } from 'lucide-react';
import { SITE_CONFIG } from '../config';

const PRESET_AMOUNTS = ['100', '500', '1000'] as const;

export function DonateSection() {
  const [amount, setAmount] = useState<string>('100');

  const trimmedAmount = amount.trim();
  const hasLiveUpi = Boolean(SITE_CONFIG.upiId);
  const upiUri = hasLiveUpi
    ? `upi://pay?pa=${encodeURIComponent(SITE_CONFIG.upiId)}&pn=${encodeURIComponent(
        SITE_CONFIG.payeeName
      )}&cu=INR${trimmedAmount ? `&am=${encodeURIComponent(trimmedAmount)}` : ''}`
    : '';

  const qrImageUrl = hasLiveUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`
    : '';

  const foodDays = Number(trimmedAmount) >= 100 ? Math.floor(Number(trimmedAmount) / 100) : 0;

  return (
    <section id="donate" className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="mb-6">
        <h2 className="rescue-section-underline text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Donate for Street Animals
        </h2>
        <p className="mt-2 text-base font-semibold text-orange-800">
          ₹100 = 1 Day Food &amp; Basic Care
        </p>
      </div>

      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 text-sm font-bold text-slate-800">Choose Donation Amount (INR)</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((val) => {
              const active = trimmedAmount === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    active
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'border border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  ₹{val}
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <label htmlFor="customAmt" className="mb-1.5 block text-xs font-bold text-slate-700">
              Or Enter Custom Amount (₹)
            </label>
            <input
              id="customAmt"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="w-full max-w-xs rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-200 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4 text-sm text-slate-800">
            <div className="flex items-center gap-2 font-bold text-orange-900">
              <HeartHandshake className="h-5 w-5 text-orange-700" />
              <span>Your Impact</span>
            </div>
            <p className="mt-1 text-slate-700">
              {foodDays > 0
                ? `₹${trimmedAmount} provides approximately ${foodDays} day${
                    foodDays > 1 ? 's' : ''
                  } of nutritious meals for rescued street dogs & cats in Jammu.`
                : 'Every contribution helps cover emergency vet treatment, vaccinations, and daily meals.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          {hasLiveUpi ? (
            <>
              <img
                src={qrImageUrl}
                alt="UPI QR Code"
                className="h-56 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-sm font-bold text-slate-900">
                UPI ID: {SITE_CONFIG.upiId}
              </p>
              <p className="text-xs text-slate-600">
                Amount: {trimmedAmount ? `₹${trimmedAmount}` : 'Enter in UPI app'}
              </p>
              <a
                href={upiUri}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Open in UPI App
              </a>
            </>
          ) : (
            <>
              <div className="flex h-52 w-52 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-400 bg-white p-4 text-slate-600">
                <QrCode className="mb-2 h-12 w-12 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">UPI QR CODE</span>
                <span className="mt-1 text-xs text-slate-500">
                  Selected: {trimmedAmount ? `₹${trimmedAmount}` : 'Custom'}
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold text-rose-700">
                Set your real UPI ID in <code>src/config.ts</code> (<code>upiId</code>) to activate
                live UPI payments.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
