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
  Search, Image as ImageIcon, UploadCloud, X, Plus, Save, Sparkles,
  Check, Loader2, UsersRound, Layers3, ShieldCheck, Eye,
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
  const [draft, setDraft] = useState({
    key: "new_destination",
    name: "New destination",
    context: "new_destination",
    subject: "A new place to discover, {{firstName}}",
    preheader: "Meet a new East African experience curated by Altuvera.",
    headline: "Your next adventure has a new address",
    body: "Hello {{firstName}},\n\nWe have a new Altuvera update for you. Explore the details below, discover what makes each place special, and start planning a journey that fits your style.",
    hero_image_url: "",
    accent_color: "#047857",
    background_color: "#f0fdf4",
    layout: "adventure",
    animation: "fade",
    cta_label: "Explore update",
    cta_url: "https://www.altuverasafaris.com/destinations",
  });
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [libraryType, setLibraryType] = useState("destination");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [mediaGallery, setMediaGallery] = useState([]);
  const [uploadTarget, setUploadTarget] = useState("gallery");
  const [uploading, setUploading] = useState(false);
  const [recipientMode, setRecipientMode] = useState("default");
  const [defaultAudience, setDefaultAudience] = useState("all");
  const [defaultAudienceListId, setDefaultAudienceListId] = useState("");
  const [audienceLists, setAudienceLists] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedAudienceId, setSavedAudienceId] = useState("");
  const [channels, setChannels] = useState({ email: true, inApp: true });
  const [recipientCounts, setRecipientCounts] = useState({ emailCount: null, inAppCount: null });
  const [countLoading, setCountLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [libraryError, setLibraryError] = useState("");

  const patchDraft = useCallback((key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const applyTemplate = useCallback((template) => {
    if (!template) return;
    setDraft((current) => ({
      ...current,
      ...template,
      key: template.key || current.key,
      name: template.name || current.name,
      context: template.context || current.context,
      subject: template.subject || current.subject,
      preheader: template.preheader || "",
      headline: template.headline || "",
      body: template.body || "",
      hero_image_url: template.hero_image_url || "",
      accent_color: template.accent_color || "#047857",
      background_color: template.background_color || "#f0fdf4",
      layout: template.layout || "adventure",
      animation: template.animation || "none",
      cta_label: template.cta_label || "Explore more",
      cta_url: template.cta_url || "https://www.altuverasafaris.com/destinations",
    }));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [templateRes, historyRes, settingsRes] = await Promise.all([
          emailBroadcastAPI.getTemplates(),
          emailBroadcastAPI.getHistory(),
          emailBroadcastAPI.getAudienceSettings(),
        ]);
        if (!active) return;
        const loadedTemplates = templateRes.data?.data || [];
        setTemplates(loadedTemplates);
        const initial = loadedTemplates.find((item) => item.key === "new_destination") || loadedTemplates[0];
        if (initial) applyTemplate(initial);
        setHistory(historyRes.data?.data || []);
        const settings = settingsRes.data?.data || {};
        setDefaultAudience(settings.defaultAudience || "all");
        setDefaultAudienceListId(settings.defaultAudienceListId ? String(settings.defaultAudienceListId) : "");
        setAudienceLists(settings.lists || []);
      } catch (error) {
        if (active) toast.error(extractError(error, "Email Studio could not load its saved settings."));
      }
    })();
    return () => { active = false; };
  }, [applyTemplate]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLibraryLoading(true);
      setLibraryError("");
      emailBroadcastAPI.getContentLibrary({ type: libraryType, search: librarySearch, limit: 36 })
        .then(({ data }) => { if (active) setLibraryItems(data?.data || []); })
        .catch((error) => {
          if (active) {
            setLibraryItems([]);
            setLibraryError(extractError(error, "The Altuvera content library could not be loaded."));
          }
        })
        .finally(() => { if (active) setLibraryLoading(false); });
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [libraryType, librarySearch]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setRecipientsLoading(true);
      emailBroadcastAPI.getRecipients({ search: recipientSearch })
        .then(({ data }) => { if (active) setRecipients(data?.data || []); })
        .catch((error) => {
          if (active) toast.error(extractError(error, "Recipient search could not be loaded."));
        })
        .finally(() => { if (active) setRecipientsLoading(false); });
    }, 240);
    return () => { active = false; clearTimeout(timer); };
  }, [recipientSearch]);

  const addLibraryItem = useCallback((item) => {
    if (item.type === "gallery") {
      const images = (item.images || []).map((image) => ({
        url: image.url,
        alt: image.alt || item.title,
        title: item.title,
        caption: image.caption || item.description || "",
        contentUrl: item.contentUrl,
      }));
      setMediaGallery((current) => {
        const urls = new Set(current.map((image) => image.url));
        return [...current, ...images.filter((image) => image.url && !urls.has(image.url))].slice(0, 10);
      });
      toast.success("Gallery image added to the email selection.");
      return;
    }
    setSelectedItems((current) => {
      if (current.some((entry) => entry.type === item.type && String(entry.id) === String(item.id))) return current;
      return [...current, item].slice(0, 12);
    });
    if (item.contentUrl) patchDraft("cta_url", item.contentUrl);
    if (!draft.hero_image_url && item.images?.[0]?.url) patchDraft("hero_image_url", item.images[0].url);
  }, [draft.hero_image_url, patchDraft]);

  const removeContentItem = useCallback((item) => {
    setSelectedItems((current) => current.filter((entry) => !(entry.type === item.type && String(entry.id) === String(item.id))));
  }, []);

  const toggleMedia = useCallback((image, item = null) => {
    const url = String(image?.url || image?.image_url || "").trim();
    if (!/^https:\/\//i.test(url)) return;
    setMediaGallery((current) => {
      if (current.some((entry) => entry.url === url)) return current.filter((entry) => entry.url !== url);
      if (current.length >= 10) {
        toast.error("Choose up to 10 images for one email.");
        return current;
      }
      return [...current, {
        url,
        alt: image.alt || image.altText || item?.title || "Altuvera Safaris",
        title: image.title || item?.title || "",
        caption: image.caption || "",
        contentUrl: item?.contentUrl || "",
      }];
    });
  }, []);

  const uploadImages = useCallback(async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 8);
    event.target.value = "";
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    setUploading(true);
    try {
      if (uploadTarget === "gallery") {
        const { data } = await emailBroadcastAPI.uploadGalleryAssets(formData);
        const urls = data?.data?.urls || [];
        const uploaded = urls.map((url, index) => ({
          url, alt: files[index]?.name || "Altuvera Safaris image",
          title: files[index]?.name || "Altuvera image",
          caption: "",
        }));
        setMediaGallery((current) => [...current, ...uploaded].slice(0, 10));
        setLibraryType("gallery");
        toast.success(data?.message || "Images uploaded to the Altuvera gallery.");
      } else {
        const [type, id] = uploadTarget.split(":");
        const { data } = await emailBroadcastAPI.attachContentImages(type, id, formData);
        const updated = data?.data?.item;
        if (updated) {
          setSelectedItems((current) => {
            const exists = current.some((entry) => entry.type === updated.type && String(entry.id) === String(updated.id));
            return exists ? current.map((entry) => entry.type === updated.type && String(entry.id) === String(updated.id) ? updated : entry) : [...current, updated].slice(0, 12);
          });
          const urls = data?.data?.urls || [];
          setMediaGallery((current) => [...current, ...urls.map((url) => ({
            url, alt: updated.title, title: updated.title, caption: updated.description || "", contentUrl: updated.contentUrl,
          }))].filter((entry, index, all) => all.findIndex((other) => other.url === entry.url) === index).slice(0, 10));
        }
        toast.success(data?.message || "Images attached to this content's gallery.");
      }
    } catch (error) {
      toast.error(extractError(error, "Image upload failed."));
    } finally {
      setUploading(false);
    }
  }, [uploadTarget]);

  const audiencePayload = useMemo(() => ({
    recipientMode,
    savedAudienceId: recipientMode === "saved_list" ? savedAudienceId : undefined,
    userIds: recipientMode === "selected" ? selectedUserIds : undefined,
    channels,
  }), [recipientMode, savedAudienceId, selectedUserIds, channels]);

  useEffect(() => {
    let active = true;
    setCountLoading(true);
    emailBroadcastAPI.previewContentCampaign(audiencePayload)
      .then(({ data }) => {
        if (active) setRecipientCounts({
          emailCount: data?.emailCount ?? 0,
          inAppCount: data?.inAppCount ?? 0,
        });
      })
      .catch(() => { if (active) setRecipientCounts({ emailCount: null, inAppCount: null }); })
      .finally(() => { if (active) setCountLoading(false); });
    return () => { active = false; };
  }, [audiencePayload]);

  const saveAudience = useCallback(async () => {
    if (!newListName.trim() || !selectedUserIds.length) {
      toast.error("Name the audience and select at least one user first.");
      return;
    }
    setSavingList(true);
    try {
      const { data } = await emailBroadcastAPI.saveAudienceList({ name: newListName.trim(), userIds: selectedUserIds });
      const saved = data?.data;
      if (saved) {
        setAudienceLists((current) => [saved, ...current.filter((item) => String(item.id) !== String(saved.id))]);
        setSavedAudienceId(String(saved.id));
        setRecipientMode("saved_list");
        setNewListName("");
      }
      toast.success(data?.message || "Audience list saved.");
    } catch (error) {
      toast.error(extractError(error, "Could not save the audience list."));
    } finally {
      setSavingList(false);
    }
  }, [newListName, selectedUserIds, toast]);

  const makeDefaultAudience = useCallback(async (audience, listId = null) => {
    setSavingDefault(true);
    try {
      await emailBroadcastAPI.updateAudienceSettings({ defaultAudience: audience, defaultAudienceListId: listId });
      setDefaultAudience(audience);
      setDefaultAudienceListId(listId ? String(listId) : "");
      setAudienceLists((current) => [...current]);
      toast.success(audience === "all" ? "All opted-in contacts will be the default audience." : "Your saved list is now the default audience.");
    } catch (error) {
      toast.error(extractError(error, "The default audience could not be saved."));
    } finally {
      setSavingDefault(false);
    }
  }, [toast]);

  const saveTemplate = useCallback(async () => {
    if (!draft.key.trim() || !draft.name.trim() || !draft.subject.trim() || !draft.body.trim()) {
      toast.error("Template name, key, subject and message are required.");
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = { ...draft, hero_image_url: draft.hero_image_url || mediaGallery[0]?.url || "" };
      const { data } = await emailBroadcastAPI.saveTemplate(payload);
      const saved = data?.data;
      if (saved) {
        setTemplates((current) => [...current.filter((item) => item.key !== saved.key), saved].sort((a,b) => a.name.localeCompare(b.name)));
        applyTemplate(saved);
      }
      toast.success(data?.message || "Reusable campaign template saved.");
    } catch (error) {
      toast.error(extractError(error, "Template could not be saved."));
    } finally {
      setSavingTemplate(false);
    }
  }, [draft, mediaGallery, applyTemplate]);

  const sendCampaign = useCallback(async () => {
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast.error("Add an email subject and message before sending.");
      return;
    }
    if (!channels.email && !channels.inApp) {
      toast.error("Select email, in-app notifications, or both.");
      return;
    }
    if (recipientMode === "selected" && selectedUserIds.length === 0) {
      toast.error("Select at least one recipient.");
      return;
    }
    if (recipientMode === "saved_list" && !savedAudienceId) {
      toast.error("Choose a saved audience list.");
      return;
    }
    setSending(true);
    try {
      const firstItem = selectedItems[0];
      const template = {
        ...draft,
        subject: draft.subject.trim(),
        headline: draft.headline.trim() || draft.subject.trim(),
        body: draft.body.trim(),
        hero_image_url: draft.hero_image_url || mediaGallery[0]?.url || "",
        cta_url: draft.cta_url || firstItem?.contentUrl || "https://www.altuverasafaris.com/destinations",
      };
      const { data } = await emailBroadcastAPI.sendContentCampaign({
        ...audiencePayload,
        templateKey: draft.key.trim(),
        template,
        context: draft.context,
        contentItems: selectedItems.map((item) => ({ id: item.id, type: item.type })),
        mediaGallery,
        contextData: { contentUrl: firstItem?.contentUrl || template.cta_url },
        notificationTitle: notificationTitle.trim() || template.headline,
        notificationMessage: notificationMessage.trim() || template.body,
        notificationActionLabel: template.cta_label,
        priority: "normal",
      });
      setLastSent({
        subject: draft.subject,
        sent: data?.sent ?? 0,
        failed: data?.failed ?? 0,
        total: data?.total ?? 0,
        inAppSent: data?.inAppSent ?? 0,
        inAppFailed: data?.inAppFailed ?? 0,
        recipientMode: data?.recipientMode || recipientMode,
        skippedForEmailConsent: data?.skippedForEmailConsent ?? 0,
        createdAt: new Date().toISOString(),
      });
      toast.success(data?.message || "Campaign sent.");
      const historyRes = await emailBroadcastAPI.getHistory().catch(() => null);
      if (historyRes?.data?.data) setHistory(historyRes.data.data);
    } catch (error) {
      toast.error(extractError(error, "Campaign could not be sent."));
    } finally {
      setSending(false);
    }
  }, [draft, channels, recipientMode, selectedUserIds, savedAudienceId, selectedItems, mediaGallery, audiencePayload, notificationTitle, notificationMessage, toast]);

  const removeMedia = useCallback((url) => {
    setMediaGallery((current) => current.filter((image) => image.url !== url));
  }, []);

  const isMediaSelected = (url) => mediaGallery.some((image) => image.url === url);
  const mediaOptions = useMemo(() => {
    const imported = selectedItems.flatMap((item) => (item.images || []).map((image) => ({
      ...image, title: image.title || item.title, caption: image.caption || item.description, contentUrl: item.contentUrl,
    })));
    const gallery = libraryType === "gallery" ? libraryItems.flatMap((item) => (item.images || []).map((image) => ({
      ...image, title: item.title, caption: image.caption || item.description, contentUrl: item.contentUrl,
    }))) : [];
    return [...imported, ...gallery].filter((image,index,all) => image.url && all.findIndex((other) => other.url === image.url) === index);
  }, [selectedItems, libraryType, libraryItems]);

  const contentPreview = selectedItems.length
    ? selectedItems.map((item) => ({ ...item, displayTitle: item.title }))
    : [];
  const sampleBody = draft.body
    .replace(/\{\{\s*firstName\s*\}\}/g, "Alex")
    .replace(/\{\{\s*destinationName\s*\}\}/g, selectedItems.find((item) => item.type === "destination")?.title || "Volcanoes National Park")
    .replace(/\{\{\s*countryName\s*\}\}/g, selectedItems.find((item) => item.type === "country")?.title || "Rwanda")
    .replace(/\{\{\s*packageName\s*\}\}/g, selectedItems.find((item) => item.type === "package")?.title || "Rwanda Gorilla Trekking")
    .replace(/\{\{\s*postTitle\s*\}\}/g, selectedItems.find((item) => item.type === "post")?.title || "A guide to Rwanda");

  const inputClass = "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-[.08em] text-slate-500";

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-700 px-4 py-5 text-white sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-100">
                <Sparkles size={13} /> Altuvera campaign studio
              </div>
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Share the next story worth travelling for.</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-100/85 sm:text-sm">Combine live Altuvera content, curated images, email and in-app updates in one campaign.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-emerald-50">
              <ShieldCheck size={16} /> Booking & account emails stay separate
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <div className="min-w-0 space-y-5">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Layers3 size={17} className="text-emerald-700" /> 1. Import Altuvera content</h3>
                  <p className="mt-1 text-xs text-slate-500">Choose real records from the website database or write a manual announcement below.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{selectedItems.length}/12 selected</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[145px_minmax(0,1fr)]">
                <select value={libraryType} onChange={(event) => setLibraryType(event.target.value)} className={inputClass}>
                  <option value="destination">Destinations</option>
                  <option value="country">Countries</option>
                  <option value="package">Packages</option>
                  <option value="post">Travel posts</option>
                  <option value="gallery">Gallery images</option>
                </select>
                <div className="relative min-w-0">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search records by name, title or description…" className={inputClass + " pl-9"} />
                </div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                {libraryLoading ? <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading Altuvera library…</div> :
                  libraryError ? <p className="px-3 py-7 text-center text-xs text-rose-600">{libraryError}</p> :
                  !libraryItems.length ? <p className="px-3 py-7 text-center text-xs text-slate-500">No matching records were found.</p> :
                  libraryItems.map((item) => {
                    const chosen = selectedItems.some((entry) => entry.type === item.type && String(entry.id) === String(item.id));
                    const image = item.images?.[0]?.url;
                    return (
                      <div key={item.type + ":" + item.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
                        {image ? <img src={image} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" /> :
                          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ImageIcon size={18} /></div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{item.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{item.description || item.type}</p>
                          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{item.status || item.type}</span>
                        </div>
                        {libraryType === "gallery" ? (
                          <button type="button" onClick={() => addLibraryItem(item)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-800"><ImageIcon size={13} /> Add image</button>
                        ) : (
                          <button type="button" onClick={() => chosen ? removeContentItem(item) : addLibraryItem(item)} className={"inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold " + (chosen ? "bg-slate-100 text-slate-600" : "bg-emerald-700 text-white")}>
                            {chosen ? <Check size={13} /> : <Plus size={13} />}{chosen ? "Added" : "Import"}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((item) => (
                    <span key={item.type + ":" + item.id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-emerald-900">
                      <span className="max-w-[190px] truncate">{item.title}</span>
                      <button type="button" onClick={() => removeContentItem(item)} aria-label={"Remove " + item.title} className="rounded-full p-1 hover:bg-emerald-100"><X size={13} /></button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ImageIcon size={17} className="text-emerald-700" /> 2. Curate campaign images</h3>
                  <p className="mt-1 text-xs text-slate-500">Pick up to 10 images from the imported items, browse the gallery, or upload new files.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">{mediaGallery.length}/10 selected</span>
              </div>
              {mediaOptions.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mediaOptions.map((image) => {
                    const picked = isMediaSelected(image.url);
                    return (
                      <button key={image.url} type="button" onClick={() => toggleMedia(image)} className={"group overflow-hidden rounded-xl border text-left " + (picked ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200")}>
                        <div className="relative">
                          <img src={image.url} alt={image.alt || image.title || "Altuvera image"} loading="lazy" className="h-24 w-full object-cover" />
                          <span className={"absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow " + (picked ? "bg-emerald-700 text-white" : "bg-white/95 text-slate-400")}>{picked ? <Check size={14} /> : <Plus size={14} />}</span>
                        </div>
                        <p className="truncate px-2 py-1.5 text-[10px] font-semibold text-slate-600">{image.title || image.caption || "Image"}</p>
                      </button>
                    );
                  })}
                </div>
              ) : <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">Import a destination or choose “Gallery images” above to browse available assets.</div>}
              {mediaGallery.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaGallery.map((image) => (
                    <div key={image.url} className="relative w-24 shrink-0 overflow-hidden rounded-lg border border-emerald-200 bg-white">
                      <img src={image.url} alt={image.alt || ""} className="h-16 w-full object-cover" />
                      <button type="button" onClick={() => removeMedia(image.url)} className="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-slate-700 shadow" aria-label="Remove image"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select value={uploadTarget} onChange={(event) => setUploadTarget(event.target.value)} className={inputClass}>
                    <option value="gallery">Upload to shared Altuvera gallery</option>
                    {selectedItems.filter((item) => ["destination","country","package","post"].includes(item.type)).map((item) => (
                      <option key={item.type + ":" + item.id} value={item.type + ":" + item.id}>Attach to {item.type}: {item.title}</option>
                    ))}
                  </select>
                  <label className={"inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 " + (uploading ? "pointer-events-none opacity-60" : "")}>
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                    {uploading ? "Uploading…" : "Upload images"}
                    <input type="file" accept="image/*" multiple disabled={uploading} onChange={uploadImages} className="sr-only" />
                  </label>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">Images uploaded to a content item are saved into that item’s existing media collection as well as available to this campaign. Gallery uploads are saved to the shared Altuvera gallery.</p>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Mail size={17} className="text-emerald-700" /> 3. Compose the update</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="min-w-0"><span className={labelClass}>Saved design</span>
                  <select value={draft.key} onChange={(event) => applyTemplate(templates.find((item) => item.key === event.target.value))} className={inputClass}>
                    {templates.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
                    {!templates.length && <option value={draft.key}>{draft.name}</option>}
                  </select>
                </label>
                <label className="min-w-0"><span className={labelClass}>Campaign category</span>
                  <select value={draft.context} onChange={(event) => patchDraft("context", event.target.value)} className={inputClass}>
                    <option value="new_destination">New destination</option><option value="new_country">Country update</option><option value="new_package">New package</option><option value="new_post">New travel story</option><option value="general">General travel update</option>
                  </select>
                </label>
              </div>
              <label className="block"><span className={labelClass}>Template name</span><input value={draft.name} onChange={(event) => patchDraft("name", event.target.value)} maxLength={120} className={inputClass} /></label>
              <label className="block"><span className={labelClass}>Email subject</span><input value={draft.subject} onChange={(event) => patchDraft("subject", event.target.value)} maxLength={200} className={inputClass} placeholder="A new Altuvera update for you" /></label>
              <label className="block"><span className={labelClass}>Inbox preview text</span><input value={draft.preheader} onChange={(event) => patchDraft("preheader", event.target.value)} maxLength={240} className={inputClass} placeholder="A short message shown before the email is opened" /></label>
              <label className="block"><span className={labelClass}>Email headline</span><input value={draft.headline} onChange={(event) => patchDraft("headline", event.target.value)} maxLength={180} className={inputClass} placeholder="A fresh story from East Africa" /></label>
              <label className="block"><span className={labelClass}>Message</span><textarea value={draft.body} onChange={(event) => patchDraft("body", event.target.value)} rows={5} maxLength={10000} className={inputClass + " min-h-[135px] resize-y"} placeholder="Write your update. Imported items and selected images are displayed below the message." /></label>
              <p className="-mt-1 text-[10px] leading-4 text-slate-500">Personalisation tokens: {"{{firstName}}"}, {"{{destinationName}}"}, {"{{countryName}}"}, {"{{packageName}}"}, {"{{postTitle}}"}.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block"><span className={labelClass}>Button label</span><input value={draft.cta_label} onChange={(event) => patchDraft("cta_label", event.target.value)} className={inputClass} /></label>
                <label className="block"><span className={labelClass}>Button destination URL</span><input value={draft.cta_url} onChange={(event) => patchDraft("cta_url", event.target.value)} className={inputClass} placeholder={selectedItems[0]?.contentUrl || "https://www.altuverasafaris.com"} /></label>
              </div>
              <details className="rounded-xl border border-slate-200 p-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700">In-app notification copy and design options</summary>
                <div className="mt-3 space-y-3">
                  <label className="block"><span className={labelClass}>Notification title (optional)</span><input value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} className={inputClass} placeholder={draft.headline || draft.subject} /></label>
                  <label className="block"><span className={labelClass}>Notification message (optional)</span><textarea value={notificationMessage} onChange={(event) => setNotificationMessage(event.target.value)} rows={3} className={inputClass} placeholder="Leave blank to reuse your email message." /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label><span className={labelClass}>Accent</span><input type="color" value={draft.accent_color} onChange={(event) => patchDraft("accent_color", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1" /></label>
                    <label><span className={labelClass}>Email layout</span><select value={draft.layout} onChange={(event) => patchDraft("layout", event.target.value)} className={inputClass}><option value="adventure">Adventure</option><option value="editorial">Editorial</option><option value="minimal">Minimal</option></select></label>
                  </div>
                </div>
              </details>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><UsersRound size={17} className="text-emerald-700" /> 4. Choose who receives it</h3>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <p className="text-xs font-bold text-emerald-950">Remembered default audience</p>
                <p className="mt-1 text-[11px] leading-4 text-emerald-900/75">{defaultAudience === "saved_list" ? "A saved audience list is used automatically when you choose “Use default”." : "All opted-in email contacts and active registered users for in-app updates are used when you choose “Use default”."}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={savingDefault} onClick={() => makeDefaultAudience("all")} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 disabled:opacity-50">Make all opted-in contacts the default</button>
                  {audienceLists.map((list) => <button key={list.id} type="button" disabled={savingDefault} onClick={() => makeDefaultAudience("saved_list",list.id)} className={"rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-50 " + (defaultAudience === "saved_list" && String(defaultAudienceListId) === String(list.id) ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-800")}>Make “{list.name}” default</button>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["default","Use default"],["all","All users"],["saved_list","Saved list"],["selected","Select users"],
                ].map(([value,label]) => (
                  <button key={value} type="button" aria-pressed={recipientMode===value} onClick={() => setRecipientMode(value)} className={"rounded-xl border px-2 py-2.5 text-[11px] font-bold transition " + (recipientMode===value ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>{label}</button>
                ))}
              </div>
              {recipientMode === "saved_list" && (
                <div className="space-y-2">
                  <select value={savedAudienceId} onChange={(event) => setSavedAudienceId(event.target.value)} className={inputClass}>
                    <option value="">Choose a saved audience list…</option>
                    {audienceLists.map((list) => <option key={list.id} value={list.id}>{list.name} · {list.recipient_count} users</option>)}
                  </select>
                  {!audienceLists.length && <p className="text-[11px] text-slate-500">Create a list by selecting users below and saving it.</p>}
                </div>
              )}
              {recipientMode === "selected" && (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search users by name, email or nationality" className={inputClass + " pl-9"} /></div>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {recipientsLoading ? <p className="py-5 text-center text-xs text-slate-500">Loading users…</p> : recipients.map((user) => {
                      const selected = selectedUserIds.includes(Number(user.id));
                      return (
                        <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
                          <input type="checkbox" checked={selected} onChange={(event) => setSelectedUserIds((current) => event.target.checked ? [...new Set([...current,Number(user.id)])] : current.filter((id) => id!==Number(user.id)))} className="h-4 w-4 accent-emerald-700" />
                          {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">{String(user.name || user.email || "U").trim().slice(0,2).toUpperCase()}</span>}
                          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800">{user.name || "Altuvera traveller"}</span><span className="block truncate text-[10px] text-slate-500">{user.email}</span></span>
                          <span className={"shrink-0 rounded-full px-2 py-1 text-[9px] font-bold " + (user.email_opt_in ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500")}>{user.email_opt_in ? "Email opt-in" : "In-app only"}</span>
                        </label>
                      );
                    })}
                    {!recipientsLoading && !recipients.length && <p className="py-5 text-center text-xs text-slate-500">No matching accounts.</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="Name this audience for future campaigns" className={inputClass} />
                    <button type="button" disabled={savingList || !selectedUserIds.length || !newListName.trim()} onClick={saveAudience} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900 disabled:opacity-50">{savingList ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save list</button>
                  </div>
                  <p className="text-[10px] text-slate-500">{selectedUserIds.length} user(s) selected. Email is sent only to those who opted in; in-app notices can reach all selected active accounts.</p>
                </div>
              )}
              {recipientMode === "default" && defaultAudience === "saved_list" && (
                <select value={defaultAudienceListId} onChange={(event) => setDefaultAudienceListId(event.target.value)} className={inputClass}>
                  <option value="">Choose default saved list…</option>
                  {audienceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox" checked={channels.email} onChange={(event) => setChannels((current) => ({...current,email:event.target.checked}))} className="h-4 w-4 accent-emerald-700" />
                  <span><span className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Mail size={14} /> Email campaign</span><span className="mt-0.5 block text-[10px] text-slate-500">Marketing consent is respected.</span></span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <input type="checkbox" checked={channels.inApp} onChange={(event) => setChannels((current) => ({...current,inApp:event.target.checked}))} className="h-4 w-4 accent-emerald-700" />
                  <span><span className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Bell size={14} /> In-app notification</span><span className="mt-0.5 block text-[10px] text-slate-500">Active user accounts, even without email opt-in.</span></span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Email recipients</p><p className="mt-1 text-lg font-extrabold text-slate-900">{countLoading ? "…" : recipientCounts.emailCount == null ? "—" : recipientCounts.emailCount}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">In-app recipients</p><p className="mt-1 text-lg font-extrabold text-slate-900">{countLoading ? "…" : recipientCounts.inAppCount == null ? "—" : recipientCounts.inAppCount}</p></div>
              </div>
            </section>

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button type="button" onClick={saveTemplate} disabled={savingTemplate || sending} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{savingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save reusable template</button>
              <button type="button" onClick={sendCampaign} disabled={sending || savingTemplate || !draft.subject.trim() || !draft.body.trim() || (!channels.email && !channels.inApp)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {sending ? "Sending campaign…" : "Send campaign"}</button>
            </div>
            <p className="text-[10px] leading-4 text-slate-500">Email delivery uses marketing consent; essential booking and account-security emails are unaffected by these campaign preferences.</p>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
                <div><h3 className="text-sm font-extrabold text-slate-900">Live email preview</h3><p className="text-[10px] text-slate-500">Sample recipient · responsive layout</p></div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Eye size={13} /> Preview</span>
              </div>
              <div className="p-2 sm:p-4" style={{background:draft.background_color}}>
                <div className="mx-auto max-w-[600px] overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-3 text-white" style={{background:draft.accent_color}}>
                    <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-white p-1"><img src="https://www.altuverasafaris.com/altuvera.png" alt="Altuvera logo" className="max-h-full max-w-full object-contain" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">Altuvera Safaris</p><p className="truncate text-[8px] font-bold uppercase tracking-[.1em] text-emerald-100">True adventure in high places &amp; deep culture</p></div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-emerald-100 text-[10px] font-extrabold text-emerald-900">AL</div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[.13em] text-emerald-800">✦ A fresh update from Altuvera ✦</div>
                    <h3 className="text-lg font-extrabold leading-tight text-emerald-950 sm:text-xl">{(draft.headline || draft.subject).replace(/\{\{\s*firstName\s*\}\}/g,"Alex")}</h3>
                    <p className="mt-2 text-[10px] text-slate-500">Hello Alex,</p>
                    <div className="mt-3 space-y-2">{sampleBody.split(/\n{2,}/).map((part,index)=><p key={index} className="whitespace-pre-line text-xs leading-6 text-slate-700">{part}</p>)}</div>
                    {contentPreview.length>0 && <div className="mt-4 space-y-2">{contentPreview.map((item)=><div key={item.type+":"+item.id} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-[8px] font-bold uppercase tracking-wider text-emerald-700">{item.type}</p><p className="mt-1 text-xs font-extrabold text-emerald-950">{item.title}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.description}</p></div>)}</div>}
                    {mediaGallery.length>0 && <div className="mt-4"><p className="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">A closer look · swipe images</p><div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">{mediaGallery.map((image)=><div key={image.url} className="w-36 shrink-0 snap-start overflow-hidden rounded-lg border border-emerald-100"><img src={image.url} alt={image.alt || ""} className="h-24 w-full object-cover" /><p className="truncate px-2 py-1 text-[9px] text-slate-500">{image.caption || image.title || "Altuvera Safaris"}</p></div>)}</div></div>}
                    <div className="mt-4 text-center"><span className="inline-flex rounded-full px-5 py-2.5 text-[10px] font-extrabold text-white" style={{background:draft.accent_color}}>{draft.cta_label || "Explore update"} →</span></div>
                    <p className="mt-4 border-t border-slate-100 pt-3 text-center text-[9px] text-slate-400">You are receiving travel updates because you opted in.</p>
                  </div>
                </div>
              </div>
            </div>

            {lastSent && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-900"><CheckCircle2 size={17} /><p className="text-sm font-extrabold">Campaign report</p></div>
              <p className="mt-2 break-words text-xs font-bold text-slate-800">{lastSent.subject}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="rounded-lg bg-white p-2"><b>{lastSent.sent}</b><span className="block text-[10px] text-slate-500">Emails sent</span></p><p className="rounded-lg bg-white p-2"><b>{lastSent.failed}</b><span className="block text-[10px] text-slate-500">Email failures</span></p><p className="rounded-lg bg-white p-2"><b>{lastSent.inAppSent}</b><span className="block text-[10px] text-slate-500">In-app created</span></p><p className="rounded-lg bg-white p-2"><b>{lastSent.inAppFailed}</b><span className="block text-[10px] text-slate-500">In-app failures</span></p></div>
              {lastSent.skippedForEmailConsent>0 && <p className="mt-2 text-[10px] text-slate-600">{lastSent.skippedForEmailConsent} selected account(s) did not have marketing email consent.</p>}
            </div>}

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><CalendarClock size={15} /> Recent campaigns</h3><button type="button" onClick={() => emailBroadcastAPI.getHistory().then(({data})=>setHistory(data?.data || [])).catch((error)=>toast.error(extractError(error,"History unavailable.")))} className="text-[10px] font-bold text-emerald-700">Refresh</button></div>
              {!history.length ? <p className="text-xs text-slate-500">No campaigns sent yet.</p> : <div className="space-y-2">{history.slice(0,6).map((row)=><div key={row.id} className="rounded-lg bg-slate-50 p-2.5"><p className="line-clamp-2 text-xs font-bold text-slate-800">{row.subject}</p><div className="mt-1 flex flex-wrap gap-2 text-[9px] text-slate-500"><span>{row.audience}</span><span>·</span><span>{row.sent_count} sent</span><span>·</span><span>{row.failed_count} failed</span></div></div>)}</div>}
            </div>
          </aside>
        </div>
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