// src/pages/Broadcast.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// BROADCAST v2.0 — Email + In-App Notification Broadcasts
// ═══════════════════════════════════════════════════════════════════════════════
// Improvements over v1:
//  ✓ Fully responsive (mobile-first, works on 320px → 4K)
//  ✓ Extracted reusable primitives (Field, CharCounter, AudienceCard)
//  ✓ Better a11y (labels, aria-*, focus states)
//  ✓ Optimistic UX: instant feedback, cleaner loading states
//  ✓ Memoized derived state to prevent re-renders
//  ✓ Consolidated constants (single source of truth)
//  ✓ Cleaner error handling with fallback chains
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Megaphone, Send, Users, Bell, Link2, CalendarClock,
  Info, CheckCircle2, Mail, Globe, Ticket, UserCheck, Flag,
} from "lucide-react";
import { notificationsAPI } from "@api/notifications";
import { emailBroadcastAPI } from "@api/emailBroadcast";
import { useToast } from "@hooks/useToast";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const LIMITS = {
  TITLE:      120,
  MESSAGE:    1000,
  SUBJECT:    200,
  EMAIL_BODY: 5000,
};

const TYPE_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "general",      label: "General"      },
  { value: "promotion",    label: "Promotion"    },
  { value: "alert",        label: "Alert"        },
  { value: "success",      label: "Success"      },
  { value: "warning",      label: "Warning"      },
  { value: "info",         label: "Info"         },
];

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low"    },
  { value: "normal", label: "Normal" },
  { value: "high",   label: "High"   },
  { value: "urgent", label: "Urgent" },
];

const AUDIENCE_OPTIONS = [
  { value: "all",         label: "All opted-in contacts", description: "Active subscribers, users, and travellers who agreed to receive marketing emails.", icon: Globe  },
  { value: "subscribers", label: "Subscribers only",      description: "Active newsletter subscribers.",                     icon: Mail   },
  { value: "bookers",     label: "Opted-in travellers",   description: "Travellers who explicitly opted in to Altuvera email updates when requesting a booking.", icon: Ticket },
  { value: "nationality", label: "By nationality",        description: "Target users of a specific nationality.",            icon: Flag   },
];

/* ─── Error helpers ────────────────────────────────────────────────────────── */

const extractError = (e, fallback = "Something went wrong.") =>
  e?.response?.data?.message ||
  e?.response?.data?.error   ||
  e?.data?.message           ||
  e?.message                 ||
  fallback;

/* ─── Reusable UI Primitives ───────────────────────────────────────────────── */

