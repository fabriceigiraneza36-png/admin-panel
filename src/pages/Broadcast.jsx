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

import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  { value: "all",         label: "All users",             description: "Everyone: registered users, subscribers & bookers.", icon: Globe  },
  { value: "subscribers", label: "Subscribers only",      description: "Active newsletter subscribers.",                     icon: Mail   },
  { value: "bookers",     label: "Users with a booking",  description: "Anyone who has at least one booking.",               icon: Ticket },
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

  const [audience, setAudience]           = useState("all");
  const [nationality, setNationality]     = useState("");
  const [nationalities, setNationalities] = useState([]);
  const [subject, setSubject]             = useState("");
  const [body, setBody]                   = useState("");

  const [recipientCount, setRecipientCount] = useState(null);
  const [countLoading, setCountLoading]     = useState(false);
  const [sending, setSending]               = useState(false);
  const [lastSent, setLastSent]             = useState(null);

  /* Load nationalities once */
  useEffect(() => {
    let cancelled = false;
    emailBroadcastAPI.getNationalities()
      .then(({ data }) => { if (!cancelled) setNationalities(data?.data || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* Live recipient count */
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

  const activeAudience = useMemo(
    () => AUDIENCE_OPTIONS.find((a) => a.value === audience),
    [audience]
  );

  const canSend = useMemo(() =>
    !sending &&
    subject.trim().length > 0 &&
    body.trim().length    > 0 &&
    (audience !== "nationality" || !!nationality),
    [sending, subject, body, audience, nationality]
  );

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) {
      return toast.error("Subject and message are required.");
    }
    if (audience === "nationality" && !nationality) {
      return toast.error("Please choose a nationality.");
    }
    setSending(true);
    try {
      const payload = {
        audience,
        subject: subject.trim(),
        body:    body.trim(),
        ...(audience === "nationality" ? { nationality } : {}),
      };
      const { data } = await emailBroadcastAPI.send(payload);
      setLastSent({
        subject: subject.trim(),
        audience,
        nationality: audience === "nationality" ? nationality : null,
        sent:   data?.sent   ?? 0,
        failed: data?.failed ?? 0,
        total:  data?.total  ?? 0,
      });
      toast.success(data?.message || `Email sent to ${data?.sent ?? 0} recipient(s).`);
      setSubject("");
      setBody("");
    } catch (e) {
      toast.error(extractError(e, "Failed to send email broadcast."));
    } finally {
      setSending(false);
    }
  }, [audience, nationality, subject, body, toast]);

  return (
    <div className="space-y-5">
      <div className="card p-4 sm:p-6 space-y-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <Mail size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800 leading-relaxed">
            Send an email to a targeted audience. Choose who receives it, write your
            message, then send. Large batches are throttled automatically.
          </p>
        </div>

        {/* Audience */}
        <Field label="Audience" required icon={Users}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIENCE_OPTIONS.map((opt) => (
              <AudienceCard
                key={opt.value}
                option={opt}
                selected={audience === opt.value}
                onClick={() => setAudience(opt.value)}
              />
            ))}
          </div>
        </Field>

        {/* Nationality picker */}
        {audience === "nationality" && (
          <Field label="Nationality" required icon={Flag}>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            >
              <option value="">Select nationality…</option>
              {nationalities.map((n) => (
                <option key={n.nationality} value={n.nationality}>
                  {n.nationality} ({n.count})
                </option>
              ))}
            </select>
            {nationalities.length === 0 && (
              <p className="text-xs text-slate-400">No nationalities recorded yet.</p>
            )}
          </Field>
        )}

        <RecipientBadge loading={countLoading} count={recipientCount} />

        {/* Subject */}
        <div>
          <Field label="Subject" required>
            <input
              type="text"
              value={subject}
              maxLength={LIMITS.SUBJECT}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New Safari Packages for Summer 2026"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            />
          </Field>
          <CharCounter current={subject.length} max={LIMITS.SUBJECT} />
        </div>

        {/* Body */}
        <div>
          <Field label="Message" required>
            <textarea
              value={body}
              rows={8}
              maxLength={LIMITS.EMAIL_BODY}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message… Line breaks are preserved."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-y
                         min-h-[160px] focus:outline-none focus:ring-2 focus:ring-primary-500
                         transition-shadow"
            />
          </Field>
          <CharCounter current={body.length} max={LIMITS.EMAIL_BODY} />
        </div>

        {/* Send bar */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between
                        gap-3 pt-2 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Bell size={13} /> Target:{" "}
            <strong className="text-slate-700">
              {activeAudience?.label}
              {audience === "nationality" && nationality ? ` — ${nationality}` : ""}
            </strong>
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary inline-flex items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <Send size={16} /> {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </div>

      {/* Last sent */}
      {lastSent && <LastEmailReceipt data={lastSent} />}
    </div>
  );
}

function LastEmailReceipt({ data }) {
  return (
    <div className="card p-4 sm:p-5 border-emerald-200 bg-emerald-50/60">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-emerald-600" />
        <h3 className="font-semibold text-emerald-900">Email broadcast delivered</h3>
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
            Email a targeted audience or push an in-app notification to all users.
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