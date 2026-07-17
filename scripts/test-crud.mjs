/**
 * Admin Panel CRUD Test Suite
 * 
 * Tests all CRUD operations against the backend API.
 * Run: node scripts/test-crud.mjs
 */

const BASE = "https://backend-jd8f.onrender.com/api";
let token = null;
let results = [];
let passCount = 0;
let failCount = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg, type = "info") {
  const colors = {
    info: "\x1b[36m",
    pass: "\x1b[32m",
    fail: "\x1b[31m",
    warn: "\x1b[33m",
    reset: "\x1b[0m",
  };
  console.log(`${colors[type] || ""}${msg}${colors.reset || ""}`);
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, ok: res.ok, data, headers: Object.fromEntries(res.headers.entries()) };
}

function assert(condition, testName, details = "") {
  if (condition) {
    passCount++;
    log(`  ✓ ${testName}`, "pass");
    results.push({ test: testName, pass: true, details });
  } else {
    failCount++;
    log(`  ✗ ${testName}${details ? ` — ${details}` : ""}`, "fail");
    results.push({ test: testName, pass: false, details });
  }
}

function assertEqual(actual, expected, testName) {
  assert(actual === expected, testName, `expected ${expected}, got ${actual}`);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function login() {
  log("\n🔐 AUTH", "info");
  const res = await request("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
    email: "admin@altuvera.com",
    password: "123",
    }),
  });

  if (res.ok && res.data?.token) {
    token = res.data.token;
    assert(true, "Admin login successful", `token: ${token.slice(0, 20)}...`);
    return true;
  } else {
    assert(false, "Admin login", `status: ${res.status}, data: ${JSON.stringify(res.data).slice(0, 100)}`);
    return false;
  }
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