function Field({ label, required, hint, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-slate-500" />}
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function CharCounter({ current, max }) {
  const ratio = current / max;
  const color =
    ratio > 0.95 ? "text-rose-500" :
    ratio > 0.8  ? "text-amber-500" :
                   "text-slate-400";
  return (
    <div className={`text-right text-xs mt-1 ${color}`}>
      {current.toLocaleString()}/{max.toLocaleString()}
    </div>
  );
}

function AudienceCard({ option, selected, onClick }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`text-left rounded-xl border p-3 transition-all
        ${selected
          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500 shadow-sm"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <div className="flex items-center gap-2 font-medium text-slate-800">
        <Icon size={16} className={selected ? "text-primary-600" : "text-slate-400"} />
        <span className="text-sm">{option.label}</span>
        {selected && <CheckCircle2 size={14} className="text-primary-600 ml-auto" />}
      </div>
      <p className="text-xs text-slate-500 mt-1 leading-snug">{option.description}</p>
    </button>
  );
}

function RecipientBadge({ loading, count }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200
                    px-3 py-2 text-sm">
      <UserCheck size={15} className="text-slate-500 flex-shrink-0" />
      <span className="text-slate-600">
        Recipients:{" "}
        <strong className="text-slate-800">
          {loading ? "counting…" : count == null ? "—" : count.toLocaleString()}
        </strong>
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL BROADCAST
═══════════════════════════════════════════════════════════════════════════ */

function EmailBroadcast() {
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [audience, setAudience] = useState("subscribers");
  const [nationality, setNationality] = useState("");
  const [nationalities, setNationalities] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [templateKey, setTemplateKey] = useState("new_destination");
  const [templateName, setTemplateName] = useState("New destination");
  const [context, setContext] = useState("new_destination");
  const [preheader, setPreheader] = useState("");
  const [headline, setHeadline] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#059669");
  const [backgroundColor, setBackgroundColor] = useState("#f0fdf4");
  const [layout, setLayout] = useState("adventure");
  const [animation, setAnimation] = useState("fade");
  const [ctaLabel, setCtaLabel] = useState("Explore destination");
  const [ctaUrl, setCtaUrl] = useState("https://www.altuverasafaris.com/destinations");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientCount, setRecipientCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const applyTemplate = useCallback((template) => {
    if (!template) return;
    setTemplateKey(template.key || "custom_email");
    setTemplateName(template.name || "Custom email");
    setContext(template.context || "general");
    setSubject(template.subject || "");
    setPreheader(template.preheader || "");
    setHeadline(template.headline || "");
    setBody(template.body || "");
    setHeroImageUrl(template.hero_image_url || "");
    setAccentColor(template.accent_color || "#059669");
    setBackgroundColor(template.background_color || "#f0fdf4");
    setLayout(template.layout || "editorial");
    setAnimation(template.animation || "none");
    setCtaLabel(template.cta_label || "Explore more");
    setCtaUrl(template.cta_url || "https://www.altuverasafaris.com/destinations");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await emailBroadcastAPI.getTemplates();
        const rows = data?.data || [];
        if (cancelled) return;
        setTemplates(rows);
        applyTemplate(rows.find(t => t.key === "new_destination") || rows[0]);
        const historyRes = await emailBroadcastAPI.getHistory().catch(() => ({ data: { data: [] } }));
        if (!cancelled) setHistory(historyRes.data?.data || []);
        const nationalityRes = await emailBroadcastAPI.getNationalities().catch(() => ({ data: { data: [] } }));
        if (!cancelled) setNationalities(nationalityRes.data?.data || []);
      } catch (e) {
        if (!cancelled) toastRef.current.error(extractError(e, "Email templates could not be loaded."));
      }
    })();
    return () => { cancelled = true; };
  }, [applyTemplate]);

  useEffect(() => {
    if (audience === "nationality" && !nationality) {
      setRecipientCount(null);
      return;
    }
    let cancelled = false;
    setCountLoading(true);
    emailBroadcastAPI.preview({
      audience,
      ...(audience === "nationality" ? { nationality } : {}),
    })
      .then(({ data }) => { if (!cancelled) setRecipientCount(data?.count ?? null); })
      .catch(() => { if (!cancelled) setRecipientCount(null); })
      .finally(() => { if (!cancelled) setCountLoading(false); });
    return () => { cancelled = true; };
  }, [audience, nationality]);

  const activeAudience = useMemo(() => AUDIENCE_OPTIONS.find(a => a.value === audience), [audience]);
  const templatePayload = useMemo(() => ({
    key: templateKey.trim(),
    name: templateName.trim(),
    context,
    subject: subject.trim(),
    preheader: preheader.trim(),
    headline: headline.trim(),
    body: body.trim(),
    hero_image_url: heroImageUrl.trim(),
    accent_color: accentColor,
    background_color: backgroundColor,
    layout,
    animation,
    cta_label: ctaLabel.trim(),
    cta_url: ctaUrl.trim(),
  }), [templateKey, templateName, context, subject, preheader, headline, body, heroImageUrl, accentColor, backgroundColor, layout, animation, ctaLabel, ctaUrl]);

  const canSend = !sending && !savingTemplate && !!subject.trim() && !!body.trim()
    && (audience !== "nationality" || !!nationality);
  const canSave = !sending && !savingTemplate && !!templateKey.trim() && !!templateName.trim()
    && !!subject.trim() && !!body.trim();

  const handleSaveTemplate = useCallback(async () => {
    if (!canSave) return toast.error("Add a template name, key, subject, and message before saving.");
    setSavingTemplate(true);
    try {
      const { data } = await emailBroadcastAPI.saveTemplate(templatePayload);
      const saved = data?.data;
      if (saved) {
        setTemplates(previous => [...previous.filter(item => item.key !== saved.key), saved].sort((a,b) => a.name.localeCompare(b.name)));
        applyTemplate(saved);
      }
      toast.success(data?.message || "Template saved for reuse.");
    } catch (e) {
      toast.error(extractError(e, "Template could not be saved."));
    } finally {
      setSavingTemplate(false);
    }
  }, [canSave, templatePayload, applyTemplate, toast]);

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) return toast.error("Subject and message are required.");
    if (audience === "nationality" && !nationality) return toast.error("Please choose a nationality.");
    setSending(true);
    try {
      const { data } = await emailBroadcastAPI.send({
        audience,
        nationality: audience === "nationality" ? nationality : undefined,
        templateKey: templateKey.trim(),
        template: templatePayload,
        contextData: {
          contentUrl: ctaUrl.trim(),
          bookingUrl: "https://www.altuverasafaris.com/booking",
        },
      });
      setLastSent({
        subject: subject.trim(), audience,
        nationality: audience === "nationality" ? nationality : null,
        sent: data?.sent ?? 0, failed: data?.failed ?? 0, total: data?.total ?? 0,
      });
      toast.success(data?.message || ("Email sent to " + (data?.sent ?? 0) + " recipient(s)."));
      const historyRes = await emailBroadcastAPI.getHistory().catch(() => null);
      if (historyRes?.data?.data) setHistory(historyRes.data.data);
    } catch (e) {
      toast.error(extractError(e, "Failed to send email broadcast."));
    } finally {
      setSending(false);
    }
  }, [audience, nationality, subject, body, templateKey, templatePayload, ctaUrl, toast]);

  const previewCopy = body
    .replace(/\{\{firstName\}\}/g, "Alex")
    .replace(/\{\{destinationName\}\}/g, "Volcanoes National Park")
    .replace(/\{\{postTitle\}\}/g, "A guide to Rwanda")
    .replace(/\{\{packageName\}\}/g, "Rwanda Gorilla Trekking")
    .replace(/\{\{countryName\}\}/g, "Rwanda");

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <Mail size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-900 leading-relaxed">
            <p className="font-semibold">Altuvera Email Studio</p>
            <p>Design reusable, personalised emails with context-specific copy, imagery, colours, and layouts. Marketing broadcasts go only to registered users and travellers who opted in, plus active newsletter subscribers. Essential booking emails remain separate.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4 min-w-0">
            <Field label="Load a saved template" icon={Mail}>
              <select value={templateKey} onChange={e => applyTemplate(templates.find(t => t.key === e.target.value))} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {templates.map(t => <option key={t.key} value={t.key}>{t.name} · {t.context.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Template name" required>
                <input value={templateName} onChange={e => setTemplateName(e.target.value)} maxLength={120} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="A memorable template name" />
              </Field>
              <Field label="Template key" required hint="Change the key to save a separate copy.">
                <input value={templateKey} onChange={e => setTemplateKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"))} maxLength={80} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </Field>
            </div>
            <Field label="Email context" required>
              <select value={context} onChange={e => setContext(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="new_destination">New destination</option>
                <option value="new_post">New travel post</option>
                <option value="new_package">New package</option>
                <option value="top_rated_destination">Popular / top-rated destination</option>
                <option value="booking_encouragement">Booking encouragement</option>
                <option value="travel_guide">Travel guide / seasonal inspiration</option>
                <option value="general">General announcement</option>
              </select>
            </Field>
            <Field label="Subject line" required>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="A helpful, concise subject line" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Inbox preview text" hint="A short sentence displayed next to the subject in many inboxes.">
              <input value={preheader} onChange={e => setPreheader(e.target.value)} maxLength={240} placeholder="A little more context before they open" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <Field label="Headline" required>
              <input value={headline} onChange={e => setHeadline(e.target.value)} maxLength={180} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="Email headline" />
            </Field>
            <Field label="Email message" required hint="Personalisation tokens: {{firstName}}, {{destinationName}}, {{countryName}}, {{packageName}}, {{postTitle}}. Keep the email helpful and brief.">
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} maxLength={10000} placeholder="Write a concise, contextual message…" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm resize-y min-h-[150px]" />
            </Field>
            <Field label="Hero image URL" hint="Use a public HTTPS image; choose a destination or package image when possible.">
              <input value={heroImageUrl} onChange={e => setHeroImageUrl(e.target.value)} placeholder="https://…" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Accent colour">
                <div className="flex gap-2 items-center"><input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10 w-12 border rounded-lg p-1 bg-white" /><input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full min-w-0 px-2 py-2 border rounded-lg text-xs uppercase" /></div>
              </Field>
              <Field label="Background colour">
                <div className="flex gap-2 items-center"><input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="h-10 w-12 border rounded-lg p-1 bg-white" /><input value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="w-full min-w-0 px-2 py-2 border rounded-lg text-xs uppercase" /></div>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Layout">
                <select value={layout} onChange={e => setLayout(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm">
                  <option value="adventure">Adventure</option><option value="editorial">Editorial</option><option value="minimal">Minimal</option>
                </select>
              </Field>
              <Field label="Email motion" hint="Optional CSS motion; unsupported email clients show the complete static design.">
                <select value={animation} onChange={e => setAnimation(e.target.value)} className="w-full px-3 py-2.5 border rounded-lg bg-white text-sm">
                  <option value="none">None</option><option value="fade">Soft fade</option><option value="rise">Gentle rise</option>
                </select>
              </Field>
              <Field label="Button label">
                <input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} maxLength={80} className="w-full px-3 py-2.5 border rounded-lg text-sm" />
              </Field>
              <Field label="Button URL">
                <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} maxLength={600} className="w-full px-3 py-2.5 border rounded-lg text-sm" />
              </Field>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <div className="px-4 py-3 border-b bg-white flex items-center justify-between gap-2">
                <div><h3 className="font-semibold text-slate-800">Live email preview</h3><p className="text-xs text-slate-500">Personalised sample for Alex</p></div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Responsive design</span>
              </div>
              <div className="p-3 sm:p-5" style={{ background: backgroundColor }}>
                <div className="max-w-[600px] mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
                  <div className="p-5 sm:p-7 text-center" style={{ background: layout === "minimal" ? "#fff" : accentColor, color: layout === "minimal" ? "#0f172a" : "#fff" }}>
                    <p className="text-[10px] font-bold tracking-[.2em]">ALTUVERA SAFARIS</p>
                    <h3 className="mt-3 text-xl sm:text-2xl font-extrabold leading-tight">{headline.replace(/\{\{firstName\}\}/g, "Alex").replace(/\{\{destinationName\}\}/g, "Volcanoes National Park") || subject || "Your next adventure"}</h3>
                    <p className="text-xs mt-2 opacity-80">True adventure in high places &amp; deep culture</p>
                  </div>
                  {heroImageUrl.trim() && <img src={heroImageUrl.trim()} alt="Email hero preview" className="block w-full max-h-56 object-cover" />}
                  <div className="p-5 sm:p-7">
                    {previewCopy.split(/\n{2,}/).map((p, i) => <p key={i} className="text-sm leading-7 text-slate-700 mb-4 whitespace-pre-line">{p}</p>)}
                    <div className="text-center mt-5"><span className="inline-flex rounded-lg px-5 py-3 text-sm font-bold text-white" style={{ background: accentColor }}>{ctaLabel || "Explore more"}</span></div>
                    <p className="text-[10px] text-slate-400 text-center mt-5">Mobile-friendly email · Personalised for each recipient</p>
                  </div>
                </div>
              </div>
            </div>

            <Field label="Audience" required icon={Users}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUDIENCE_OPTIONS.map(opt => (
                  <AudienceCard key={opt.value} option={opt} selected={audience === opt.value} onClick={() => setAudience(opt.value)} />
                ))}
              </div>
            </Field>
            {audience === "nationality" && (
              <Field label="Nationality" required icon={Flag}>
                <select value={nationality} onChange={e => setNationality(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">Select nationality…</option>
                  {nationalities.map(n => <option key={n.nationality} value={n.nationality}>{n.nationality} ({n.count})</option>)}
                </select>
              </Field>
            )}
            <RecipientBadge loading={countLoading} count={recipientCount} />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button onClick={handleSaveTemplate} disabled={!canSave} className="btn-secondary inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50">
                <CheckCircle2 size={16} /> {savingTemplate ? "Saving…" : "Save reusable template"}
              </button>
              <button onClick={handleSend} disabled={!canSend} className="btn-primary inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50">
                <Send size={16} /> {sending ? "Sending…" : "Send email"}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">Note: email clients often block animations, so the design uses robust responsive layouts and static fallbacks. Review the preview and save the template before reusing it.</p>
          </div>
        </div>
      </div>

      {lastSent && <LastEmailReceipt data={lastSent} />}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2"><CalendarClock size={17} className="text-primary-600" /> Recent email campaign history</h3>
          <button type="button" onClick={() => emailBroadcastAPI.getHistory().then(({data}) => setHistory(data?.data || [])).catch(e => toast.error(extractError(e, "History unavailable.")))} className="text-xs text-primary-700 hover:underline">Refresh</button>
        </div>
        {history.length === 0 ? <p className="text-sm text-slate-500">No campaigns sent yet.</p> : (
          <div className="space-y-2">
            {history.slice(0, 8).map(row => {
              const details = row.details && typeof row.details === "object" ? row.details : {};
              const eventData = details.eventData && typeof details.eventData === "object" ? details.eventData : {};
              const eventName = eventData.destinationName || eventData.postTitle || eventData.packageName || eventData.countryName || "";
              return (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 break-words">{row.subject}</p>
                      {details.autoTriggered && <ChipWhite color="emerald">Automatic</ChipWhite>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{row.context?.replace(/_/g, " ")} · {row.audience} · {new Date(row.created_at).toLocaleString()}</p>
                    {eventName && <p className="text-xs text-slate-600 mt-1.5"><span className="font-semibold">Context:</span> {eventName}</p>}
                    {details.queueId && <p className="text-[10px] text-slate-400 mt-1">Campaign reference #{details.queueId}</p>}
                    {(details.error || details.errors?.length > 0) && <p className="text-xs text-rose-700 mt-1.5">Delivery issues: {details.errors?.length ? details.errors.map(item => item.error).filter(Boolean).slice(0, 2).join("; ") : details.error}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <ChipWhite color="emerald">{row.sent_count} sent</ChipWhite>
                    {row.failed_count > 0 && <ChipWhite color="rose">{row.failed_count} failed</ChipWhite>}
                    <ChipWhite color="slate">{row.recipient_count} total</ChipWhite>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LastEmailReceipt({ data }) {
  return (
    <div className="card p-4 sm:p-5 border-emerald-200 bg-emerald-50/60">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Newsletter delivered</h3>
      </div>
      <p className="text-sm font-medium text-slate-800 break-words">{data.subject}</p>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <ChipWhite color="slate">
          {data.audience}{data.nationality ? `: ${data.nationality}` : ""}
        </ChipWhite>
        <ChipWhite color="emerald">{data.sent} sent</ChipWhite>
        {data.failed > 0 && <ChipWhite color="rose">{data.failed} failed</ChipWhite>}
        <ChipWhite color="slate">{data.total} total</ChipWhite>
      </div>
    </div>
  );
}

function ChipWhite({ children, color = "slate" }) {
  const colors = {
    slate:   "border-slate-200 text-slate-600",
    emerald: "border-emerald-200 text-emerald-700",
    rose:    "border-rose-200 text-rose-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full bg-white border capitalize ${colors[color]}`}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IN-APP NOTIFICATION BROADCAST
═══════════════════════════════════════════════════════════════════════════ */

const INIT_NOTIF = {
  title:        "",
  message:      "",
  type:         "announcement",
  priority:     "normal",
  action_url:   "",
  action_label: "",
  expires_at:   "",
};

function NotificationBroadcast() {
  const toast = useToast();
  const [form, setForm]         = useState(INIT_NOTIF);
  const [sending, setSending]   = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const setField = useCallback(
    (key, value) => setForm((p) => ({ ...p, [key]: value })),
    []
  );

  const canSend = useMemo(() =>
    !sending && form.title.trim().length > 0 && form.message.trim().length > 0,
    [sending, form.title, form.message]
  );

  const handleSend = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error("Title and message are required.");
    }

    // Validate expiry
    let expiresPayload = {};
    if (form.expires_at) {
      const t = new Date(form.expires_at).getTime();
      if (!Number.isFinite(t) || t <= Date.now() + 60_000) {
        return toast.error(
          "Expiry must be at least a minute in the future. Leave it blank for a permanent notification."
        );
      }
      expiresPayload = { expires_at: new Date(t).toISOString() };
    }

    setSending(true);
    try {
      const payload = {
        title:        form.title.trim(),
        message:      form.message.trim(),
        type:         form.type,
        priority:     form.priority,
        target_scope: "all",
        ...(form.action_url.trim()   && { action_url:   form.action_url.trim()   }),
        ...(form.action_label.trim() && { action_label: form.action_label.trim() }),
        ...expiresPayload,
      };

      const res = await notificationsAPI.broadcast(payload);
      setLastSent({
        ...payload,
        created_at: new Date().toISOString(),
        recipients: res?.recipients ?? res?.data?.recipients ?? "all users",
      });
      toast.success("Notification broadcast to all users!");
      setForm(INIT_NOTIF);
    } catch (e) {
      toast.error(extractError(e, "Failed to broadcast notification."));
    } finally {
      setSending(false);
    }
  }, [form, toast]);

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-6 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <Users size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800 leading-relaxed">
            This message is delivered to all users instantly via live socket
            connection and also appears in their in-app notifications.
          </p>
        </div>

        {/* Title */}
        <div>
          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              maxLength={LIMITS.TITLE}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. New Tanzania Safari Packages Are Live!"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
            />
          </Field>
          <CharCounter current={form.title.length} max={LIMITS.TITLE} />
        </div>

        {/* Message */}
        <div>
          <Field label="Message" required>
            <textarea
              value={form.message}
              rows={5}
              maxLength={LIMITS.MESSAGE}
              onChange={(e) => setField("message", e.target.value)}
              placeholder="Write the notification message your users will see…"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-y
                         min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            />
          </Field>
          <CharCounter current={form.message.length} max={LIMITS.MESSAGE} />
        </div>

        {/* Type + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            >
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            >
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        {/* Action URL + Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Action URL" icon={Link2} hint="Optional — where users go when they click">
            <input
              type="url"
              value={form.action_url}
              onChange={(e) => setField("action_url", e.target.value)}
              placeholder="https://altuvera.com/…"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
            />
          </Field>
          <Field label="Action Label" hint="Optional — button text">
            <input
              type="text"
              value={form.action_label}
              onChange={(e) => setField("action_label", e.target.value)}
              placeholder="View details"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
            />
          </Field>
        </div>

        {/* Expiry */}
        <Field label="Expires At" icon={CalendarClock} hint="Optional — leave blank for permanent">
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setField("expires_at", e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
          />
        </Field>

        {/* Send bar */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between
                        gap-3 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Bell size={13} /> Target: <strong className="text-slate-700">All users</strong>
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary inline-flex items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Send size={16} /> {sending ? "Broadcasting…" : "Broadcast Now"}
          </button>
        </div>
      </div>

      {lastSent && <LastNotifReceipt data={lastSent} />}

      <div className="flex items-start gap-2 text-xs text-slate-500 px-1">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          Urgent/high priority broadcasts will surface prominently in the user's
          notification bell. Keep messages clear and concise for the best reach.
        </p>
      </div>
    </div>
  );
}

function LastNotifReceipt({ data }) {
  return (
    <div className="card p-4 sm:p-5 border-emerald-200 bg-emerald-50/60">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Broadcast delivered</h3>
      </div>
      <p className="text-sm font-medium text-slate-800 break-words">{data.title}</p>
      <p className="text-sm text-slate-600 mt-0.5 break-words">{data.message}</p>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <ChipWhite>{data.type}</ChipWhite>
        <ChipWhite>{data.priority} priority</ChipWhite>
        <ChipWhite>{String(data.recipients)}</ChipWhite>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { key: "email",        label: "Email Broadcast",     icon: Mail },
  { key: "notification", label: "In-app Notification", icon: Bell },
];

export default function Broadcast() {
  const [tab, setTab] = useState("email");

  return (
    <div className="space-y-5 page-enter max-w-3xl mx-auto px-3 sm:px-0">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone size={28} className="text-primary-600" /> Broadcast
          </h1>
          <p className="page-subtitle">
            Send a newsletter to active subscribers by email; linked subscriber accounts also receive the newsletter instantly in their in-app notification center.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium
                whitespace-nowrap border-b-2 -mb-px transition-colors
                ${active
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "email" ? <EmailBroadcast /> : <NotificationBroadcast />}
    </div>
  );
}