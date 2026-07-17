# Admin Panel CRUD Testing Guide

## Quick Start

### Option 1: Browser Console Test (Recommended)
1. Open admin panel in browser
2. Log in
3. Open DevTools (F12) → Console
4. Copy-paste content from `scripts/browser-crud-test.js`
5. Press Enter and watch results

### Option 2: Manual Testing
Follow the checklist below for each module.

---

## Authentication
- **Login Page**: `/login`
- **Credentials**: Check `backend/db/seed.sql` for admin users
- **Default**: `admin@altuvera.com` / password from seed

---

## Module CRUD Checklist

### 1. 📍 DESTINATIONS (`/destinations`)
- [ ] **CREATE**: Click "Add Destination" → Fill 4-step form → Save
- [ ] **READ**: Verify list loads with pagination, search, filters
- [ ] **UPDATE**: Click edit icon → Modify fields → Save
- [ ] **DELETE**: Click delete → Confirm dialog → Verify removed
- [ ] **VIEW**: Click row → View modal opens with details
- [ ] **SEARCH**: Type in search bar → Results filter live
- [ ] **FILTER**: Category filter → Status filter
- [ ] **SORT**: Click column headers → Sort toggles asc/desc

### 2. 💬 TESTIMONIALS (`/testimonials`)
- [ ] **CREATE**: Click "Add Testimonial" → Fill form → Save
- [ ] **READ**: List loads with stats banner (Total/Active/Pending/Avg Rating)
- [ ] **UPDATE**: Edit testimonial → Save changes
- [ ] **DELETE**: Delete with confirmation
- [ ] **APPROVE**: Click approve button on pending testimonial → Status changes to Active
- [ ] **DEACTIVATE**: Click deactivate on active testimonial
- [ ] **FEATURED**: Click star icon → Toggles featured status
- [ ] **FILTER**: All/Pending/Active/Featured tabs
- [ ] **SEARCH**: Search by author, content, location

### 3. 🌍 COUNTRIES (`/countries`)
- [ ] **CREATE**: Click "Add Country" → 5-step wizard → Save
- [ ] **READ**: List with flag, name, continent, population
- [ ] **UPDATE**: Edit country → Save
- [ ] **DELETE**: Delete with confirmation
- [ ] **TOGGLE FEATURED**: Star icon toggles featured status
- [ ] **TOGGLE ACTIVE**: Activate/deactivate country
- [ ] **VIEW**: Click row → View modal with details

### 4. 📅 BOOKINGS (`/bookings`)
- [ ] **CREATE**: Click "New Booking" → 4-step wizard → Save
- [ ] **READ**: List with booking number, guest, date, status
- [ ] **UPDATE**: Edit booking details
- [ ] **STATUS CHANGE**: Confirm pending booking
- [ ] **CANCEL**: Cancel booking with reason
- [ ] **NOTES**: Add admin notes
- [ ] **PAYMENT**: Confirm payment / Request payment
- [ ] **EXPORT**: Click export → CSV downloads
- [ ] **FILTER**: Status filter, date range
- [ ] **SEARCH**: Search by booking number, guest name

### 5. 📝 POSTS (`/posts`)
- [ ] **CREATE**: Click "Add Post" → 4-step wizard → Save
- [ ] **READ**: List with title, author, category, status
- [ ] **UPDATE**: Edit post content
- [ ] **DELETE**: Delete with confirmation
- [ ] **PUBLISH**: Toggle publish/draft status
- [ ] **FEATURED**: Toggle featured status
- [ ] **RICH TEXT**: Test rich text editor in form

### 6. ❓ FAQs (`/faqs`)
- [ ] **CREATE**: Click "Add FAQ" → 2-step form → Save
- [ ] **READ**: Accordion list with question/answer
- [ ] **UPDATE**: Edit FAQ
- [ ] **DELETE**: Delete with confirmation
- [ ] **VISIBILITY**: Toggle hide/show