async function testDestinations() {
  log("\n📍 DESTINATIONS CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/destinations?limit=10");
  assert(listRes.ok, "GET /destinations - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /destinations - returns array", `count: ${listData.length}`);

  // READ - Get one (if any exist)
  if (listData.length > 0) {
    const firstId = listData[0].id;
    const oneRes = await request(`/destinations/${firstId}`);
    assert(oneRes.ok, `GET /destinations/${firstId} - get one`);
    assert(oneRes.data?.id === firstId, "GET /destinations/:id - correct id returned");
  }

  // CREATE
  const createPayload = {
    name: "Test Destination " + Date.now(),
    slug: "test-destination-" + Date.now(),
    country_id: 1,
    category: "Safari",
    status: "draft",
    description: "Test description for CRUD testing",
    short_description: "Short test description",
  };
  const createRes = await request("/destinations", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /destinations - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /destinations - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      name: "Updated Test Destination " + Date.now(),
      description: "Updated description",
    };
    const updateRes = await request(`/destinations/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /destinations/${createdId} - update`, `status: ${updateRes.status}`);
    assert(
      updateRes.data?.name?.includes("Updated") || updateRes.data?.data?.name?.includes("Updated"),
      "PUT /destinations/:id - name updated"
    );
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/destinations/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /destinations/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testTestimonials() {
  log("\n💬 TESTIMONIALS CRUD", "info");
  let createdId = null;

  // READ - Admin list (includes pending)
  const listRes = await request("/testimonials/admin/all?limit=10");
  assert(listRes.ok, "GET /testimonials/admin/all - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /testimonials/admin/all - returns array");

  // CREATE
  const createPayload = {
    name: "Test User " + Date.now(),
    testimonial_text: "This is a test testimonial for CRUD testing.",
    rating: 5,
    is_active: true,
    is_featured: false,
  };
  const createRes = await request("/testimonials", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /testimonials - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /testimonials - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      testimonial_text: "Updated testimonial text for CRUD testing.",
      rating: 4,
    };
    const updateRes = await request(`/testimonials/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /testimonials/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // TOGGLE FEATURED
  if (createdId) {
    const toggleRes = await request(`/testimonials/${createdId}/toggle-featured`, { method: "PATCH" });
    assert(toggleRes.ok, `PATCH /testimonials/${createdId}/toggle-featured`, `status: ${toggleRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/testimonials/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /testimonials/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testCountries() {
  log("\n🌍 COUNTRIES CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/countries?limit=10");
  assert(listRes.ok, "GET /countries - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /countries - returns array");

  // CREATE
  const createPayload = {
    name: "Test Country " + Date.now(),
    slug: "test-country-" + Date.now(),
    continent: "Africa",
    region: "East Africa",
    capital: "Test City",
    population: 1000000,
  };
  const createRes = await request("/countries", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /countries - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /countries - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      name: "Updated Test Country " + Date.now(),
      population: 2000000,
    };
    const updateRes = await request(`/countries/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /countries/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // TOGGLE FEATURED
  if (createdId) {
    const toggleRes = await request(`/countries/${createdId}/toggle-featured`, { method: "PATCH" });
    assert(toggleRes.ok, `PATCH /countries/${createdId}/toggle-featured`, `status: ${toggleRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/countries/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /countries/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testUsers() {
  log("\n👥 USERS CRUD", "info");

  // READ - List
  const listRes = await request("/admin/users?limit=10");
  assert(listRes.ok, "GET /admin/users - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /admin/users - returns array");

  // READ - Get one (if any)
  if (listData.length > 0) {
    const firstId = listData[0].id;
    const oneRes = await request(`/admin/users/${firstId}`);
    assert(oneRes.ok, `GET /admin/users/${firstId} - get one`);
  }

  // ACTIVATE/DEACTIVATE (if any user exists)
  if (listData.length > 0) {
    const userId = listData[0].id;
    const toggleRes = await request(`/users/${userId}/toggle-active`, { method: "POST" });
    assert(toggleRes.ok, `POST /users/${userId}/toggle-active`, `status: ${toggleRes.status}`);
  }

  return { pass: failCount === 0 };
}

async function testBookings() {
  log("\n📅 BOOKINGS CRUD", "info");

  // READ - List
  const listRes = await request("/bookings");
  assert(listRes.ok, "GET /bookings - list (admin)");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /bookings - returns array");

  // READ - Stats
  const statsRes = await request("/bookings/stats");
  assert(statsRes.ok, "GET /bookings/stats");

  // READ - Upcoming
  const upcomingRes = await request("/bookings/upcoming");
  assert(upcomingRes.ok, "GET /bookings/upcoming");

  return { pass: failCount === 0 };
}

async function testPosts() {
  log("\n📝 POSTS CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/posts?limit=10");
  assert(listRes.ok, "GET /posts - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /posts - returns array");

  // CREATE
  const createPayload = {
    title: "Test Post " + Date.now(),
    slug: "test-post-" + Date.now(),
    content: "Test content for CRUD testing.",
    excerpt: "Test excerpt",
    status: "draft",
  };
  const createRes = await request("/posts", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /posts - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /posts - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      title: "Updated Test Post " + Date.now(),
      content: "Updated content for CRUD testing.",
    };
    const updateRes = await request(`/posts/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /posts/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/posts/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /posts/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testFAQs() {
  log("\n❓ FAQs CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/faqs?limit=10");
  assert(listRes.ok, "GET /faqs - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /faqs - returns array");

  // CREATE
  const createPayload = {
    question: "Test FAQ " + Date.now(),
    answer: "Test answer for CRUD testing.",
    category: "General",
    is_active: true,
  };
  const createRes = await request("/faqs", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /faqs - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /faqs - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      question: "Updated Test FAQ " + Date.now(),
      answer: "Updated answer for CRUD testing.",
    };
    const updateRes = await request(`/faqs/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /faqs/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/faqs/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /faqs/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testTips() {
  log("\n💡 TIPS CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/tips?limit=10");
  assert(listRes.ok, "GET /tips - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /tips - returns array");

  // CREATE
  const createPayload = {
    title: "Test Tip " + Date.now(),
    summary: "Test summary for CRUD testing.",
    content: "Test content for CRUD testing.",
    category: "General",
    trip_phase: "pre-trip",
    priority: "medium",
    is_featured: false,
    is_active: true,
  };
  const createRes = await request("/tips", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /tips - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /tips - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      title: "Updated Test Tip " + Date.now(),
      content: "Updated content for CRUD testing.",
    };
    const updateRes = await request(`/tips/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /tips/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/tips/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /tips/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testTeam() {
  log("\n👨‍👩‍👧‍👦 TEAM CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/team?limit=10");
  assert(listRes.ok, "GET /team - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /team - returns array");

  // CREATE
  const createPayload = {
    name: "Test Member " + Date.now(),
    role: "Test Role",
    department: "Testing",
    bio: "Test bio for CRUD testing.",
    is_active: true,
    is_featured: false,
  };
  const createRes = await request("/team", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /team - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /team - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      name: "Updated Test Member " + Date.now(),
      bio: "Updated bio for CRUD testing.",
    };
    const updateRes = await request(`/team/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /team/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/team/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /team/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testGallery() {
  log("\n🖼️ GALLERY CRUD", "info");
  let createdId = null;

  // READ - List
  const listRes = await request("/gallery?limit=10");
  assert(listRes.ok, "GET /gallery - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /gallery - returns array");

  // CREATE
  const createPayload = {
    title: "Test Gallery " + Date.now(),
    image_url: "https://picsum.photos/seed/test/800/600",
    category: "nature",
    is_featured: false,
    is_active: true,
  };
  const createRes = await request("/gallery", {
    method: "POST",
    body: JSON.stringify(createPayload),
  });
  assert(createRes.ok, "POST /gallery - create", `status: ${createRes.status}`);
  createdId = createRes.data?.id || createRes.data?.data?.id;
  assert(createdId != null, "POST /gallery - returns id", `id: ${createdId}`);

  // UPDATE
  if (createdId) {
    const updatePayload = {
      title: "Updated Test Gallery " + Date.now(),
      category: "wildlife",
    };
    const updateRes = await request(`/gallery/${createdId}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    assert(updateRes.ok, `PUT /gallery/${createdId} - update`, `status: ${updateRes.status}`);
  }

  // DELETE
  if (createdId) {
    const deleteRes = await request(`/gallery/${createdId}`, { method: "DELETE" });
    assert(deleteRes.ok, `DELETE /gallery/${createdId} - delete`, `status: ${deleteRes.status}`);
  }

  return { createdId, pass: failCount === 0 };
}

async function testContact() {
  log("\n📬 CONTACT CRUD", "info");

  // READ - List
  const listRes = await request("/contact?limit=10");
  assert(listRes.ok, "GET /contact - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /contact - returns array");

  // Note: Contact submissions are usually read-only for admin (view/archive/delete)
  // No create endpoint for admin

  return { pass: failCount === 0 };
}

async function testSubscribers() {
  log("\n📧 SUBSCRIBERS CRUD", "info");

  // READ - List
  const listRes = await request("/subscribers?limit=10");
  assert(listRes.ok, "GET /subscribers - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /subscribers - returns array");

  // Note: Subscribers are usually created via public form, admin can only view/delete

  return { pass: failCount === 0 };
}

async function testComments() {
  log("\n💬 COMMENTS CRUD", "info");

  // READ - List
  const listRes = await request("/comments?limit=10");
  assert(listRes.ok, "GET /comments - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /comments - returns array");

  return { pass: failCount === 0 };
}

async function testNotifications() {
  log("\n🔔 NOTIFICATIONS", "info");

  // READ - List
  const listRes = await request("/notifications?limit=10");
  assert(listRes.ok, "GET /notifications - list");
  const listData = listRes.data?.data || listRes.data || [];
  assert(Array.isArray(listData), "GET /notifications - returns array");

  return { pass: failCount === 0 };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════════", "info");
  log("  ADMIN PANEL CRUD TEST SUITE", "info");
  log("═══════════════════════════════════════════", "info");

  // Auth
  const authOk = await login();
  if (!authOk) {
    log("\n❌ Cannot proceed without admin auth. Exiting.", "fail");
    process.exit(1);
  }

  // Run all test suites
  const suites = [
    testDestinations,
    testTestimonials,
    testCountries,
    testUsers,
    testBookings,
    testPosts,
    testFAQs,
    testTips,
    testTeam,
    testGallery,
    testContact,
    testSubscribers,
    testComments,
    testNotifications,
  ];

  const suiteResults = [];
  for (const suite of suites) {
    const before = failCount;
    const result = await suite();
    const after = failCount;
    suiteResults.push({
      name: suite.name.replace("test", "").replace("CRUD", "").trim() || suite.name,
      newFailures: after - before,
      pass: result.pass,
    });
  }

  // Summary
  log("\n═══════════════════════════════════════════", "info");
  log("  SUMMARY", "info");
  log("═══════════════════════════════════════════", "info");
  log(`  Total tests: ${passCount + failCount}`);
  log(`  Passed: ${passCount}`, "pass");
  log(`  Failed: ${failCount}`, failCount > 0 ? "fail" : "info");

  log("\n  Per-module results:");
  for (const r of suiteResults) {
    const status = r.pass ? "✓" : "✗";
    const color = r.pass ? "pass" : "fail";
    log(`    ${status} ${r.name}${r.newFailures > 0 ? ` (${r.newFailures} new failures)` : ""}`, color);
  }

  if (failCount > 0) {
    log("\n❌ Some tests failed. Check output above.", "fail");
    process.exit(1);
  } else {
    log("\n✅ All CRUD tests passed!", "pass");
    process.exit(0);
  }
}

main().catch((err) => {
  log(`\n❌ Test suite crashed: ${err.message}`, "fail");
  console.error(err);
  process.exit(1);
});
