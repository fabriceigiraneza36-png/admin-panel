/**
 * Admin Panel CRUD Test Script
 * 
 * INSTRUCTIONS:
 * 1. Open the admin panel in your browser (http://localhost:5173 or your admin URL)
 * 2. Log in as admin
 * 3. Open browser DevTools (F12) → Console tab
 * 4. Paste this entire script and press Enter
 * 5. Watch the test results
 */

(async function runAdminCRUDTests() {
  console.log("\n🧪 ADMIN PANEL CRUD TEST SUITE");
  console.log("═══════════════════════════════════════════\n");

  const results = { pass: 0, fail: 0, tests: [] };

  function assert(condition, testName, details = "") {
    if (condition) {
      results.pass++;
      console.log(`  ✅ ${testName}${details ? ` — ${details}` : ""}`);
      results.tests.push({ name: testName, pass: true, details });
    } else {
      results.fail++;
      console.log(`  ❌ ${testName}${details ? ` — ${details}` : ""}`);
      results.tests.push({ name: testName, pass: false, details });
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Helper: Make API request ───────────────────────────────────────────────

  async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(`https://backend-jd8f.onrender.com/api${path}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }

    return { status: res.status, ok: res.ok, data };
  }

  // ─── Test: Destinations CRUD ────────────────────────────────────────────────

  async function testDestinations() {
    console.log("\n📍 DESTINATIONS CRUD");

    // READ - List
    const listRes = await apiRequest("/destinations?limit=5");
    assert(listRes.ok, "GET /destinations - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /destinations - returns array", `count: ${listData.length}`);

    // CREATE
    const testName = `Test Dest ${Date.now().toString(36)}`;
    const createRes = await apiRequest("/destinations", {
      method: "POST",
      body: JSON.stringify({
        name: testName,
        slug: testName.toLowerCase().replace(/\s+/g, "-"),
        country_id: 1,
        category: "Safari",
        status: "draft",
        description: "CRUD test destination",
      }),
    });
    assert(createRes.ok, "POST /destinations - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /destinations - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/destinations/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ name: testName + " Updated", description: "Updated CRUD test" }),
      });
      assert(updateRes.ok, `PUT /destinations/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/destinations/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /destinations/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Testimonials CRUD ────────────────────────────────────────────────

  async function testTestimonials() {
    console.log("\n💬 TESTIMONIALS CRUD");

    // READ - List
    const listRes = await apiRequest("/testimonials/admin/all?limit=5");
    assert(listRes.ok, "GET /testimonials/admin/all - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /testimonials/admin/all - returns array");

    // CREATE
    const createRes = await apiRequest("/testimonials", {
      method: "POST",
      body: JSON.stringify({
        name: `Test User ${Date.now().toString(36)}`,
        testimonial_text: "CRUD test testimonial",
        rating: 5,
        is_active: true,
        is_featured: false,
      }),
    });
    assert(createRes.ok, "POST /testimonials - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /testimonials - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/testimonials/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ testimonial_text: "Updated CRUD test testimonial", rating: 4 }),
      });
      assert(updateRes.ok, `PUT /testimonials/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // TOGGLE FEATURED
    if (createdId) {
      const toggleRes = await apiRequest(`/testimonials/${createdId}/toggle-featured`, { method: "PATCH" });
      assert(toggleRes.ok, `PATCH /testimonials/${createdId}/toggle-featured`, `status: ${toggleRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/testimonials/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /testimonials/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Countries CRUD ───────────────────────────────────────────────────

  async function testCountries() {
    console.log("\n🌍 COUNTRIES CRUD");

    // READ - List
    const listRes = await apiRequest("/countries?limit=5");
    assert(listRes.ok, "GET /countries - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /countries - returns array");

    // CREATE
    const createRes = await apiRequest("/countries", {
      method: "POST",
      body: JSON.stringify({
        name: `Test Country ${Date.now().toString(36)}`,
        slug: `test-country-${Date.now().toString(36)}`,
        continent: "Africa",
        region: "East Africa",
        capital: "Test City",
        population: 1000000,
      }),
    });
    assert(createRes.ok, "POST /countries - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /countries - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/countries/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ name: `Updated Test Country ${Date.now().toString(36)}`, population: 2000000 }),
      });
      assert(updateRes.ok, `PUT /countries/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // TOGGLE FEATURED
    if (createdId) {
      const toggleRes = await apiRequest(`/countries/${createdId}/toggle-featured`, { method: "PATCH" });
      assert(toggleRes.ok, `PATCH /countries/${createdId}/toggle-featured`, `status: ${toggleRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/countries/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /countries/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Posts CRUD ───────────────────────────────────────────────────────

  async function testPosts() {
    console.log("\n📝 POSTS CRUD");

    // READ - List
    const listRes = await apiRequest("/posts?limit=5");
    assert(listRes.ok, "GET /posts - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /posts - returns array");

    // CREATE
    const createRes = await apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify({
        title: `Test Post ${Date.now().toString(36)}`,
        slug: `test-post-${Date.now().toString(36)}`,
        content: "CRUD test post content",
        excerpt: "Test excerpt",
        status: "draft",
      }),
    });
    assert(createRes.ok, "POST /posts - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /posts - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/posts/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ title: `Updated Test Post ${Date.now().toString(36)}` }),
      });
      assert(updateRes.ok, `PUT /posts/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/posts/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /posts/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: FAQs CRUD ───────────────────────────────────────────────────────

  async function testFAQs() {
    console.log("\n❓ FAQs CRUD");

    // READ - List
    const listRes = await apiRequest("/faqs?limit=5");
    assert(listRes.ok, "GET /faqs - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /faqs - returns array");

    // CREATE
    const createRes = await apiRequest("/faqs", {
      method: "POST",
      body: JSON.stringify({
        question: `Test FAQ ${Date.now().toString(36)}`,
        answer: "CRUD test answer",
        category: "General",
        is_active: true,
      }),
    });
    assert(createRes.ok, "POST /faqs - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /faqs - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/faqs/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ question: `Updated Test FAQ ${Date.now().toString(36)}` }),
      });
      assert(updateRes.ok, `PUT /faqs/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/faqs/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /faqs/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Tips CRUD ───────────────────────────────────────────────────────

  async function testTips() {
    console.log("\n💡 TIPS CRUD");

    // READ - List
    const listRes = await apiRequest("/tips?limit=5");
    assert(listRes.ok, "GET /tips - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /tips - returns array");

    // CREATE
    const createRes = await apiRequest("/tips", {
      method: "POST",
      body: JSON.stringify({
        title: `Test Tip ${Date.now().toString(36)}`,
        summary: "CRUD test summary",
        content: "CRUD test content",
        category: "General",
        trip_phase: "pre-trip",
        priority: "medium",
        is_featured: false,
        is_active: true,
      }),
    });
    assert(createRes.ok, "POST /tips - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /tips - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/tips/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ title: `Updated Test Tip ${Date.now().toString(36)}` }),
      });
      assert(updateRes.ok, `PUT /tips/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/tips/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /tips/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Team CRUD ───────────────────────────────────────────────────────

  async function testTeam() {
    console.log("\n👨‍👩‍👧‍👦 TEAM CRUD");

    // READ - List
    const listRes = await apiRequest("/team?limit=5");
    assert(listRes.ok, "GET /team - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /team - returns array");

    // CREATE
    const createRes = await apiRequest("/team", {
      method: "POST",
      body: JSON.stringify({
        name: `Test Member ${Date.now().toString(36)}`,
        role: "Test Role",
        department: "Testing",
        bio: "CRUD test bio",
        is_active: true,
        is_featured: false,
      }),
    });
    assert(createRes.ok, "POST /team - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /team - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/team/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ name: `Updated Test Member ${Date.now().toString(36)}` }),
      });
      assert(updateRes.ok, `PUT /team/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/team/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /team/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Test: Gallery CRUD ────────────────────────────────────────────────────

  async function testGallery() {
    console.log("\n🖼️ GALLERY CRUD");

    // READ - List
    const listRes = await apiRequest("/gallery?limit=5");
    assert(listRes.ok, "GET /gallery - list");
    const listData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
    assert(Array.isArray(listData), "GET /gallery - returns array");

    // CREATE
    const createRes = await apiRequest("/gallery", {
      method: "POST",
      body: JSON.stringify({
        title: `Test Gallery ${Date.now().toString(36)}`,
        image_url: "https://picsum.photos/seed/test/800/600",
        category: "nature",
        is_featured: false,
        is_active: true,
      }),
    });
    assert(createRes.ok, "POST /gallery - create", `status: ${createRes.status}`);
    const createdId = createRes.data?.id || createRes.data?.data?.id;
    assert(createdId != null, "POST /gallery - returns id", `id: ${createdId}`);

    // UPDATE
    if (createdId) {
      const updateRes = await apiRequest(`/gallery/${createdId}`, {
        method: "PUT",
        body: JSON.stringify({ title: `Updated Test Gallery ${Date.now().toString(36)}` }),
      });
      assert(updateRes.ok, `PUT /gallery/${createdId} - update`, `status: ${updateRes.status}`);
    }

    // DELETE
    if (createdId) {
      const deleteRes = await apiRequest(`/gallery/${createdId}`, { method: "DELETE" });
      assert(deleteRes.ok, `DELETE /gallery/${createdId} - delete`, `status: ${deleteRes.status}`);
    }

    return { createdId, pass: results.fail === 0 };
  }

  // ─── Run all tests ─────────────────────────────────────────────────────────

  console.log("Starting CRUD tests...\n");

  const suites = [
    testDestinations,
    testTestimonials,
    testCountries,
    testPosts,
    testFAQs,
    testTips,
    testTeam,
    testGallery,
  ];

  const suiteResults = [];
  for (const suite of suites) {
    const beforeFail = results.fail;
    await suite();
    const afterFail = results.fail;
    suiteResults.push({
      name: suite.name.replace("test", "").replace("CRUD", "").trim() || suite.name,
      newFailures: afterFail - beforeFail,
    });
  }

  // Summary
  console.log("\n═══════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════");
  console.log(`  Total: ${results.pass + results.fail}`);
  console.log(`  Passed: ${results.pass}`, results.fail === 0 ? "✅" : "⚠️");
  console.log(`  Failed: ${results.fail}`, results.fail > 0 ? "❌" : "");

  console.log("\n  Per-module:");
  for (const r of suiteResults) {
    const status = r.newFailures === 0 ? "✅" : "❌";
    console.log(`    ${status} ${r.name}${r.newFailures > 0 ? ` (${r.newFailures} failures)` : ""}`);
  }

  if (results.fail > 0) {
    console.log("\n❌ Some tests failed. Check details above.");
  } else {
    console.log("\n✅ All CRUD tests passed!");
  }

  return results;
})();