### 7. 💡 TIPS (`/tips`)
- [ ] **CREATE**: Click "Add Tip" → Form → Save
- [ ] **READ**: List with title, category, priority
- [ ] **UPDATE**: Edit tip
- [ ] **DELETE**: Delete with confirmation
- [ ] **FILTER**: Category filter, priority filter
- [ ] **EXPORT**: CSV/PDF export

### 8. 👨‍👩‍👧‍👦 TEAM (`/team`)
- [ ] **CREATE**: Click "Add Member" → Form → Save
- [ ] **READ**: List with avatar, name, role, department
- [ ] **UPDATE**: Edit team member
- [ ] **DELETE**: Delete with confirmation
- [ ] **FEATURED**: Toggle featured status
- [ ] **SOCIALS**: Add/edit social media links

### 9. 🖼️ GALLERY (`/gallery`)
- [ ] **CREATE**: Upload image → Add to gallery
- [ ] **READ**: Image grid with hover overlay
- [ ] **UPDATE**: Edit image details
- [ ] **DELETE**: Delete image
- [ ] **FEATURED**: Toggle featured star
- [ ] **LIGHTBOX**: Click image → Lightbox view

### 10. 📬 CONTACT (`/contact`)
- [ ] **READ**: List of contact submissions
- [ ] **VIEW**: Click row → View full message
- [ ] **REPLY**: Click reply → Send email response
- [ ] **ARCHIVE**: Archive contact
- [ ] **DELETE**: Delete contact
- [ ] **FILTER**: Status filter, priority filter

### 11. 📧 SUBSCRIBERS (`/subscribers`)
- [ ] **READ**: List of email subscribers
- [ ] **DELETE**: Remove subscriber
- [ ] **NEWSLETTER**: Send newsletter to all

### 12. 💬 COMMENTS (`/comments`)
- [ ] **READ**: List of destination comments
- [ ] **APPROVE**: Approve pending comment
- [ ] **HIDE**: Hide/unhide comment
- [ ] **DELETE**: Delete comment
- [ ] **FILTER**: All/Approved/Hidden tabs

### 13. 🔔 NOTIFICATIONS (`/notifications`)
- [ ] **READ**: Notification list with tabs (all/unread/read/booking/system)
- [ ] **MARK READ**: Mark single notification as read
- [ ] **MARK ALL READ**: Mark all as read
- [ ] **DELETE**: Delete notification
- [ ] **CLEAR ALL**: Clear all notifications

### 14. 👥 USERS (`/users`)
- [ ] **READ**: List of users with avatar, email, status
- [ ] **VIEW**: Click row → View user details
- [ ] **ACTIVATE/DEACTIVATE**: Toggle user status
- [ ] **EXPORT**: Export CSV
- [ ] **FILTER**: Status filter

### 15. ⚙️ SETTINGS (`/settings`)
- [ ] **READ**: View current settings
- [ ] **UPDATE**: Edit site settings
- [ ] **PASSWORD**: Change admin password
- [ ] **TEST EMAIL**: Send test email

### 16. 📢 BROADCAST (`/broadcast`)
- [ ] **CREATE**: Send broadcast notification
- [ ] **PREVIEW**: Preview message before sending

---

## Automated Test Results

Run `node scripts/test-crud.mjs` from the admin directory for automated API testing.

**Note**: Automated tests require valid admin credentials. If login fails, use the browser console method instead.

---

## Common Issues

1. **401 Unauthorized**: Token expired or invalid. Re-login.
2. **403 Forbidden**: Insufficient permissions. Check admin role.
3. **404 Not Found**: Endpoint doesn't exist or wrong URL.
4. **500 Server Error**: Backend issue. Check backend logs.
5. **Validation Error**: Missing required fields. Check form validation.

---

## Backend API Base URL
```
https://backend-jd8f.onrender.com/api
```

## Admin Panel Base URL
```
http://localhost:5173 (dev)
```
