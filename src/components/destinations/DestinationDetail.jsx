// admin/src/components/destinations/DestinationDetail.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, MapPin, Star, Eye, Heart, Share2, Clock, Users, Mountain,
  Globe, Flag, ChevronRight, Image, List, HelpCircle, MessageSquare,
  Info, Tag, Link, Edit, Trash2, RefreshCw, Calendar, Thermometer,
  Shield, Package, Navigation, AlertCircle, CheckCircle, ExternalLink,
  BarChart2, Award, Zap, Plus, TrendingUp, Camera, Map, Compass,
  Sun, Target, Feather, BookOpen, ArrowRight, ChevronLeft, ChevronDown,
  Activity, Wind, Droplets, Wifi, Plug, DollarSign, FileText
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'https://backend-jd8f.onrender.com/api'
const getToken = () => localStorage.getItem('token') || ''

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`)
  return data
}

/* ═══════════════════════════════════════════════════════════
   CSS INJECTION — mirrors Explore page design system
═══════════════════════════════════════════════════════════ */
const DD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

:root {
  --dd-green:     #059669;
  --dd-green-lt:  #10b981;
  --dd-green-dk:  #047857;
  --dd-forest:    #022c22;
  --dd-mint:      #ecfdf5;
  --dd-gold:      #f59e0b;
  --dd-text:      #0f172a;
  --dd-text-2:    #475569;
  --dd-text-3:    #94a3b8;
  --dd-border:    #e2e8f0;
  --dd-surface:   #ffffff;
  --dd-bg:        #f8fafb;
  --dd-radius:    18px;
  --dd-ease:      cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes dd-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dd-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes dd-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes dd-spin {
  to { transform: rotate(360deg); }
}
@keyframes dd-pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.5; }
}
@keyframes dd-slide-in {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes dd-gradient-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ── Drawer Shell ── */
.dd-drawer {
  position: fixed; inset: 0;
  background: rgba(2,44,34,0.55);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex; align-items: flex-start; justify-content: flex-end;
  animation: dd-fade-up 0.25s var(--dd-ease);
}
.dd-panel {
  height: 100%; width: 100%; max-width: 960px;
  background: var(--dd-bg);
  display: flex; flex-direction: column;
  box-shadow: -8px 0 48px rgba(2,44,34,0.18);
  animation: dd-slide-in 0.35s var(--dd-ease);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Header ── */
.dd-header {
  background: linear-gradient(135deg, #022c22 0%, #064e3b 55%, #022c22 100%);
  background-size: 200% 200%;
  animation: dd-gradient-shift 14s ease infinite;
  padding: 0;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.dd-header::before {
  content: '';
  position: absolute;
  top: -60px; right: -40px;
  width: 260px; height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
  pointer-events: none;
}
.dd-header::after {
  content: '';
  position: absolute;
  bottom: -40px; left: 30%;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.dd-header__inner {
  position: relative; z-index: 1;
  padding: 20px 28px 0;
}
.dd-header__top {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
}
.dd-header__identity {
  display: flex; align-items: center; gap: 14px; min-width: 0;
}
.dd-header__icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: rgba(16,185,129,0.2);
  border: 1.5px solid rgba(16,185,129,0.35);
  display: flex; align-items: center; justify-content: center;
  color: #a7f3d0; flex-shrink: 0;
}
.dd-header__name {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(18px, 2.5vw, 26px);
  font-weight: 400; color: #fff;
  line-height: 1.2; margin: 0;
  letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dd-header__sub {
  font-size: 13px; color: rgba(255,255,255,0.6);
  display: flex; align-items: center; gap: 5px;
  margin-top: 3px;
}
.dd-header__actions {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.dd-header__btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 11px; border: none;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.3s var(--dd-ease);
  text-decoration: none;
}
.dd-header__btn--edit {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 16px rgba(16,185,129,0.4);
}
.dd-header__btn--edit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16,185,129,0.55);
}
.dd-header__btn--icon {
  width: 38px; height: 38px; padding: 0;
  border-radius: 10px; justify-content: center;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.8);
}
.dd-header__btn--icon:hover {
  background: rgba(255,255,255,0.2);
  color: #fff;
}
.dd-header__btn--close:hover {
  background: rgba(239,68,68,0.25);
  border-color: rgba(239,68,68,0.4);
  color: #fca5a5;
}

/* ── Stats Bar ── */
.dd-stats-bar {
  display: flex; gap: 0;
  padding: 18px 28px 0;
  position: relative; z-index: 1;
}
.dd-stat-item {
  flex: 1; text-align: center;
  padding: 10px 8px;
  border-right: 1px solid rgba(255,255,255,0.08);
}
.dd-stat-item:last-child { border-right: none; }
.dd-stat-value {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 20px; font-weight: 400;
  color: #fff; line-height: 1;
}
.dd-stat-label {
  font-size: 10px; font-weight: 600;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.07em; text-transform: uppercase;
  margin-top: 4px;
}

/* ── Badges Row ── */
.dd-badges-row {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 16px 28px 0;
  position: relative; z-index: 1;
}
.dd-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 999px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid;
}
.dd-badge--green  { background: rgba(16,185,129,0.15); color: #a7f3d0; border-color: rgba(16,185,129,0.3); }
.dd-badge--yellow { background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.3); }
.dd-badge--gray   { background: rgba(255,255,255,0.1);  color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.15); }
.dd-badge--purple { background: rgba(139,92,246,0.15); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }
.dd-badge--blue   { background: rgba(59,130,246,0.15); color: #93c5fd; border-color: rgba(59,130,246,0.3); }

/* ── Tabs ── */
.dd-tabs {
  display: flex; gap: 4px;
  padding: 16px 28px;
  overflow-x: auto;
  position: relative; z-index: 1;
  scrollbar-width: none;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.dd-tabs::-webkit-scrollbar { display: none; }
.dd-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.25s var(--dd-ease);
  letter-spacing: 0.01em;
}
.dd-tab--active {
  background: rgba(16,185,129,0.2);
  border-color: rgba(16,185,129,0.4);
  color: #a7f3d0;
}
.dd-tab--inactive {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
}
.dd-tab--inactive:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
}
.dd-tab__count {
  padding: 2px 7px; border-radius: 999px;
  font-size: 10px; font-weight: 700;
}
.dd-tab--active .dd-tab__count {
  background: rgba(16,185,129,0.3); color: #a7f3d0;
}
.dd-tab--inactive .dd-tab__count {
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
}

/* ── Content Scroll Area ── */
.dd-content {
  flex: 1; overflow-y: auto;
  padding: 28px;
  scrollbar-width: thin;
  scrollbar-color: #a7f3d0 transparent;
}
.dd-content::-webkit-scrollbar { width: 4px; }
.dd-content::-webkit-scrollbar-track { background: transparent; }
.dd-content::-webkit-scrollbar-thumb { background: #a7f3d0; border-radius: 2px; }

/* ── Section Label (matches Explore) ── */
.dd-section-label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 999px;
  background: var(--dd-mint); color: var(--dd-green-dk);
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid #a7f3d0;
  margin-bottom: 12px;
}

/* ── Hero Card ── */
.dd-hero {
  position: relative; border-radius: var(--dd-radius);
  overflow: hidden; height: 260px;
  background: var(--dd-forest);
  margin-bottom: 24px;
  animation: dd-scale-in 0.4s var(--dd-ease);
}
.dd-hero__img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 8s ease;
}
.dd-hero:hover .dd-hero__img { transform: scale(1.04); }
.dd-hero__overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    160deg,
    rgba(2,44,34,0.2) 0%,
    rgba(2,44,34,0.08) 40%,
    rgba(2,44,34,0.75) 100%
  );
}
.dd-hero__no-img {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #022c22, #064e3b);
}
.dd-hero__tagline {
  position: absolute; bottom: 20px; left: 24px; right: 24px;
  color: #fff;
}
.dd-hero__tagline-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(18px, 3vw, 28px);
  font-weight: 400; margin: 0 0 6px;
  letter-spacing: -0.02em;
}
.dd-hero__tagline-sub {
  font-size: 13px; color: rgba(255,255,255,0.75);
  font-style: italic;
}

/* ── Info Grid ── */
.dd-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 640px) { .dd-grid-2 { grid-template-columns: 1fr; } }

/* ── Cards ── */
.dd-card {
  background: var(--dd-surface);
  border-radius: var(--dd-radius);
  border: 1.5px solid var(--dd-border);
  padding: 22px;
  transition: all 0.3s var(--dd-ease);
  animation: dd-fade-up 0.35s var(--dd-ease) both;
}
.dd-card:hover {
  border-color: rgba(5,150,105,0.2);
  box-shadow: 0 8px 32px rgba(5,150,105,0.07);
  transform: translateY(-2px);
}
.dd-card--forest {
  background: linear-gradient(135deg, #022c22, #064e3b);
  border-color: rgba(16,185,129,0.2);
  color: #fff;
}
.dd-card__head {
  display: flex; align-items: center; gap: 9px;
  margin-bottom: 16px;
}
.dd-card__head-icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: var(--dd-mint);
  border: 1px solid #a7f3d0;
  display: flex; align-items: center; justify-content: center;
  color: var(--dd-green-dk); flex-shrink: 0;
}
.dd-card__head--light .dd-card__head-icon {
  background: rgba(16,185,129,0.15);
  border-color: rgba(16,185,129,0.3);
  color: #a7f3d0;
}
.dd-card__title {
  font-weight: 700; font-size: 14px;
  color: var(--dd-text); margin: 0;
}
.dd-card--forest .dd-card__title { color: #a7f3d0; }

/* ── Data Rows ── */
.dd-data-row {
  display: flex; justify-content: space-between;
  align-items: baseline; gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dd-border);
  font-size: 13px;
}
.dd-data-row:last-child { border-bottom: none; padding-bottom: 0; }
.dd-data-row__label { color: var(--dd-text-3); flex-shrink: 0; }
.dd-data-row__value {
  font-weight: 600; color: var(--dd-text);
  text-align: right; word-break: break-word;
}
.dd-card--forest .dd-data-row { border-color: rgba(255,255,255,0.07); }
.dd-card--forest .dd-data-row__label { color: rgba(255,255,255,0.45); }
.dd-card--forest .dd-data-row__value { color: rgba(255,255,255,0.9); }

/* ── Description Block ── */
.dd-desc {
  background: var(--dd-surface);
  border-radius: var(--dd-radius);
  border: 1.5px solid var(--dd-border);
  padding: 22px;
  margin-bottom: 20px;
  animation: dd-fade-up 0.4s var(--dd-ease) both;
}
.dd-desc__short {
  font-size: 15px; font-weight: 600;
  color: var(--dd-green-dk);
  line-height: 1.6; margin: 0 0 12px;
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic;
}
.dd-desc__full {
  font-size: 14px; color: var(--dd-text-2);
  line-height: 1.85; margin: 0;
  white-space: pre-wrap;
}

/* ── Highlight & Activity Lists ── */
.dd-highlights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
@media (max-width: 540px) { .dd-highlights-grid { grid-template-columns: 1fr; } }
.dd-highlight-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px;
  background: var(--dd-mint);
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  font-size: 13px; color: var(--dd-green-dk);
  font-weight: 500;
}
.dd-activity-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05));
  border: 1px solid rgba(16,185,129,0.2);
  font-size: 12px; font-weight: 600;
  color: var(--dd-green-dk);
  transition: all 0.25s ease;
}
.dd-activity-chip:hover {
  background: var(--dd-green);
  color: #fff;
  border-color: var(--dd-green);
  transform: translateY(-1px);
}

/* ── Gallery Grid ── */
.dd-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.dd-gallery-item {
  position: relative; border-radius: 14px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: var(--dd-forest);
  border: 2px solid transparent;
  transition: all 0.3s var(--dd-ease);
  cursor: pointer;
}
.dd-gallery-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(2,44,34,0.15);
}
.dd-gallery-item--primary {
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(16,185,129,0.3);
}
.dd-gallery-item__img {
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}
.dd-gallery-item:hover .dd-gallery-item__img { transform: scale(1.06); }
.dd-gallery-item__overlay {
  position: absolute; inset: 0;
  background: rgba(2,44,34,0.7);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.dd-gallery-item:hover .dd-gallery-item__overlay { opacity: 1; }
.dd-gallery-item__primary-badge {
  position: absolute; top: 8px; left: 8px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-size: 10px; font-weight: 700;
  padding: 3px 10px; border-radius: 999px;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.dd-gallery-item__caption {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(2,44,34,0.9));
  color: rgba(255,255,255,0.85);
  font-size: 11px; padding: 14px 10px 8px;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}
.dd-gallery-item:hover .dd-gallery-item__caption { transform: translateY(0); }

/* ── Gallery Action Btn ── */
.dd-gallery-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 10px; border: none;
  font-family: inherit; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.25s ease;
}
.dd-gallery-btn--primary {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
}
.dd-gallery-btn--danger {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
}
.dd-gallery-btn--danger:hover {
  background: #ef4444; color: #fff;
}

/* ── Itinerary ── */
.dd-itin-item {
  position: relative;
  animation: dd-fade-up 0.35s var(--dd-ease) both;
}
.dd-itin-item::before {
  content: '';
  position: absolute;
  left: 20px; top: 56px; bottom: -20px;
  width: 2px;
  background: linear-gradient(to bottom, #10b981, transparent);
}
.dd-itin-item:last-child::before { display: none; }
.dd-itin-card {
  background: var(--dd-surface);
  border-radius: var(--dd-radius);
  border: 1.5px solid var(--dd-border);
  overflow: hidden;
  margin-bottom: 20px;
  transition: all 0.3s var(--dd-ease);
}
.dd-itin-card:hover {
  border-color: rgba(5,150,105,0.25);
  box-shadow: 0 8px 32px rgba(5,150,105,0.08);
}
.dd-itin-head {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(236,253,245,0.8), rgba(209,250,229,0.4));
  border-bottom: 1px solid #d1fae5;
}
.dd-itin-day {
  width: 42px; height: 42px; border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-weight: 800; font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
  font-family: 'DM Serif Display', Georgia, serif;
}
.dd-itin-head__title {
  font-weight: 700; font-size: 15px;
  color: var(--dd-text); margin: 0 0 2px;
}
.dd-itin-head__meta {
  font-size: 12px; color: var(--dd-text-3);
  display: flex; align-items: center; gap: 8px;
}
.dd-itin-body { padding: 16px 20px; }
.dd-itin-body p {
  font-size: 13px; color: var(--dd-text-2);
  line-height: 1.75; margin: 0 0 14px;
}
.dd-itin-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.dd-itin-meta-block {
  background: var(--dd-bg);
  border-radius: 10px; padding: 10px 12px;
}
.dd-itin-meta-label {
  font-size: 10px; font-weight: 700;
  color: var(--dd-text-3);
  text-transform: uppercase; letter-spacing: 0.07em;
  margin-bottom: 6px;
}
.dd-chip-small {
  display: inline-block;
  padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 600;
  margin: 2px;
}
.dd-chip-green  { background: #d1fae5; color: #065f46; }
.dd-chip-orange { background: #fef3c7; color: #92400e; }

/* ── FAQs ── */
.dd-faq-item {
  background: var(--dd-surface);
  border: 1.5px solid var(--dd-border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 10px;
  transition: all 0.3s var(--dd-ease);
  animation: dd-fade-up 0.35s var(--dd-ease) both;
}
.dd-faq-item:hover {
  border-color: rgba(5,150,105,0.2);
  box-shadow: 0 4px 16px rgba(5,150,105,0.06);
}
.dd-faq-item--open { border-color: rgba(16,185,129,0.35); }
.dd-faq-btn {
  width: 100%; display: flex;
  align-items: center; justify-content: space-between;
  padding: 16px 18px; gap: 12px;
  background: none; border: none;
  cursor: pointer; font-family: inherit;
  text-align: left;
}
.dd-faq-question {
  font-size: 14px; font-weight: 600;
  color: var(--dd-text); flex: 1;
}
.dd-faq-icon {
  width: 28px; height: 28px; border-radius: 8px;
  background: var(--dd-mint); border: 1px solid #a7f3d0;
  display: flex; align-items: center; justify-content: center;
  color: var(--dd-green); flex-shrink: 0;
  transition: all 0.3s ease;
}
.dd-faq-icon--open {
  background: var(--dd-green); color: #fff;
  border-color: var(--dd-green);
  transform: rotate(180deg);
}
.dd-faq-answer {
  padding: 0 18px 16px;
  border-top: 1px solid #f1f5f9;
}
.dd-faq-answer p {
  font-size: 13px; color: var(--dd-text-2);
  line-height: 1.8; margin: 12px 0 0;
}
.dd-faq-helpful {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 10px; padding: 4px 12px; border-radius: 999px;
  background: var(--dd-mint); border: 1px solid #a7f3d0;
  font-size: 11px; color: var(--dd-green-dk); font-weight: 600;
}

/* ── Reviews ── */
.dd-review-aggregate {
  background: linear-gradient(135deg, #022c22, #064e3b);
  border-radius: var(--dd-radius);
  padding: 24px;
  margin-bottom: 20px;
  display: flex; gap: 28px; align-items: center;
  animation: dd-scale-in 0.4s var(--dd-ease);
}
.dd-review-score {
  text-align: center; flex-shrink: 0;
}
.dd-review-score__num {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 52px; font-weight: 400;
  color: #fff; line-height: 1;
}
.dd-review-score__stars {
  display: flex; gap: 3px; justify-content: center;
  margin: 6px 0 4px;
}
.dd-review-score__count {
  font-size: 12px; color: rgba(255,255,255,0.5);
}
.dd-review-bars { flex: 1; }
.dd-review-bar-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 6px;
}
.dd-review-bar-row:last-child { margin-bottom: 0; }
.dd-review-bar-label {
  font-size: 11px; color: rgba(255,255,255,0.5);
  width: 20px; flex-shrink: 0; text-align: right;
}
.dd-review-bar-track {
  flex: 1; height: 5px; border-radius: 999px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
}
.dd-review-bar-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.8s var(--dd-ease);
}
.dd-review-bar-count {
  font-size: 11px; color: rgba(255,255,255,0.4);
  width: 20px; flex-shrink: 0;
}

.dd-review-card {
  background: var(--dd-surface);
  border: 1.5px solid var(--dd-border);
  border-radius: var(--dd-radius);
  padding: 20px;
  margin-bottom: 14px;
  transition: all 0.3s var(--dd-ease);
  animation: dd-fade-up 0.35s var(--dd-ease) both;
}
.dd-review-card:hover {
  border-color: rgba(5,150,105,0.2);
  box-shadow: 0 8px 24px rgba(5,150,105,0.06);
  transform: translateY(-2px);
}
.dd-review-card__top {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 12px;
  margin-bottom: 14px;
}
.dd-review-card__author {
  display: flex; align-items: center; gap: 10px;
}
.dd-review-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  overflow: hidden; border: 2px solid #a7f3d0;
  flex-shrink: 0;
}
.dd-review-avatar img { width: 100%; height: 100%; object-fit: cover; }
.dd-review-avatar__fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: var(--dd-green-dk); font-weight: 800; font-size: 15px;
  font-family: 'DM Serif Display', Georgia, serif;
}
.dd-review-name { font-weight: 700; font-size: 14px; color: var(--dd-text); }
.dd-review-country { font-size: 12px; color: var(--dd-text-3); margin-top: 1px; }
.dd-review-stars { display: flex; gap: 2px; }
.dd-review-title {
  font-weight: 700; font-size: 14px;
  color: var(--dd-text); margin: 0 0 8px;
  font-family: 'DM Serif Display', Georgia, serif;
}
.dd-review-content {
  font-size: 13px; color: var(--dd-text-2);
  line-height: 1.78; margin: 0;
}
.dd-review-footer {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--dd-border);
}
.dd-review-meta-chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--dd-text-3);
}
.dd-review-verified {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700;
  color: var(--dd-green); background: var(--dd-mint);
  padding: 3px 10px; border-radius: 999px;
  border: 1px solid #a7f3d0;
}
.dd-review-featured {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700;
  color: #7c3aed; background: rgba(139,92,246,0.08);
  padding: 3px 10px; border-radius: 999px;
  border: 1px solid rgba(139,92,246,0.2);
}

/* ── Practical Info ── */
.dd-practical-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 640px) { .dd-practical-grid { grid-template-columns: 1fr; } }
.dd-practical-card {
  background: var(--dd-surface);
  border: 1.5px solid var(--dd-border);
  border-radius: var(--dd-radius);
  overflow: hidden;
  transition: all 0.3s var(--dd-ease);
  animation: dd-fade-up 0.35s var(--dd-ease) both;
}
.dd-practical-card:hover {
  border-color: rgba(5,150,105,0.2);
  box-shadow: 0 8px 24px rgba(5,150,105,0.06);
}
.dd-practical-head {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(236,253,245,0.8), rgba(209,250,229,0.3));
  border-bottom: 1px solid #d1fae5;
}
.dd-practical-head__icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--dd-mint); border: 1px solid #a7f3d0;
  display: flex; align-items: center; justify-content: center;
  color: var(--dd-green-dk);
}
.dd-practical-head__title {
  font-weight: 700; font-size: 13px;
  color: var(--dd-green-dk); margin: 0;
}
.dd-practical-body { padding: 14px 18px; }

/* ── Tags ── */
.dd-tag-form {
  display: flex; gap: 10px; margin-bottom: 20px;
}
.dd-tag-input {
  flex: 1;
  border: 1.5px solid var(--dd-border);
  border-radius: 12px; padding: 10px 14px;
  font-size: 13px; font-family: inherit;
  background: var(--dd-surface); color: var(--dd-text);
  outline: none;
  transition: border-color 0.25s ease;
}
.dd-tag-input:focus {
  border-color: var(--dd-green);
  box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
}
.dd-tag-submit {
  padding: 10px 20px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-weight: 700; font-size: 13px;
  cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 14px rgba(16,185,129,0.3);
  transition: all 0.25s ease;
}
.dd-tag-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16,185,129,0.45);
}
.dd-tag-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.dd-tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.dd-tag-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px 6px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05));
  border: 1px solid rgba(16,185,129,0.25);
  font-size: 12px; font-weight: 600;
  color: var(--dd-green-dk);
  transition: all 0.25s ease;
}
.dd-tag-pill:hover {
  border-color: rgba(5,150,105,0.4);
  box-shadow: 0 4px 12px rgba(5,150,105,0.1);
}
.dd-tag-pill__cat {
  font-size: 10px; color: var(--dd-green);
  opacity: 0.7;
}
.dd-tag-remove {
  width: 18px; height: 18px; border-radius: 50%;
  border: none; background: rgba(5,150,105,0.15);
  color: var(--dd-green); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease; padding: 0;
}
.dd-tag-remove:hover {
  background: #ef4444; color: #fff;
  transform: scale(1.1);
}

/* ── Empty States ── */
.dd-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 64px 32px; gap: 14px;
  text-align: center;
}
.dd-empty__icon {
  width: 72px; height: 72px; border-radius: 20px;
  background: linear-gradient(135deg, rgba(236,253,245,0.8), rgba(209,250,229,0.4));
  border: 1.5px solid #a7f3d0;
  display: flex; align-items: center; justify-content: center;
  color: var(--dd-green); margin-bottom: 4px;
}
.dd-empty__title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 18px; font-weight: 400;
  color: var(--dd-text); margin: 0;
}
.dd-empty__desc { font-size: 13px; color: var(--dd-text-3); margin: 0; }

/* ── Skeleton ── */
.dd-skeleton {
  border-radius: 10px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 40%, #f1f5f9 80%);
  background-size: 200%;
  animation: dd-shimmer 1.6s ease infinite;
}

/* ── Spinner ── */
.dd-spinner {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid rgba(16,185,129,0.15);
  border-top-color: #10b981;
  animation: dd-spin 0.75s linear infinite;
}

/* ── Error State ── */
.dd-error {
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
  padding: 64px 24px; text-align: center;
}
.dd-error__icon {
  width: 64px; height: 64px; border-radius: 18px;
  background: rgba(239,68,68,0.08);
  border: 1.5px solid rgba(239,68,68,0.2);
  display: flex; align-items: center; justify-content: center;
  color: #ef4444;
}
.dd-error__title { font-weight: 700; color: #ef4444; font-size: 15px; margin: 0; }
.dd-error__msg { font-size: 13px; color: var(--dd-text-3); margin: 0; }
.dd-retry-btn {
  padding: 10px 24px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-weight: 700; font-size: 13px;
  cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 14px rgba(16,185,129,0.3);
  transition: all 0.25s ease;
}
.dd-retry-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16,185,129,0.45); }

/* ── Scrollbar ── */
* { box-sizing: border-box; }
`;

function injectCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('dd-styles')) return;
  const s = document.createElement('style');
  s.id = 'dd-styles';
  s.textContent = DD_CSS;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════
   MICRO HELPERS
═══════════════════════════════════════════════════════════ */
const StarRating = ({ rating, size = 13 }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1,2,3,4,5].map(s => (
      <Star
        key={s} size={size}
        style={{
          fill: s <= Math.round(rating || 0) ? '#f59e0b' : 'transparent',
          color: s <= Math.round(rating || 0) ? '#f59e0b' : '#d1d5db',
        }}
      />
    ))}
  </div>
)

const StatusBadge = ({ status }) => {
  const map = {
    published: 'green', draft: 'yellow', archived: 'gray', inactive: 'gray'
  }
  return <span className={`dd-badge dd-badge--${map[status] || 'gray'}`}>{status}</span>
}

const DataRow = ({ label, value }) => {
  if (!value && value !== 0) return null
  return (
    <div className="dd-data-row">
      <span className="dd-data-row__label">{label}</span>
      <span className="dd-data-row__value capitalize">{String(value)}</span>
    </div>
  )
}

const PracticalItem = ({ label, value }) => {
  if (!value || (Array.isArray(value) && !value.length)) return null
  const display = Array.isArray(value) ? value.join(', ') : String(value)
  return (
    <div className="dd-data-row">
      <span className="dd-data-row__label">{label}</span>
      <span className="dd-data-row__value">{display}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: OVERVIEW
═══════════════════════════════════════════════════════════ */
const OverviewSection = ({ dest }) => (
  <div>
    {/* Hero */}
    <div className="dd-hero">
      {dest.heroImage || dest.imageUrl ? (
        <img src={dest.heroImage || dest.imageUrl} alt={dest.name} className="dd-hero__img" />
      ) : (
        <div className="dd-hero__no-img">
          <Mountain size={52} style={{ color: 'rgba(167,243,208,0.4)' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No hero image</span>
        </div>
      )}
      <div className="dd-hero__overlay" />
      <div className="dd-hero__tagline">
        {dest.tagline && <p className="dd-hero__tagline-sub">"{dest.tagline}"</p>}
        <h3 className="dd-hero__tagline-title">{dest.name}</h3>
      </div>
    </div>

    {/* Description */}
    {(dest.shortDescription || dest.description) && (
      <div className="dd-desc" style={{ marginBottom: 20 }}>
        <div className="dd-section-label">
          <BookOpen size={10} /> About
        </div>
        {dest.shortDescription && (
          <p className="dd-desc__short">{dest.shortDescription}</p>
        )}
        {dest.description && (
          <p className="dd-desc__full">{dest.description}</p>
        )}
      </div>
    )}

    {/* Info Grid */}
    <div className="dd-grid-2">
      {/* Basic Info */}
      <div className="dd-card">
        <div className="dd-card__head">
          <div className="dd-card__head-icon"><Info size={14} /></div>
          <h4 className="dd-card__title">Basic Info</h4>
        </div>
        <DataRow label="Category"    value={dest.category} />
        <DataRow label="Type"        value={dest.destinationType} />
        <DataRow label="Difficulty"  value={dest.difficulty} />
        <DataRow label="Duration"    value={dest.duration} />
        <DataRow label="Group Size"  value={dest.maxGroupSize ? `${dest.minGroupSize || 1}–${dest.maxGroupSize}` : null} />
        <DataRow label="Min Age"     value={dest.minAge ? `${dest.minAge}+` : null} />
        <DataRow label="Fitness"     value={dest.fitnessLevel} />
        <DataRow label="Eco"         value={dest.isEcoFriendly ? '✓ Eco-Friendly' : null} />
        <DataRow label="Family"      value={dest.isFamilyFriendly ? '✓ Family-Friendly' : null} />
      </div>

      {/* Location */}
      <div className="dd-card">
        <div className="dd-card__head">
          <div className="dd-card__head-icon"><MapPin size={14} /></div>
          <h4 className="dd-card__title">Location</h4>
        </div>
        <DataRow label="Country"    value={`${dest.country?.name || '—'} ${dest.country?.flag || ''}`} />
        <DataRow label="Region"     value={dest.region} />
        <DataRow label="Nearest City"  value={dest.nearestCity} />
        <DataRow label="Airport"    value={dest.nearestAirport} />
        <DataRow label="Distance"   value={dest.distanceFromAirportKm ? `${dest.distanceFromAirportKm} km from airport` : null} />
        <DataRow label="Altitude"   value={dest.altitudeMeters ? `${dest.altitudeMeters}m` : null} />
        <DataRow label="GPS"        value={dest.latitude ? `${dest.latitude}, ${dest.longitude}` : null} />
      </div>
    </div>

    {/* Highlights */}
    {dest.highlights?.length > 0 && (
      <div className="dd-card" style={{ marginBottom: 16 }}>
        <div className="dd-card__head">
          <div className="dd-card__head-icon"><Award size={14} /></div>
          <h4 className="dd-card__title">Highlights</h4>
        </div>
        <div className="dd-highlights-grid">
          {dest.highlights.map((h, i) => (
            <div key={i} className="dd-highlight-item">
              <CheckCircle size={13} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
              {h}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Activities */}
    {dest.activities?.length > 0 && (
      <div className="dd-card" style={{ marginBottom: 16 }}>
        <div className="dd-card__head">
          <div className="dd-card__head-icon"><Zap size={14} /></div>
          <h4 className="dd-card__title">Activities</h4>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dest.activities.map((a, i) => (
            <span key={i} className="dd-activity-chip">
              <Zap size={10} /> {a}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Engagement Stats */}
    <div className="dd-card dd-card--forest" style={{ marginBottom: 16 }}>
      <div className="dd-card__head dd-card__head--light">
        <div className="dd-card__head-icon"><BarChart2 size={14} /></div>
        <h4 className="dd-card__title">Engagement</h4>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {[
          { icon: Star,   label: 'Rating',    value: dest.rating ? `${dest.rating}/5` : '—' },
          { icon: Eye,    label: 'Views',     value: dest.viewCount?.toLocaleString() || '0' },
          { icon: Heart,  label: 'Wishlist',  value: dest.wishlistCount?.toLocaleString() || '0' },
          { icon: Share2, label: 'Shares',    value: dest.shareCount?.toLocaleString() || '0' },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="dd-stat-item">
            <div className="dd-stat-value">{value}</div>
            <div className="dd-stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* SEO */}
    {(dest.metaTitle || dest.metaDescription) && (
      <div className="dd-card">
        <div className="dd-card__head">
          <div className="dd-card__head-icon"><Globe size={14} /></div>
          <h4 className="dd-card__title">SEO Metadata</h4>
        </div>
        {dest.metaTitle && (
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--dd-text)', margin: '0 0 8px' }}>
            {dest.metaTitle}
          </p>
        )}
        {dest.metaDescription && (
          <p style={{ fontSize: 13, color: 'var(--dd-text-2)', lineHeight: 1.75, margin: 0 }}>
            {dest.metaDescription}
          </p>
        )}
      </div>
    )}
  </div>
)

/* ═══════════════════════════════════════════════════════════
   SECTION: GALLERY
═══════════════════════════════════════════════════════════ */
const GallerySection = ({ destId, images, onRefresh }) => {
  const setPrimary = async (imageId) => {
    try {
      await apiFetch(`/destinations/${destId}/images/${imageId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_primary: true }),
      })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  const deleteImage = async (imageId) => {
    if (!confirm('Delete this image?')) return
    try {
      await apiFetch(`/destinations/${destId}/images/${imageId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  if (!images?.length) return (
    <div className="dd-empty">
      <div className="dd-empty__icon"><Camera size={28} /></div>
      <h4 className="dd-empty__title">No Images Yet</h4>
      <p className="dd-empty__desc">Upload images to showcase this destination</p>
    </div>
  )

  return (
    <div>
      <div className="dd-section-label" style={{ marginBottom: 20 }}>
        <Camera size={10} /> {images.length} Image{images.length !== 1 ? 's' : ''}
      </div>
      <div className="dd-gallery-grid">
        {images.map((img, i) => (
          <div
            key={img.id}
            className={`dd-gallery-item ${img.isPrimary ? 'dd-gallery-item--primary' : ''}`}
            style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
          >
            <img src={img.imageUrl} alt={img.altText || ''} className="dd-gallery-item__img" />
            {img.isPrimary && (
              <div className="dd-gallery-item__primary-badge">Hero</div>
            )}
            {img.caption && (
              <div className="dd-gallery-item__caption">{img.caption}</div>
            )}
            <div className="dd-gallery-item__overlay">
              {!img.isPrimary && (
                <button className="dd-gallery-btn dd-gallery-btn--primary" onClick={() => setPrimary(img.id)}>
                  Set Hero
                </button>
              )}
              <button className="dd-gallery-btn dd-gallery-btn--danger" onClick={() => deleteImage(img.id)}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: ITINERARY
═══════════════════════════════════════════════════════════ */
const ItinerarySection = ({ itinerary }) => {
  if (!itinerary?.length) return (
    <div className="dd-empty">
      <div className="dd-empty__icon"><Map size={28} /></div>
      <h4 className="dd-empty__title">No Itinerary Yet</h4>
      <p className="dd-empty__desc">Add day-by-day journey details</p>
    </div>
  )

  return (
    <div>
      <div className="dd-section-label" style={{ marginBottom: 20 }}>
        <Calendar size={10} /> {itinerary.length} Day{itinerary.length !== 1 ? 's' : ''}
      </div>
      {itinerary.map((day, i) => (
        <div key={day.id} className="dd-itin-item" style={{ animationDelay: `${i * 0.07}s` }}>
          <div className="dd-itin-card">
            <div className="dd-itin-head">
              <div className="dd-itin-day">{day.dayNumber}</div>
              <div>
                <h4 className="dd-itin-head__title">{day.title}</h4>
                <div className="dd-itin-head__meta">
                  {day.distanceKm && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={10} /> {day.distanceKm} km
                    </span>
                  )}
                  {day.accommodation && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={10} /> {day.accommodation}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="dd-itin-body">
              {day.description && <p>{day.description}</p>}
              <div className="dd-itin-meta-grid">
                {day.activities?.length > 0 && (
                  <div className="dd-itin-meta-block">
                    <div className="dd-itin-meta-label">Activities</div>
                    {day.activities.map((a, j) => (
                      <span key={j} className="dd-chip-small dd-chip-green">{a}</span>
                    ))}
                  </div>
                )}
                {day.meals?.length > 0 && (
                  <div className="dd-itin-meta-block">
                    <div className="dd-itin-meta-label">Meals</div>
                    {day.meals.map((m, j) => (
                      <span key={j} className="dd-chip-small dd-chip-orange">{m}</span>
                    ))}
                  </div>
                )}
                {day.highlights?.length > 0 && (
                  <div className="dd-itin-meta-block">
                    <div className="dd-itin-meta-label">Highlights</div>
                    {day.highlights.map((h, j) => (
                      <span key={j} className="dd-chip-small dd-chip-green">{h}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: FAQs
═══════════════════════════════════════════════════════════ */
const FAQsSection = ({ faqs }) => {
  const [open, setOpen] = useState(null)

  if (!faqs?.length) return (
    <div className="dd-empty">
      <div className="dd-empty__icon"><HelpCircle size={28} /></div>
      <h4 className="dd-empty__title">No FAQs Yet</h4>
      <p className="dd-empty__desc">Add common questions and answers</p>
    </div>
  )

  return (
    <div>
      <div className="dd-section-label" style={{ marginBottom: 20 }}>
        <HelpCircle size={10} /> {faqs.length} Question{faqs.length !== 1 ? 's' : ''}
      </div>
      {faqs.map((faq, i) => (
        <div
          key={faq.id}
          className={`dd-faq-item ${open === faq.id ? 'dd-faq-item--open' : ''}`}
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <button className="dd-faq-btn" onClick={() => setOpen(open === faq.id ? null : faq.id)}>
            <span className="dd-faq-question">{faq.question}</span>
            <span className={`dd-faq-icon ${open === faq.id ? 'dd-faq-icon--open' : ''}`}>
              <ChevronDown size={14} />
            </span>
          </button>
          {open === faq.id && (
            <div className="dd-faq-answer">
              <p>{faq.answer}</p>
              {faq.helpfulCount > 0 && (
                <div className="dd-faq-helpful">
                  <CheckCircle size={11} /> {faq.helpfulCount} found this helpful
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: REVIEWS
═══════════════════════════════════════════════════════════ */
const ReviewsSection = ({ reviews, aggregate }) => {
  if (!reviews?.length) return (
    <div className="dd-empty">
      <div className="dd-empty__icon"><MessageSquare size={28} /></div>
      <h4 className="dd-empty__title">No Approved Reviews</h4>
      <p className="dd-empty__desc">Reviews will appear once approved</p>
    </div>
  )

  const agg = aggregate || {}
  const total = agg.totalReviews || 0

  const bars = [
    { label: '5★', count: agg.distribution?.fiveStar || 0 },
    { label: '4★', count: agg.distribution?.fourStar || 0 },
    { label: '3★', count: agg.distribution?.threeStar || 0 },
    { label: '2★', count: agg.distribution?.twoStar || 0 },
    { label: '1★', count: agg.distribution?.oneStar || 0 },
  ]

  return (
    <div>
      {/* Aggregate */}
      {aggregate && (
        <div className="dd-review-aggregate">
          <div className="dd-review-score">
            <div className="dd-review-score__num">
              {(agg.avgRating || 0).toFixed(1)}
            </div>
            <div className="dd-review-score__stars">
              <StarRating rating={agg.avgRating || 0} size={14} />
            </div>
            <div className="dd-review-score__count">{total} reviews</div>
          </div>
          <div className="dd-review-bars">
            {bars.map(({ label, count }) => (
              <div key={label} className="dd-review-bar-row">
                <span className="dd-review-bar-label">{label}</span>
                <div className="dd-review-bar-track">
                  <div
                    className="dd-review-bar-fill"
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="dd-review-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Cards */}
      {reviews.map((r, i) => (
        <div key={r.id} className="dd-review-card" style={{ animationDelay: `${i * 0.07}s` }}>
          <div className="dd-review-card__top">
            <div className="dd-review-card__author">
              <div className="dd-review-avatar">
                {r.reviewerAvatar ? (
                  <img src={r.reviewerAvatar} alt="" />
                ) : (
                  <div className="dd-review-avatar__fallback">
                    {(r.reviewerName || 'A')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="dd-review-name">{r.reviewerName || 'Anonymous'}</div>
                {r.reviewerCountry && (
                  <div className="dd-review-country">
                    <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {r.reviewerCountry}
                  </div>
                )}
              </div>
            </div>
            <div className="dd-review-stars">
              <StarRating rating={r.rating || 0} size={14} />
            </div>
          </div>

          {r.title && <h5 className="dd-review-title">{r.title}</h5>}
          <p className="dd-review-content">{r.content}</p>

          <div className="dd-review-footer">
            {r.tripType && (
              <span className="dd-review-meta-chip">
                <Compass size={10} /> {r.tripType}
              </span>
            )}
            {r.tripDate && (
              <span className="dd-review-meta-chip">
                <Calendar size={10} /> {new Date(r.tripDate).toLocaleDateString()}
              </span>
            )}
            {r.isVerified && (
              <span className="dd-review-verified">
                <CheckCircle size={10} /> Verified
              </span>
            )}
            {r.isFeatured && (
              <span className="dd-review-featured">
                <Star size={10} /> Featured
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: PRACTICAL INFO
═══════════════════════════════════════════════════════════ */
const PracticalInfoSection = ({ info }) => {
  if (!info) return (
    <div className="dd-empty">
      <div className="dd-empty__icon"><FileText size={28} /></div>
      <h4 className="dd-empty__title">No Practical Info Yet</h4>
      <p className="dd-empty__desc">Add travel logistics and tips</p>
    </div>
  )

  const Block = ({ title, icon: Icon, children, delay = 0 }) => (
    <div className="dd-practical-card" style={{ animationDelay: `${delay}s` }}>
      <div className="dd-practical-head">
        <div className="dd-practical-head__icon"><Icon size={14} /></div>
        <h4 className="dd-practical-head__title">{title}</h4>
      </div>
      <div className="dd-practical-body">{children}</div>
    </div>
  )

  return (
    <div className="dd-practical-grid">
      <Block title="Getting There" icon={Navigation} delay={0}>
        <PracticalItem label="Airport"           value={info.gettingThere?.nearestAirport} />
        <PracticalItem label="From Airport"      value={info.gettingThere?.distanceFromAirport} />
        <PracticalItem label="From Capital"      value={info.gettingThere?.driveTimeFromCapital} />
        <PracticalItem label="Road Conditions"   value={info.gettingThere?.roadConditions} />
        <PracticalItem label="Transport"         value={info.gettingThere?.transportOptions} />
        <PracticalItem label="Border Crossings"  value={info.gettingThere?.borderCrossings} />
      </Block>

      <Block title="Health & Safety" icon={Shield} delay={0.05}>
        <PracticalItem label="Required Vaccines" value={info.healthAndSafety?.vaccinationsRequired} />
        <PracticalItem label="Recommended"       value={info.healthAndSafety?.vaccinationsRecommended} />
        <PracticalItem label="Malaria Risk"      value={info.healthAndSafety?.malariaRisk} />
        <PracticalItem label="Water Safety"      value={info.healthAndSafety?.waterSafety} />
        <PracticalItem label="Medical"           value={info.healthAndSafety?.medicalFacilities} />
        <PracticalItem label="Safety Rating"     value={info.healthAndSafety?.safetyRating} />
        <PracticalItem label="Safety Notes"      value={info.healthAndSafety?.safetyNotes} />
      </Block>

      <Block title="Climate" icon={Thermometer} delay={0.1}>
        <PracticalItem label="Temp Range"
          value={info.climate?.avgTempLowC != null
            ? `${info.climate.avgTempLowC}°C – ${info.climate.avgTempHighC}°C`
            : null} />
        <PracticalItem label="Best Months"  value={info.climate?.bestMonths} />
        <PracticalItem label="Avoid"        value={info.climate?.avoidMonths} />
        <PracticalItem label="Rainfall"     value={info.climate?.rainfallMmAnnual ? `${info.climate.rainfallMmAnnual}mm/yr` : null} />
        <PracticalItem label="Humidity"     value={info.climate?.humidityPercent ? `${info.climate.humidityPercent}%` : null} />
        <PracticalItem label="UV Index"     value={info.climate?.uvIndexPeak} />
        <PracticalItem label="Notes"        value={info.climate?.climateNotes} />
      </Block>

      <Block title="Budget" icon={DollarSign} delay={0.15}>
        <PracticalItem label="Range"        value={info.budget?.rangeUsd} />
        <PracticalItem label="Entrance Fee" value={info.budget?.entranceFeeUsd} />
        <PracticalItem label="Guide Cost"   value={info.budget?.guideCostUsd} />
        <PracticalItem label="Meals"        value={info.budget?.mealCostRange} />
      </Block>

      <Block title="Permits & Rules" icon={AlertCircle} delay={0.2}>
        <PracticalItem label="Permits"      value={info.permitsAndRegulations?.permitsRequired} />
        <PracticalItem label="Permit Cost"  value={info.permitsAndRegulations?.permitCost} />
        <PracticalItem label="Lead Time"    value={info.permitsAndRegulations?.bookingLeadTime} />
        <PracticalItem label="Visitor Cap"  value={info.permitsAndRegulations?.visitorLimits} />
        <PracticalItem label="Regulations"  value={info.permitsAndRegulations?.regulations} />
      </Block>

      <Block title="Culture & Packing" icon={Feather} delay={0.25}>
        <PracticalItem label="Essentials"   value={info.packing?.essentials} />
        <PracticalItem label="Clothing"     value={info.packing?.clothingTips} />
        <PracticalItem label="Gear"         value={info.packing?.gearRecommendations} />
        <PracticalItem label="Currency"     value={info.culture?.currencyTips} />
        <PracticalItem label="Tipping"      value={info.culture?.tippingCulture} />
        <PracticalItem label="Etiquette"    value={info.culture?.localEtiquette} />
        <PracticalItem label="Photography"  value={info.culture?.photographyRules} />
      </Block>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SECTION: TAGS
═══════════════════════════════════════════════════════════ */
const TagsSection = ({ tags, destId, onRefresh }) => {
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = async (e) => {
    e.preventDefault()
    if (!newTag.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/destinations/${destId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag_name: newTag.trim() }),
      })
      setNewTag('')
      onRefresh()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const removeTag = async (tagId) => {
    if (!confirm('Remove this tag?')) return
    try {
      await apiFetch(`/destinations/${destId}/tags/${tagId}`, { method: 'DELETE' })
      onRefresh()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="dd-section-label" style={{ marginBottom: 20 }}>
        <Tag size={10} /> Manage Tags
      </div>

      <form onSubmit={addTag} className="dd-tag-form">
        <input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Add a tag…"
          className="dd-tag-input"
        />
        <button type="submit" disabled={saving || !newTag.trim()} className="dd-tag-submit">
          {saving ? '…' : <><Plus size={13} style={{ display: 'inline', marginRight: 4 }} />Add</>}
        </button>
      </form>

      {tags?.length ? (
        <div className="dd-tag-cloud">
          {tags.map(tag => (
            <div key={tag.id} className="dd-tag-pill">
              <Tag size={10} />
              {tag.name}
              {tag.category && <span className="dd-tag-pill__cat">({tag.category})</span>}
              <button className="dd-tag-remove" onClick={() => removeTag(tag.id)}>
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dd-empty" style={{ padding: '40px 0' }}>
          <div className="dd-empty__icon" style={{ width: 52, height: 52 }}><Tag size={22} /></div>
          <p className="dd-empty__desc">No tags yet — add some above</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function DestinationDetail({ destinationId, onClose, onEdit }) {
  const [dest, setDest]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => { injectCSS() }, [])

  const load = useCallback(async () => {
    if (!destinationId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/destinations/${destinationId}?include=all`)
      setDest(data.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [destinationId])

  useEffect(() => { load() }, [load])

  const TABS = [
    { id: 'overview',  label: 'Overview',      icon: BarChart2 },
    { id: 'gallery',   label: 'Gallery',        icon: Camera,        count: dest?.gallery?.length },
    { id: 'itinerary', label: 'Itinerary',      icon: Map,           count: dest?.itinerary?.length },
    { id: 'faqs',      label: 'FAQs',           icon: HelpCircle,    count: dest?.faqs?.length },
    { id: 'reviews',   label: 'Reviews',        icon: MessageSquare, count: dest?.reviews?.length },
    { id: 'practical', label: 'Practical',      icon: Navigation },
    { id: 'tags',      label: 'Tags',           icon: Tag,           count: dest?.tags?.length },
  ]

  return (
    <div className="dd-drawer" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dd-panel">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="dd-header">
          <div className="dd-header__inner">
            <div className="dd-header__top">
              <div className="dd-header__identity">
                <div className="dd-header__icon">
                  <Mountain size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className="dd-header__name">
                    {dest?.name || 'Loading…'}
                  </h2>
                  {dest?.country && (
                    <div className="dd-header__sub">
                      <MapPin size={11} />
                      {dest.country.name}
                      {dest.country.flag && ` ${dest.country.flag}`}
                      {dest.region && ` · ${dest.region}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="dd-header__actions">
                <button
                  onClick={load}
                  className="dd-header__btn dd-header__btn--icon"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
                {onEdit && dest && (
                  <button
                    onClick={() => onEdit(dest)}
                    className="dd-header__btn dd-header__btn--edit"
                  >
                    <Edit size={13} /> Edit
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="dd-header__btn dd-header__btn--icon dd-header__btn--close"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            {dest && (
              <div className="dd-stats-bar">
                <div className="dd-stat-item">
                  <div className="dd-stat-value">
                    {dest.rating ? `${dest.rating}` : '—'}
                  </div>
                  <div className="dd-stat-label">Rating</div>
                </div>
                <div className="dd-stat-item">
                  <div className="dd-stat-value">
                    {dest.viewCount?.toLocaleString() || '0'}
                  </div>
                  <div className="dd-stat-label">Views</div>
                </div>
                <div className="dd-stat-item">
                  <div className="dd-stat-value">
                    {dest.reviewCount?.toLocaleString() || '0'}
                  </div>
                  <div className="dd-stat-label">Reviews</div>
                </div>
                <div className="dd-stat-item">
                  <div className="dd-stat-value">
                    {dest.wishlistCount?.toLocaleString() || '0'}
                  </div>
                  <div className="dd-stat-label">Wishlist</div>
                </div>
              </div>
            )}

            {/* Badges */}
            {dest && (
              <div className="dd-badges-row">
                <StatusBadge status={dest.status} />
                {dest.isFeatured && (
                  <span className="dd-badge dd-badge--purple">
                    <Award size={9} /> Featured
                  </span>
                )}
                {dest.isPopular && (
                  <span className="dd-badge dd-badge--blue">
                    <TrendingUp size={9} /> Popular
                  </span>
                )}
                {dest.category && (
                  <span className="dd-badge dd-badge--gray">
                    <Compass size={9} /> {dest.category}
                  </span>
                )}
                {dest.difficulty && (
                  <span className="dd-badge dd-badge--gray">
                    <Activity size={9} /> {dest.difficulty}
                  </span>
                )}
                {dest.duration && (
                  <span className="dd-badge dd-badge--gray">
                    <Clock size={9} /> {dest.duration}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="dd-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`dd-tab ${activeTab === tab.id ? 'dd-tab--active' : 'dd-tab--inactive'}`}
              >
                <tab.icon size={13} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="dd-tab__count">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div className="dd-content">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 16 }}>
              <div className="dd-spinner" />
              <p style={{ color: 'var(--dd-text-3)', fontSize: 14, margin: 0 }}>Loading destination…</p>
            </div>
          ) : error ? (
            <div className="dd-error">
              <div className="dd-error__icon"><AlertCircle size={28} /></div>
              <h4 className="dd-error__title">Failed to load</h4>
              <p className="dd-error__msg">{error}</p>
              <button className="dd-retry-btn" onClick={load}>
                <RefreshCw size={13} style={{ display: 'inline', marginRight: 6 }} />
                Retry
              </button>
            </div>
          ) : dest ? (
            <>
              {activeTab === 'overview'  && <OverviewSection dest={dest} />}
              {activeTab === 'gallery'   && <GallerySection destId={dest.id} images={dest.gallery} onRefresh={load} />}
              {activeTab === 'itinerary' && <ItinerarySection itinerary={dest.itinerary} />}
              {activeTab === 'faqs'      && <FAQsSection faqs={dest.faqs} />}
              {activeTab === 'reviews'   && <ReviewsSection reviews={dest.reviews} aggregate={dest.reviewAggregate} />}
              {activeTab === 'practical' && <PracticalInfoSection info={dest.practicalInfo} />}
              {activeTab === 'tags'      && <TagsSection tags={dest.tags} destId={dest.id} onRefresh={load} />}
            </>
          ) : null}
        </div>

      </div>
    </div>
  )
}