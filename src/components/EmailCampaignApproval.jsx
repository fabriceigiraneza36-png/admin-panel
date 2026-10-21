import React, { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Clock3, Mail, Send, X } from "lucide-react";
import { useSocket } from "@context/SocketContext";
import { useAuth } from "@hooks/useAuth";
import { emailBroadcastAPI } from "@api/emailBroadcast";

const asText = (value, fallback = "") => String(value ?? fallback);

export default function EmailCampaignApproval() {
  const { connected, getSocket } = useSocket();
  const { isLoggedIn } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connected || !isLoggedIn) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    const onApproval = (payload) => {
      if (!payload?.id) return;
      const template = payload.template || {};
      setCampaign({
        id: payload.id,
        context: payload.context || "general",
        contextData: payload.contextData || {},
        subject: asText(template.subject, "An Altuvera update for you"),
        preheader: asText(template.preheader),
        headline: asText(template.headline, "Discover more with Altuvera"),
        body: asText(template.body, "Hello {{firstName}},\n\nDiscover more travel inspiration from Altuvera."),
        hero_image_url: asText(template.hero_image_url || payload.contextData?.heroImageUrl),
        accent_color: asText(template.accent_color, "#059669"),
        background_color: asText(template.background_color, "#f0fdf4"),
        layout: asText(template.layout, "adventure"),
        cta_label: asText(template.cta_label, "Explore more"),
        cta_url: asText(template.cta_url || payload.contextData?.contentUrl, "https://www.altuverasafaris.com/destinations"),
        endsAt: Date.now() + Math.max(1, Number(payload.countdownSeconds) || 10) * 1000,
      });
      setRemaining(Math.max(1, Number(payload.countdownSeconds) || 10));
      setError("");
    };
    const onSent = (payload) => {
      setCampaign((current) => current && String(current.id) === String(payload?.id) ? null : current);
    };
    socket.on("email-campaign:approval-needed", onApproval);
    socket.on("email-campaign:sent", onSent);

    // If the admin refreshes or opens another panel during the 10-second
    // window, recover any still-editable queued campaign from the API.
    let cancelled = false;
    emailBroadcastAPI.getPendingQueue().then(async ({ data }) => {
      const rows = Array.isArray(data?.data) ? data.data : [];
      if (!rows.length || cancelled) return;
      const now = Date.now();
      const row = rows.find(item => new Date(item.scheduled_at).getTime() > now);
      if (!row) return;
      const [templatesResult] = await Promise.all([emailBroadcastAPI.getTemplates()]);
      if (cancelled) return;
      const saved = (templatesResult.data?.data || []).find(item => item.key === row.template_key) || {};
      const parseObject = value => {
        if (value && typeof value === "object") return value;
        try { return JSON.parse(value || "{}"); } catch { return {}; }
      };
      const overrides = parseObject(row.template_overrides);
      const contextData = parseObject(row.data);
      const template = { ...saved, ...overrides };
      const seconds = Math.max(0, Math.ceil((new Date(row.scheduled_at).getTime() - Date.now()) / 1000));
      setCampaign(current => current || ({
        id: row.id,
        context: row.context || "general",
        contextData,
        subject: asText(template.subject, "An Altuvera update for you"),
        preheader: asText(template.preheader),
        headline: asText(template.headline, "Discover more with Altuvera"),
        body: asText(template.body, "Hello {{firstName}},\n\nDiscover more travel inspiration from Altuvera."),
        hero_image_url: asText(template.hero_image_url || contextData.heroImageUrl),
        accent_color: asText(template.accent_color, "#059669"),
        background_color: asText(template.background_color, "#f0fdf4"),
        layout: asText(template.layout, "adventure"),
        cta_label: asText(template.cta_label, "Explore more"),
        cta_url: asText(template.cta_url || contextData.contentUrl, "https://www.altuverasafaris.com/destinations"),
        endsAt: Date.now() + seconds * 1000,
      }));
      setRemaining(seconds);
    }).catch(() => { /* the scheduled worker remains the source of truth */ });

    return () => {
      cancelled = true;
      socket.off("email-campaign:approval-needed", onApproval);
      socket.off("email-campaign:sent", onSent);
    };
  }, [connected, getSocket, isLoggedIn]);

  useEffect(() => {
    if (!campaign) return undefined;
    const update = () => {
      const next = Math.max(0, Math.ceil((campaign.endsAt - Date.now()) / 1000));
      setRemaining(next);
      if (next <= 0) setCampaign((current) => current && current.id === campaign.id ? null : current);
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [campaign?.id, campaign?.endsAt]);

  const contextLabel = useMemo(
    () => String(campaign?.context || "general").replace(/[_-]+/g, " "),
    [campaign?.context]
  );
  if (!campaign || !isLoggedIn) return null;

  const change = (key, value) => setCampaign((current) => ({ ...current, [key]: value }));
  const saveRetouch = async () => {
    setSaving(true);
    setError("");
    try {
      const { id, endsAt, context, contextData, ...template } = campaign;
      await emailBroadcastAPI.updateQueuedTemplate(id, template);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Your changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const sendNow = async () => {
    setSending(true);
    setError("");
    try {
      const { id, endsAt, context, contextData, ...template } = campaign;
      await emailBroadcastAPI.sendQueuedNow(id, template);
      setCampaign(null);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "The campaign could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed z-[10000] bottom-4 right-4 w-[min(94vw,460px)] max-h-[85dvh] overflow-y-auto rounded-2xl border border-emerald-200 bg-white shadow-2xl">
      <div className="flex items-start gap-3 bg-emerald-950 p-4 text-white">
        <div className="rounded-xl bg-white/10 p-2"><BellRing size={20}/></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Email ready for your review</div>
          <div className="mt-1 text-xs capitalize text-emerald-100">Context: {contextLabel}</div>
        </div>
        <button type="button" onClick={() => setCampaign(null)} aria-label="Dismiss email review; scheduled email will still send" className="rounded-lg p-1.5 hover:bg-white/10"><X size={18}/></button>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
          <Clock3 size={17}/>
          <span className="text-sm">Automatic send in <strong className="tabular-nums">{remaining}s</strong></span>
        </div>
        <label className="block text-xs font-semibold text-slate-600">Subject
          <input value={campaign.subject} maxLength={200} onChange={e => change("subject", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/>
        </label>
        <label className="block text-xs font-semibold text-slate-600">Inbox preview text
          <input value={campaign.preheader} maxLength={240} onChange={e => change("preheader", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/>
        </label>
        <label className="block text-xs font-semibold text-slate-600">Headline
          <input value={campaign.headline} maxLength={180} onChange={e => change("headline", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/>
        </label>
        <label className="block text-xs font-semibold text-slate-600">Message
          <textarea value={campaign.body} rows={4} maxLength={10000} onChange={e => change("body", e.target.value)} className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-slate-900"/>
        </label>
        <label className="block text-xs font-semibold text-slate-600">Hero image URL
          <input value={campaign.hero_image_url} onChange={e => change("hero_image_url", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900" placeholder="https://…"/>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-xs font-semibold text-slate-600">Email layout
            <select value={campaign.layout} onChange={e => change("layout", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900">
              <option value="adventure">Adventure</option>
              <option value="editorial">Editorial</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Button label
            <input value={campaign.cta_label} maxLength={80} onChange={e => change("cta_label", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900"/>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Button URL
            <input value={campaign.cta_url} maxLength={1200} onChange={e => change("cta_url", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-900"/>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-slate-600">Accent colour
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(campaign.accent_color) ? campaign.accent_color : "#059669"} onChange={e => change("accent_color", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 p-1"/>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Background
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(campaign.background_color) ? campaign.background_color : "#f0fdf4"} onChange={e => change("background_color", e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 p-1"/>
          </label>
        </div>
        {campaign.hero_image_url && <img src={campaign.hero_image_url} alt="Email campaign preview" className="max-h-32 w-full rounded-xl object-cover"/>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
        <p className="text-xs leading-5 text-slate-500">Dismissal or no action does not cancel the email. It will send automatically when the countdown ends.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={saveRetouch} disabled={saving || sending || remaining <= 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-3 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-50"><CheckCircle2 size={16}/>{saving ? "Saving…" : "Save retouches"}</button>
          <button type="button" onClick={sendNow} disabled={saving || sending || remaining <= 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Send size={16}/>{sending ? "Sending…" : "Send now"}</button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400"><Mail size={13}/> Personalised emails go only to opted-in recipients.</div>
      </div>
    </div>
  );
}
