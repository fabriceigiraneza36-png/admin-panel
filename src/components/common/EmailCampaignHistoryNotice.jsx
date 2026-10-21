// src/components/common/EmailCampaignHistoryNotice.jsx
// Persistent in-admin report for campaigns that sent while no admin socket was connected.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, Clock3, ArrowUpRight } from "lucide-react";
import { emailBroadcastAPI } from "@api/emailBroadcast";
import { useSocket } from "@context/SocketContext";

const STORAGE_KEY = "altuvera:email-campaign-last-seen";
const LABELS = {
  new_destination: "New destination",
  new_post: "New travel story",
  new_package: "New travel package",
  top_rated_destination: "Popular destination",
  booking_encouragement: "Booking inspiration",
  travel_guide: "Travel guide",
};

const objectValue = (value) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}") || {}; } catch { return {}; }
};

export default function EmailCampaignHistoryNotice() {
  const { connected } = useSocket();
  const [reports, setReports] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (!connected) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const response = await emailBroadcastAPI.getHistory();
        if (cancelled) return;
        const rows = response.data?.data || [];
        const stored = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
        const initialCutoff = stored || (Date.now() - 7 * 24 * 60 * 60 * 1000);
        const unread = rows
          .map((row) => ({ ...row, parsedDetails: objectValue(row.details) }))
          .filter((row) => row.parsedDetails.autoTriggered === true && new Date(row.created_at).getTime() > initialCutoff)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4);
        setReports(unread);
      } catch {
        // The Broadcast page keeps the complete persisted history available.
      }
    })();
    return () => { cancelled = true; };
  }, [connected]);

  const markReviewed = () => {
    if (!reports.length || markingRead) return;
    setMarkingRead(true);
    const latest = Math.max(...reports.map((row) => new Date(row.created_at).getTime()));
    try { window.localStorage.setItem(STORAGE_KEY, String(latest)); } catch {}
    setReports([]);
    setMarkingRead(false);
  };

  if (!reports.length) return null;

  return (
    <aside className="fixed bottom-4 right-3 sm:right-5 z-[70] w-[calc(100vw-24px)] max-w-[420px] space-y-3" aria-label="Automatic email campaign reports">
      {reports.map((row) => {
        const details = row.parsedDetails || {};
        const event = objectValue(details.eventData);
        const label = LABELS[row.context] || String(row.context || "Campaign").replace(/_/g, " ");
        const contextName = event.destinationName || event.postTitle || event.packageName || event.countryName || "";
        const date = new Date(row.created_at);
        return (
          <article key={row.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,.18)]">
            <div className="flex items-start gap-3 px-4 py-3.5 bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-b border-emerald-100">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0"><BellRing size={18}/></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[.16em] font-extrabold text-emerald-700">Automatic email report</p>
                <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{label}</h3>
                {contextName && <p className="text-xs text-slate-600 mt-1 truncate">{contextName}</p>}
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Sent</span>
            </div>
            <div className="px-4 py-3.5 space-y-2.5">
              <p className="text-sm font-semibold text-slate-800 leading-snug">{row.subject}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 size={12}/>{Number.isNaN(date.getTime()) ? "Recent" : date.toLocaleString()}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2"><p className="text-[10px] text-emerald-800">Sent</p><p className="text-lg font-extrabold text-emerald-800">{row.sent_count || 0}</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-2"><p className="text-[10px] text-slate-600">Recipients</p><p className="text-lg font-extrabold text-slate-800">{row.recipient_count || 0}</p></div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-2"><p className="text-[10px] text-rose-700">Failed</p><p className="text-lg font-extrabold text-rose-700">{row.failed_count || 0}</p></div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This campaign was automatically sent from the content context. A delivery summary and any error details remain available in Email Studio history.
              </p>
              <div className="flex items-center justify-between gap-3 pt-1">
                <Link to="/broadcast" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900">Open Email Studio <ArrowUpRight size={13}/></Link>
                <button type="button" onClick={markReviewed} disabled={markingRead} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"><Check size={13}/> Mark reviewed</button>
              </div>
            </div>
          </article>
        );
      })}
      {reports.length > 1 && <div className="text-right text-[10px] text-slate-500 pr-1">Showing {reports.length} recent automated campaigns · older entries remain in history</div>}
    </aside>
  );
}
