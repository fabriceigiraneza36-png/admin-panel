// src/components/common/EmailCampaignPrompt.jsx
// Admin-wide countdown for automatically queued contextual email campaigns.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing, Clock3, Image as ImageIcon, Palette, Send, X, Save,
  CheckCircle2, Mail, Sparkles, ExternalLink,
} from "lucide-react";
import { useSocket } from "@context/SocketContext";
import { emailBroadcastAPI } from "@api/emailBroadcast";
import { useToast } from "@hooks/useToast";

const CONTEXT_LABELS = {
  new_destination: "New destination",
  new_post: "New travel story",
  new_package: "New travel package",
  top_rated_destination: "Popular destination",
  booking_encouragement: "Booking inspiration",
  travel_guide: "Travel guide",
};

const extractError = (e) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || "Please try again.";

const decodeObject = (value) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}") || {}; } catch { return {}; }
};

const toDraft = (template = {}, contextData = {}, savedOverrides = {}) => {
  const t = { ...template, ...savedOverrides };
  return {
    subject: t.subject || "",
    preheader: t.preheader || "",
    headline: t.headline || "",
    body: t.body || "",
    hero_image_url: savedOverrides.hero_image_url || contextData.heroImageUrl || t.hero_image_url || "",
    accent_color: t.accent_color || "#059669",
    background_color: t.background_color || "#f0fdf4",
    layout: t.layout || "editorial",
    cta_label: t.cta_label || "Explore more",
    cta_url: savedOverrides.cta_url || contextData.contentUrl || t.cta_url || "https://www.altuverasafaris.com/destinations",
  };
};

const prepareQueueItem = (row, templates = []) => {
  const contextData = decodeObject(row.contextData || row.data);
  const savedOverrides = decodeObject(row.templateOverrides || row.template_overrides);
  const template = row.template || templates.find((item) => item.key === (row.templateKey || row.template_key)) || {};
  return {
    ...row,
    id: Number(row.id),
    contextData,
    templateOverrides: savedOverrides,
    template,
    templateKey: row.templateKey || row.template_key || template.key,
    scheduledAt: row.scheduledAt || row.scheduled_at,
  };
};

