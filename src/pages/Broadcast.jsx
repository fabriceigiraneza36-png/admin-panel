// src/pages/Broadcast.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Megaphone, Send, Users, Bell, Link2, CalendarClock,
  Info, CheckCircle2, Mail, Globe, Ticket, UserCheck, Flag,
} from "lucide-react";
import { notificationsAPI } from "@api/notifications";
import { emailBroadcastAPI } from "@api/emailBroadcast";
import { useToast } from "@hooks/useToast";

const extractError = (e) =>
  e?.response?.data?.message ||
  e?.data?.message ||
  e?.message ||
  "Failed to broadcast notification.";

const TYPE_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "general",      label: "General" },
  { value: "promotion",    label: "Promotion" },
  { value: "alert",        label: "Alert" },
  { value: "success",      label: "Success" },
  { value: "warning",      label: "Warning" },
  { value: "info",         label: "Info" },
];

const PRIORITY_OPTIONS = [
  { value: "low",    label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high",   label: "High" },
  { value: "urgent", label: "Urgent" },
];

const MAX_TITLE   = 120;
const MAX_MESSAGE = 1000;

const MAX_SUBJECT   = 200;
const MAX_EMAIL_BODY = 5000;

const AUDIENCE_OPTIONS = [
  {
    value: "all",
    label: "All users",
    description: "Everyone: registered users, active subscribers & anyone who booked.",
    icon: Globe,
  },
  {
    value: "subscribers",
    label: "Subscribers only",
    description: "Active newsletter subscribers.",
    icon: Mail,
  },
  {
    value: "bookers",
    label: "Users with a booking",
    description: "Anyone who has at least one booking.",
    icon: Ticket,
  },
  {
    value: "nationality",
    label: "By nationality",
    description: "Target users of a specific nationality.",
    icon: Flag,
  },
];

const extractEmailError = (e) =>
  e?.response?.data?.error ||
  e?.response?.data?.message ||
  e?.message ||
  "Failed to send email broadcast.";

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL BROADCAST TAB
═══════════════════════════════════════════════════════════════════════════ */
function EmailBroadcast() {
  const toast = useToast();

  const [audience, setAudience]       = useState("all");
  const [nationality, setNationality] = useState("");
  const [nationalities, setNationalities] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");

  const [recipientCount, setRecipientCount] = useState(null);
  const [countLoading, setCountLoading]     = useState(false);
  const [sending, setSending]   = useState(false);
  const [lastSent, setLastSent] = useState(null);

  // Load nationalities once
  useEffect(() => {
    let cancelled = false;
    emailBroadcastAPI
      .getNationalities()
      .then(({ data }) => {
        if (!cancelled) setNationalities(data?.data || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Preview recipient count whenever the audience changes
  useEffect(() => {
    if (audience === "nationality" && !nationality) {
      setRecipientCount(null);
      return;
    }
    let cancelled = false;
    setCountLoading(true);
    emailBroadcastAPI
      .preview({ audience, ...(audience === "nationality" ? { nationality } : {}) })
      .then(({ data }) => {
        if (!cancelled) setRecipientCount(data?.count ?? null);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });
    return () => { cancelled = true; };
  }, [audience, nationality]);

  const canSend =
    !sending &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== "nationality" || !!nationality);

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
        body: body.trim(),
        ...(audience === "nationality" ? { nationality } : {}),
      };
      const { data } = await emailBroadcastAPI.send(payload);
      setLastSent({
        subject: subject.trim(),
        audience,
        nationality: audience === "nationality" ? nationality : null,
        sent: data?.sent ?? 0,
        failed: data?.failed ?? 0,
        total: data?.total ?? 0,
      });
      toast.success(data?.message || `Email sent to ${data?.sent ?? 0} recipient(s).`);
      setSubject("");
      setBody("");
    } catch (e) {
      toast.error(extractEmailError(e));
    } finally {
      setSending(false);
    }
  }, [audience, nationality, subject, body, toast]);

  const activeAudience = AUDIENCE_OPTIONS.find((a) => a.value === audience);

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <Mail size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            Send an email to a targeted audience. Choose who receives it, write your
            message, then send. Large batches are throttled automatically.
          </p>
        </div>

        {/* Audience selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <span className="inline-flex items-center gap-1">
              <Users size={14} /> Audience <span className="text-rose-500">*</span>
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIENCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = audience === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`text-left rounded-xl border p-3 transition ${
                    selected
                      ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Icon size={16} className={selected ? "text-primary-600" : "text-slate-400"} />
                    {opt.label}
                    {selected && <CheckCircle2 size={14} className="text-primary-600 ml-auto" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nationality picker */}
        {audience === "nationality" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <span className="inline-flex items-center gap-1">
                <Flag size={13} /> Nationality <span className="text-rose-500">*</span>
              </span>
            </label>
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select nationality…</option>
              {nationalities.map((n) => (
                <option key={n.nationality} value={n.nationality}>
                  {n.nationality} ({n.count})
                </option>
              ))}
            </select>
            {nationalities.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                No nationalities recorded yet.
              </p>
            )}
          </div>
        )}

        {/* Recipient count */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
          <UserCheck size={15} className="text-slate-500" />
          <span className="text-slate-600">
            Recipients:{" "}
            <strong className="text-slate-800">
              {countLoading
                ? "counting…"
                : recipientCount == null
                ? "—"
                : recipientCount.toLocaleString()}
            </strong>
          </span>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Subject <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            maxLength={MAX_SUBJECT}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. New Safari Packages for Summer 2026"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {subject.length}/{MAX_SUBJECT}
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={body}
            rows={8}
            maxLength={MAX_EMAIL_BODY}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email message… Line breaks are preserved."
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-y
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {body.length}/{MAX_EMAIL_BODY}
          </div>
        </div>

        {/* Send */}
        <div className="flex items-center justify-between pt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Bell size={13} /> Target:{" "}
            <strong className="text-slate-600">
              {activeAudience?.label}
              {audience === "nationality" && nationality ? ` — ${nationality}` : ""}
            </strong>
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            <Send size={16} /> {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </div>

      {/* Last sent confirmation */}
      {lastSent && (
        <div className="card p-5 border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">Email broadcast delivered</h3>
          </div>
          <p className="text-sm font-medium text-slate-800">{lastSent.subject}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 capitalize">
              {lastSent.audience}
              {lastSent.nationality ? `: ${lastSent.nationality}` : ""}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700">
              {lastSent.sent} sent
            </span>
            {lastSent.failed > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white border border-rose-200 text-rose-700">
                {lastSent.failed} failed
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {lastSent.total} total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IN-APP NOTIFICATION BROADCAST TAB (existing behaviour)
═══════════════════════════════════════════════════════════════════════════ */
function NotificationBroadcast() {
  const toast = useToast();

  const [form, setForm] = useState({
    title:       "",
    message:     "",
    type:        "announcement",
    priority:    "normal",
    action_url:  "",
    action_label: "",
    expires_at:  "",
  });
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const titleLen   = form.title.length;
  const messageLen = form.message.length;
  const canSend =
    !sending && form.title.trim().length > 0 && form.message.trim().length > 0;

  const handleSend = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error("Title and message are required.");
    }
    setSending(true);
    try {
      const payload = {
        title:        form.title.trim(),
        message:      form.message.trim(),
        type:         form.type,
        priority:     form.priority,
        target_scope: "all",
        ...(form.action_url.trim()
          ? { action_url: form.action_url.trim() }
          : {}),
        ...(form.action_label.trim()
          ? { action_label: form.action_label.trim() }
          : {}),
        ...(form.expires_at
          ? { expires_at: new Date(form.expires_at).toISOString() }
          : {}),
      };

      const res = await notificationsAPI.broadcast(payload);
      setLastSent({
        ...payload,
        created_at: new Date().toISOString(),
        recipients: res?.recipients ?? res?.data?.recipients ?? "all users",
      });
      toast.success("Notification broadcast to all users!");
      setForm({
        title: "", message: "", type: "announcement", priority: "normal",
        action_url: "", action_label: "", expires_at: "",
      });
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSending(false);
    }
  }, [form, toast]);

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="card p-6 space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
          <Users size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            This message is delivered to all users instantly via live socket
            connection and also appears in their in-app notifications.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            maxLength={MAX_TITLE}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="e.g. New Tanzania Safari Packages Are Live!"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {titleLen}/{MAX_TITLE}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={form.message}
            rows={5}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setField("message", e.target.value)}
            placeholder="Write the notification message your users will see…"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm resize-y
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {messageLen}/{MAX_MESSAGE}
          </div>
        </div>

        {/* Type + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setField("priority", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action URL + Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <span className="inline-flex items-center gap-1">
                <Link2 size={13} /> Action URL
              </span>
              <span className="text-slate-400 font-normal"> (optional)</span>
            </label>
            <input
              type="text"
              value={form.action_url}
              onChange={(e) => setField("action_url", e.target.value)}
              placeholder="https://altuvera.com/…"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Action Label
              <span className="text-slate-400 font-normal"> (optional)</span>
            </label>
            <input
              type="text"
              value={form.action_label}
              onChange={(e) => setField("action_label", e.target.value)}
              placeholder="View details"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={13} /> Expires At
            </span>
            <span className="text-slate-400 font-normal"> (optional)</span>
          </label>
          <input
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setField("expires_at", e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Send */}
        <div className="flex items-center justify-between pt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Bell size={13} /> Target: <strong className="text-slate-600">All users</strong>
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            <Send size={16} /> {sending ? "Broadcasting…" : "Broadcast Now"}
          </button>
        </div>
      </div>

      {/* Last sent confirmation */}
      {lastSent && (
        <div className="card p-5 border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">
              Broadcast delivered
            </h3>
          </div>
          <p className="text-sm font-medium text-slate-800">{lastSent.title}</p>
          <p className="text-sm text-slate-600 mt-0.5">{lastSent.message}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 capitalize">
              {lastSent.type}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 capitalize">
              {lastSent.priority} priority
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {String(lastSent.recipients)}
            </span>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="flex items-start gap-2 text-xs text-slate-500 px-1">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <p>
          Urgent/high priority broadcasts will surface prominently in the user's
          notification bell. Keep messages clear and concise for the best reach.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE — tabbed: Email broadcast + In-app notification broadcast
═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { key: "email",        label: "Email Broadcast",   icon: Mail },
  { key: "notification", label: "In-app Notification", icon: Bell },
];

export default function Broadcast() {
  const [tab, setTab] = useState("email");

  return (
    <div className="space-y-5 page-enter max-w-3xl mx-auto">
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
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                border-b-2 -mb-px transition ${
                  active
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