export default function EmailCampaignPrompt() {
  const { on, off, connected } = useSocket();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [now, setNow] = useState(Date.now());
  const [savingId, setSavingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  const mergeItem = useCallback((raw, templates = []) => {
    const item = prepareQueueItem(raw, templates);
    setItems((previous) => {
      const existing = previous.find((entry) => entry.id === item.id);
      if (existing) return previous.map((entry) => entry.id === item.id ? { ...existing, ...item } : entry);
      return [...previous, item].sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));
    });
    setDrafts((previous) => ({
      ...previous,
      [item.id]: previous[item.id] || toDraft(item.template, item.contextData, item.templateOverrides),
    }));
    setDismissed((previous) => previous.filter((id) => id !== item.id));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPending = async () => {
      try {
        const [pendingResponse, templateResponse] = await Promise.all([
          emailBroadcastAPI.getPendingQueue(),
          emailBroadcastAPI.getTemplates(),
        ]);
        if (cancelled) return;
        const templates = templateResponse.data?.data || [];
        for (const row of pendingResponse.data?.data || []) {
          mergeItem(row, templates);
        }
      } catch {
        // The live socket event remains the immediate path; retry on reconnect.
      }
    };

    const onPending = async (payload) => {
      try {
        const response = await emailBroadcastAPI.getTemplates();
        const templates = response.data?.data || [];
        if (!cancelled) mergeItem(payload, templates);
      } catch {
        if (!cancelled) mergeItem(payload, []);
      }
    };
    const onSent = (payload = {}) => {
      setItems((previous) => previous.filter((entry) => entry.id !== Number(payload.id)));
      setDismissed((previous) => previous.filter((id) => id !== Number(payload.id)));
      if (payload.failed > 0 && payload.sent === 0) {
        toast.error("Automatic email campaign failed: " + (payload.error || "Check the campaign history."));
      } else if (payload.sent > 0) {
        toast.success("Email campaign sent: " + (payload.subject || CONTEXT_LABELS[payload.context] || "Altuvera update") + " (" + payload.sent + " sent).");
      }
    };

    // A reconnection fetch recovers pending countdowns if the panel was
    // reloaded or briefly disconnected after the server queued the campaign.
    loadPending();
    if (connected) {
      on("email-campaign:approval-needed", onPending);
      on("email-campaign:sent", onSent);
    }
    return () => {
      cancelled = true;
      off("email-campaign:approval-needed", onPending);
      off("email-campaign:sent", onSent);
    };
  }, [connected, on, off, mergeItem, toast]);

  const activeItem = useMemo(
    () => items.find((item) => !dismissed.includes(item.id)) || null,
    [items, dismissed],
  );
  const activeDraft = activeItem ? drafts[activeItem.id] || toDraft(activeItem.template, activeItem.contextData, activeItem.templateOverrides) : null;
  const secondsLeft = activeItem
    ? Math.max(0, Math.ceil((new Date(activeItem.scheduledAt || activeItem.scheduled_at || now).getTime() - now) / 1000))
    : 0;

  const updateDraft = (field, value) => {
    if (!activeItem) return;
    setDrafts((previous) => ({
      ...previous,
      [activeItem.id]: { ...(previous[activeItem.id] || {}), [field]: value },
    }));
  };

  const saveRetouch = async () => {
    if (!activeItem || !activeDraft || savingId) return;
    setSavingId(activeItem.id);
    try {
      const { data } = await emailBroadcastAPI.updateQueuedTemplate(activeItem.id, activeDraft);
      const saved = data?.data?.template_overrides || activeDraft;
      setItems((previous) => previous.map((item) => item.id === activeItem.id
        ? { ...item, templateOverrides: { ...item.templateOverrides, ...saved } }
        : item));
      toast.success("Retouch saved. The automatic countdown continues.");
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSavingId(null);
    }
  };

  const sendNow = async () => {
    if (!activeItem || !activeDraft || sendingId) return;
    setSendingId(activeItem.id);
    try {
      const { data } = await emailBroadcastAPI.sendQueuedNow(activeItem.id, activeDraft);
      setItems((previous) => previous.filter((item) => item.id !== activeItem.id));
      setDismissed((previous) => previous.filter((id) => id !== activeItem.id));
      toast.success(data?.message || "Email campaign sent.");
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSendingId(null);
    }
  };

  if (!activeItem || !activeDraft) return null;
  const contextName = CONTEXT_LABELS[activeItem.context] || String(activeItem.context || "Contextual email").replace(/_/g, " ");
  const previewHeadline = (activeDraft.headline || contextName)
    .replace(/\{\{firstName\}\}/g, "Alex")
    .replace(/\{\{destinationName\}\}/g, activeItem.contextData.destinationName || "Your next destination")
    .replace(/\{\{packageName\}\}/g, activeItem.contextData.packageName || "Your next adventure")
    .replace(/\{\{postTitle\}\}/g, activeItem.contextData.postTitle || "A new travel story");
  const previewBody = (activeDraft.body || "")
    .replace(/\{\{firstName\}\}/g, "Alex")
    .replace(/\{\{destinationName\}\}/g, activeItem.contextData.destinationName || "Your next destination")
    .replace(/\{\{packageName\}\}/g, activeItem.contextData.packageName || "Your next adventure")
    .replace(/\{\{postTitle\}\}/g, activeItem.contextData.postTitle || "A new travel story");

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="email-campaign-title">
      <div className="w-full max-w-5xl max-h-[96dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/70">
        <div className="px-4 sm:px-6 py-4 sm:py-5 text-white flex items-start gap-3" style={{ background: activeDraft.accent_color || "#047857" }}>
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0"><BellRing size={21} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[.2em] uppercase opacity-80">ALTUVERA EMAIL STUDIO</p>
            <h2 id="email-campaign-title" className="text-lg sm:text-xl font-extrabold mt-1">Review: {contextName}</h2>
            <p className="text-xs sm:text-sm text-white/85 mt-1 leading-relaxed">This contextual email will send automatically unless you retouch it now. Closing this prompt does not cancel the send.</p>
          </div>
          <button type="button" onClick={() => setDismissed(previous => [...previous, activeItem.id])} title="Dismiss prompt; scheduled send continues" aria-label="Dismiss prompt; send continues" className="p-2 rounded-xl hover:bg-white/15"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)] gap-0">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-900"><Clock3 size={17}/><span className="text-sm font-semibold">{secondsLeft > 0 ? "Automatic send countdown" : "Automatic send starting"}</span></div>
              <div className="text-2xl tabular-nums font-black text-emerald-800 min-w-[38px] text-center">{secondsLeft > 0 ? secondsLeft : "…"}</div>
            </div>
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">Subject</span><input value={activeDraft.subject} onChange={e => updateDraft("subject", e.target.value)} maxLength={200} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">Headline</span><input value={activeDraft.headline} onChange={e => updateDraft("headline", e.target.value)} maxLength={180} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">Message</span><textarea value={activeDraft.body} onChange={e => updateDraft("body", e.target.value)} rows={5} maxLength={10000} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed resize-y focus:border-emerald-500 focus:outline-none" /></label>
            <label className="block space-y-1.5"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><ImageIcon size={13}/>Hero image URL</span><input value={activeDraft.hero_image_url} onChange={e => updateDraft("hero_image_url", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" placeholder="https://…" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><Palette size={13}/>Accent</span><input type="color" value={activeDraft.accent_color} onChange={e => updateDraft("accent_color", e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white p-1" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">Background</span><input type="color" value={activeDraft.background_color} onChange={e => updateDraft("background_color", e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white p-1" /></label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">Button label</span><input value={activeDraft.cta_label} onChange={e => updateDraft("cta_label", e.target.value)} maxLength={80} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" /></label>
              <label className="block space-y-1.5"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700"><ExternalLink size={13}/>Button URL</span><input value={activeDraft.cta_url} onChange={e => updateDraft("cta_url", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none" /></label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button type="button" onClick={saveRetouch} disabled={savingId === activeItem.id || sendingId === activeItem.id || secondsLeft === 0} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><Save size={16}/>{savingId === activeItem.id ? "Saving…" : "Save retouch"}</button>
              <button type="button" onClick={sendNow} disabled={sendingId === activeItem.id} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm hover:brightness-105 disabled:opacity-50" style={{ background: activeDraft.accent_color }}><Send size={16}/>{sendingId === activeItem.id ? "Sending…" : "Send now"}</button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">If you save a retouch, the countdown continues. If you dismiss or ignore this window, the email sends using the latest saved version.</p>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-4 sm:p-6 bg-slate-50">
            <div className="flex items-center gap-2 text-slate-700 mb-3"><Mail size={16}/><h3 className="text-sm font-bold">Email preview</h3><span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">Responsive</span></div>
            <div className="max-w-xl mx-auto bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="px-5 py-5 text-center" style={{ background: activeDraft.layout === "minimal" ? "#fff" : activeDraft.accent_color, color: activeDraft.layout === "minimal" ? "#0f172a" : "#fff" }}>
                <p className="text-[10px] font-bold tracking-[.2em]">ALTUVERA SAFARIS</p>
                <h3 className="text-xl sm:text-2xl font-extrabold leading-tight mt-3">{previewHeadline}</h3>
                <p className="text-xs mt-2 opacity-80">True adventure in high places &amp; deep culture</p>
              </div>
              {activeDraft.hero_image_url && <img src={activeDraft.hero_image_url} alt="Campaign hero" className="block w-full max-h-48 object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />}
              <div className="p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{previewBody}</p>
                <div className="text-center mt-5"><span className="inline-block rounded-lg px-4 py-3 text-sm font-bold text-white" style={{ background: activeDraft.accent_color }}>{activeDraft.cta_label || "Explore more"}</span></div>
                <p className="text-[10px] text-slate-400 text-center mt-5">You received this travel inspiration because you opted in. Unsubscribe any time.</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500"><Sparkles size={14} className="text-emerald-600 flex-shrink-0 mt-0.5"/><span>Modern email clients may block animation; the final email uses robust layouts, responsive sizing, and static fallbacks.</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
