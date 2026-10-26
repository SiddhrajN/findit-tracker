// ============================================================
//  app.js — FindIt: Campus Lost-and-Found Tracker
//  Single-Page Architecture (Explore + Auth + Dashboard)
//  Synchronized with Linked List & Hash Table Data Structures
// ============================================================

// ----- Authentication Storage Keys & State ------------------
const AUTH_KEY = "findit_auth_user";
const USERS_KEY = "findit_users";
let authMode = "login"; // "login" or "signup"

// ----- Global Data Structures --------------------------------
let activeReportsList = new LinkedList();
let recoveryHistoryList = new LinkedList();
let categoryHashTable = new HashTable();
let reportCounter = 1000;

if (typeof window !== "undefined") {
  window.activeReportsList = activeReportsList;
  window.recoveryHistoryList = recoveryHistoryList;
  window.categoryHashTable = categoryHashTable;
}

// ----- Category Palette & Visual Mapping --------------------
const CATEGORY_MAP = {
  Electronics: { emoji: "📱", gradient: "from-amber-50 to-stone-100", accent: "forest" },
  "ID/Wallet": { emoji: "💳", gradient: "from-stone-100 to-amber-50", accent: "terracotta" },
  Books: { emoji: "📚", gradient: "from-emerald-50 to-stone-100", accent: "forest" },
  Keys: { emoji: "🔑", gradient: "from-orange-50 to-amber-50", accent: "terracotta" },
  Accessories: { emoji: "🎒", gradient: "from-stone-100 to-orange-50", accent: "terracotta" },
  Other: { emoji: "📦", gradient: "from-stone-50 to-stone-100", accent: "forest" },
};

function getCategoryInfo(category) {
  return CATEGORY_MAP[category] || CATEGORY_MAP["Other"];
}

// ----- Report Creator Ownership Helper -----------------------
function isReportOwner(user, report) {
  if (!user || !report) return false;
  // Match on unique user ID if both present
  if (user.id && report.creatorId && user.id === report.creatorId) {
    return true;
  }
  // Match on student roll number (case-insensitive)
  if (
    user.rollNo &&
    report.creatorRoll &&
    user.rollNo.trim().toUpperCase() === report.creatorRoll.trim().toUpperCase()
  ) {
    return true;
  }
  return false;
}

// ----- Reviewer / Admin Role Authorization Helper ------------
function isReviewer(user) {
  if (!user) return false;
  return Boolean(
    user.role === "reviewer" ||
    (user.rollNo && (
      user.rollNo.toUpperCase().startsWith("REV") ||
      user.rollNo.toUpperCase().startsWith("FAC") ||
      user.rollNo.toUpperCase().startsWith("ADMIN")
    ))
  );
}

// ----- Initial Campus Seed Data -----------------------------
const SEED_DATA = [
  {
    id: "REP-1001",
    type: "Lost",
    title: "Black Leather Wallet",
    category: "ID/Wallet",
    location: "Canteen",
    description: "Contains campus student ID card and cash. Contact Roll No: 23CS101 (Siddhraj Nimje).",
    creatorId: "USR-DEMO",
    creatorRoll: "23CS101",
    creatorName: "Siddhraj Nimje",
    status: "Active",
    timestamp: new Date("2026-10-20T09:15:00").toISOString(),
  },
  {
    id: "REP-1002",
    type: "Found",
    title: "Casio Scientific Calculator",
    category: "Electronics",
    location: "Library 2nd Floor",
    description: "Casio fx-991EX found on study desk near window. Turned in at front desk.",
    creatorId: "USR-REV-01",
    creatorRoll: "FAC-901",
    creatorName: "Dr. Aris Thorne",
    status: "Active",
    timestamp: new Date("2026-10-20T11:30:00").toISOString(),
  },
  {
    id: "REP-1003",
    type: "Lost",
    title: "Blue Spiral Notebook",
    category: "Books",
    location: "Lab 302",
    description: "100-page notebook with Physics and DSA notes, name 'Siddhraj' on cover.",
    creatorId: "USR-DEMO",
    creatorRoll: "23CS101",
    creatorName: "Siddhraj Nimje",
    status: "Active",
    timestamp: new Date("2026-10-20T14:00:00").toISOString(),
  },
  {
    id: "REP-1004",
    type: "Found",
    title: "Honda Bike Key with Red Keychain",
    category: "Keys",
    location: "Parking Lot B",
    description: "Single Honda key with a red silicone keychain. Found near bike stand.",
    creatorId: "USR-REV-01",
    creatorRoll: "FAC-901",
    creatorName: "Dr. Aris Thorne",
    status: "Active",
    timestamp: new Date("2026-10-21T08:00:00").toISOString(),
  },
  {
    id: "REP-1005",
    type: "Lost",
    title: "Apple AirPods Pro",
    category: "Electronics",
    location: "Auditorium",
    description: "White AirPods Pro in a matte case. Left on 3rd row right seat.",
    creatorId: "USR-04",
    creatorRoll: "23CS104",
    creatorName: "Rahul Sharma",
    status: "Active",
    timestamp: new Date("2026-10-21T10:45:00").toISOString(),
  },
  {
    id: "REP-1006",
    type: "Found",
    title: "Student ID Card",
    category: "ID/Wallet",
    location: "Canteen",
    description: "Campus ID card for 'Priya M.' — Dept. of CSE. Found on table near counter 3.",
    creatorId: "USR-REV-01",
    creatorRoll: "FAC-901",
    creatorName: "Dr. Aris Thorne",
    status: "Active",
    timestamp: new Date("2026-10-21T13:20:00").toISOString(),
  },
];

// ----- Local Storage Data Sync ------------------------------
const STORAGE_KEY_ACTIVE = "findit_active_reports";
const STORAGE_KEY_RECOVERED = "findit_recovered_reports";
const STORAGE_KEY_COUNTER = "findit_counter";

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activeReportsList.toArray()));
  localStorage.setItem(STORAGE_KEY_RECOVERED, JSON.stringify(recoveryHistoryList.toArray()));
  localStorage.setItem(STORAGE_KEY_COUNTER, String(reportCounter));
}

function loadFromLocalStorage() {
  const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE);
  const recoveredRaw = localStorage.getItem(STORAGE_KEY_RECOVERED);
  const counterRaw = localStorage.getItem(STORAGE_KEY_COUNTER);

  if (activeRaw) {
    const activeArr = JSON.parse(activeRaw);
    activeReportsList = LinkedList.fromArray(activeArr);
    categoryHashTable = HashTable.fromReports(activeArr);
    reportCounter = counterRaw ? parseInt(counterRaw, 10) : 1000 + activeArr.length;
  } else {
    SEED_DATA.forEach((item) => {
      activeReportsList.insertAtHead(item);
      categoryHashTable.insert(item.category, item);
      item.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => {
          if (w.length > 1) categoryHashTable.insert(w, item);
        });
    });
    reportCounter = 1006;
    saveToLocalStorage();
  }

  if (recoveredRaw) {
    recoveryHistoryList = LinkedList.fromArray(JSON.parse(recoveredRaw));
  }

  if (typeof window !== "undefined") {
    window.activeReportsList = activeReportsList;
    window.recoveryHistoryList = recoveryHistoryList;
    window.categoryHashTable = categoryHashTable;
  }

  // Load persisted claims & reconstruct FIFO queue
  if (typeof loadClaimsFromLocalStorage === "function") {
    loadClaimsFromLocalStorage();
  }
}

// ----- Authentication Management ----------------------------
function getUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ id: user.id, name: user.name, rollNo: user.rollNo, role: user.role })
  );
}

function registerUser(name, rollNo, password) {
  const users = getUsers();
  const normalizedRoll = rollNo.trim().toUpperCase();
  if (users.find((u) => u.rollNo.toUpperCase() === normalizedRoll)) {
    return { success: false, message: "An account with this Roll Number already exists." };
  }
  const user = {
    id: "USR-" + Date.now(),
    name: name.trim(),
    rollNo: normalizedRoll,
    password: password,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return { success: true, user };
}

function loginUser(rollNo, password) {
  const users = getUsers();
  const normalizedRoll = rollNo.trim().toUpperCase();
  const user = users.find(
    (u) => u.rollNo.toUpperCase() === normalizedRoll && u.password === password
  );
  if (!user) {
    return { success: false, message: "Invalid Roll Number or password." };
  }
  setCurrentUser(user);
  return { success: true, user };
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
  renderAppView();
  showToast("Logged out successfully.", "success");
}

function quickDemoLogin() {
  const demoRoll = "23CS101";
  const demoName = "Siddhraj Nimje";
  const demoPass = "campus123";
  const users = getUsers();

  let user = users.find((u) => u.rollNo === demoRoll);
  if (!user) {
    user = {
      id: "USR-DEMO",
      name: demoName,
      rollNo: demoRoll,
      password: demoPass,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
  }
  setCurrentUser(user);
  closeAuthModal();
  renderAppView();
  showToast(`Welcome back, ${demoName}!`, "success");
}

// ----- SPA Navigation: View Switching -----------------------
function renderAppView() {
  const user = getCurrentUser();
  const exploreView = document.getElementById("view-explore");
  const dashboardView = document.getElementById("view-dashboard");

  if (user) {
    exploreView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    // Populate user profile info in Dashboard Header
    document.getElementById("user-name").textContent = user.name || "Siddhraj Nimje";
    document.getElementById("user-roll").textContent = user.rollNo || "23CS101";
    document.getElementById("user-avatar").textContent = getUserInitials(user.name || "Siddhraj Nimje");

    if (typeof updateRoleUI === "function") updateRoleUI();

    refreshAll();
  } else {
    dashboardView.classList.add("hidden");
    exploreView.classList.remove("hidden");
  }
}

function getUserInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ----- Auth Modal Controller --------------------------------
function openAuthModal(mode = "login") {
  authMode = mode;
  const modal = document.getElementById("auth-modal");
  const title = document.getElementById("auth-modal-title");
  const subtitle = document.getElementById("auth-modal-subtitle");
  const nameField = document.getElementById("field-name");
  const confirmField = document.getElementById("field-confirm");
  const submitBtn = document.getElementById("auth-submit-btn");
  const switchText = document.getElementById("auth-switch-text");
  const switchBtn = document.getElementById("auth-switch-btn");
  const errorBox = document.getElementById("auth-error");

  errorBox.classList.add("hidden");
  document.getElementById("auth-form").reset();

  if (authMode === "signup") {
    title.textContent = "Create Account";
    subtitle.textContent = "Join the campus lost & found network";
    nameField.classList.remove("hidden");
    confirmField.classList.remove("hidden");
    submitBtn.textContent = "Create Account";
    switchText.textContent = "Already have an account?";
    switchBtn.textContent = "Log in";
  } else {
    title.textContent = "Welcome Back";
    subtitle.textContent = "Enter your campus credentials";
    nameField.classList.add("hidden");
    confirmField.classList.add("hidden");
    submitBtn.textContent = "Log In";
    switchText.textContent = "Don't have an account?";
    switchBtn.textContent = "Sign up free";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function toggleAuthMode() {
  openAuthModal(authMode === "login" ? "signup" : "login");
}

// ----- Utility Helpers --------------------------------------
function generateId() {
  reportCounter++;
  return `REP-${reportCounter}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----- Stats Counter ----------------------------------------
function updateStats() {
  const all = activeReportsList.toArray();
  const lostCount = all.filter((r) => r.type === "Lost").length;
  const foundCount = all.filter((r) => r.type === "Found").length;
  const recoveredCount = recoveryHistoryList.length;

  const statLost = document.getElementById("stat-lost");
  const statFound = document.getElementById("stat-found");
  const statRecovered = document.getElementById("stat-recovered");

  if (statLost) statLost.textContent = lostCount;
  if (statFound) statFound.textContent = foundCount;
  if (statRecovered) statRecovered.textContent = recoveredCount;
}

// ============================================================
//  PURE CSS 3D MULTI-PLANE OBJECT GENERATOR
// ============================================================
function create3DItemHTML(category, title) {
  const cat = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();

  // 1. Student ID Card or Leather Wallet
  if (cat.includes("id") || cat.includes("wallet") || t.includes("id") || t.includes("card") || t.includes("wallet")) {
    if (t.includes("wallet")) {
      return `
        <div class="stage-3d">
          <div class="object-3d float-6axis">
            <div class="layer-3d z-back w-28 h-20 bg-amber-950 rounded-xl shadow-md border border-neutral-950 flex items-center justify-center p-1">
              <div class="w-full h-full border border-dashed border-amber-800/60 rounded-lg"></div>
            </div>
            <div class="layer-3d z-mid w-26 h-18 bg-amber-900 rounded-xl border border-amber-950 p-2 flex flex-col justify-start">
              <div class="w-18 h-3.5 bg-forest rounded-xs text-[8px] text-white font-mono flex items-center justify-center font-bold shadow-xs">
                ₹500 • CASH
              </div>
            </div>
            <div class="layer-3d z-front w-28 h-14 bg-gradient-to-br from-amber-800 to-amber-950 rounded-b-xl border-t border-amber-700/80 shadow-inner p-2 flex items-center justify-between">
              <div class="w-7 h-5 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xs -mt-4 shadow text-[6px] text-white font-bold p-0.5 text-center">VISA</div>
              <div class="w-7 h-5 bg-terracotta rounded-xs -mt-5 shadow text-[6px] text-white font-bold p-0.5 text-center">ID</div>
            </div>
            <div class="layer-3d z-accent w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-600 via-amber-300 to-yellow-500 border border-amber-700 shadow-md flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-amber-950/60"></div>
            </div>
          </div>
          <div class="floor-shadow"></div>
        </div>
      `;
    }
    return `
      <div class="stage-3d">
        <div class="object-3d float-6axis">
          <div class="layer-3d z-back w-30 h-20 bg-sand-d rounded-xl border border-sand shadow-md p-1.5 flex flex-col justify-between">
            <div class="w-full h-3 bg-neutral-900 rounded-sm"></div>
            <div class="w-16 h-2 bg-neutral-400/50 rounded-xs"></div>
          </div>
          <div class="layer-3d z-mid w-30 h-20 bg-white/95 rounded-xl border border-sand-d shadow-xs p-2 flex flex-col justify-between">
            <div class="flex items-center justify-between border-b border-sand pb-1">
              <span class="text-[8px] font-black tracking-wider text-forest">CAMPUS ID</span>
              <div class="w-2 h-2 rounded-full bg-forest"></div>
            </div>
          </div>
          <div class="layer-3d z-front w-30 h-20 p-2 flex flex-col justify-between pointer-events-none">
            <div class="flex items-center gap-2 mt-3">
              <div class="w-6 h-5 rounded bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border border-amber-600 shadow-sm flex items-center justify-center">
                <div class="w-3 h-2.5 border border-amber-700/60 rounded-xs"></div>
              </div>
              <div>
                <p class="text-[9px] font-extrabold text-gray-800 leading-none">SIDDHRAJ N.</p>
                <p class="text-[7px] font-mono text-terracotta leading-tight">23CS101</p>
              </div>
            </div>
            <div class="flex justify-between items-end">
              <span class="text-[6px] font-mono text-gray-500 font-bold">STUDENT • CSE</span>
              <div class="w-9 h-2 bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-800 rounded-xs"></div>
            </div>
          </div>
          <div class="layer-3d z-accent w-30 h-20 pointer-events-none flex items-start justify-center -mt-2">
            <div class="w-6 h-3 rounded-t-md bg-gradient-to-b from-slate-200 to-slate-400 border border-slate-400 shadow-xs flex items-center justify-center">
              <div class="w-2 h-1 rounded-full bg-slate-700"></div>
            </div>
          </div>
        </div>
        <div class="floor-shadow"></div>
      </div>
    `;
  }

  // 2. Electronics / Calculator / Gadgets
  if (cat.includes("elec") || t.includes("calc") || t.includes("airpod") || t.includes("phone")) {
    return `
      <div class="stage-3d">
        <div class="object-3d float-6axis">
          <div class="layer-3d z-back w-22 h-24 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-lg"></div>
          <div class="layer-3d z-mid w-22 h-24 bg-neutral-800 rounded-2xl border border-neutral-700 p-2 flex flex-col justify-between">
            <div class="flex justify-between items-center">
              <div class="w-9 h-2.5 bg-amber-950 rounded border border-amber-800/80"></div>
              <span class="text-[7px] font-mono text-neutral-400">FX-991</span>
            </div>
          </div>
          <div class="layer-3d z-front w-22 h-24 p-2 flex flex-col justify-between pointer-events-none">
            <div class="w-full h-5 bg-emerald-950/90 rounded border border-emerald-800/80 p-1 flex items-center justify-end shadow-inner mt-3">
              <span class="text-[8px] font-mono text-emerald-400 font-bold tracking-wider">O(1) HASH</span>
            </div>
            <div class="grid grid-cols-4 gap-1 mb-1">
              <div class="h-2 rounded-xs bg-neutral-600 shadow-xs"></div>
              <div class="h-2 rounded-xs bg-neutral-600 shadow-xs"></div>
              <div class="h-2 rounded-xs bg-terracotta shadow-xs"></div>
              <div class="h-2 rounded-xs bg-forest shadow-xs"></div>
              <div class="h-2 rounded-xs bg-neutral-700 shadow-xs"></div>
              <div class="h-2 rounded-xs bg-neutral-700 shadow-xs"></div>
              <div class="h-2 rounded-xs bg-neutral-700 shadow-xs"></div>
              <div class="h-2 rounded-xs bg-neutral-700 shadow-xs"></div>
            </div>
          </div>
          <div class="layer-3d z-accent w-22 h-24 rounded-2xl pointer-events-none border border-white/20 shadow-inner"></div>
        </div>
        <div class="floor-shadow"></div>
      </div>
    `;
  }

  // 3. Campus Keys
  if (cat.includes("key") || t.includes("key")) {
    return `
      <div class="stage-3d">
        <div class="object-3d float-6axis">
          <div class="layer-3d z-back w-16 h-16 rounded-full border-4 border-slate-400 shadow-md"></div>
          <div class="layer-3d z-mid w-24 h-7 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-sm shadow-md flex items-center pl-1 rotate-12">
            <div class="w-5 h-5 rounded-full border-2 border-amber-700 bg-amber-400 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-ivory"></div>
            </div>
            <div class="flex-1 h-2 bg-amber-500 border-t border-b border-amber-600 ml-1"></div>
          </div>
          <div class="layer-3d z-front w-22 h-6 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 rounded-sm shadow-md flex items-center pl-1 -rotate-12">
            <div class="w-5 h-5 rounded-full border-2 border-slate-500 bg-slate-200 flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-ivory"></div>
            </div>
            <div class="flex-1 h-1.5 bg-slate-300 border-t border-b border-slate-400 ml-1"></div>
          </div>
          <div class="layer-3d z-accent w-16 h-7 bg-terracotta rounded-lg shadow-lg border border-terra-d flex items-center justify-center rotate-45 ml-10">
            <span class="text-[8px] font-black text-white tracking-widest">LAB 302</span>
          </div>
        </div>
        <div class="floor-shadow"></div>
      </div>
    `;
  }

  // 4. Books / Spiral Notebook
  if (cat.includes("book") || t.includes("note") || t.includes("book")) {
    return `
      <div class="stage-3d">
        <div class="object-3d float-6axis">
          <div class="layer-3d z-back w-22 h-26 bg-forest-d rounded-r-xl border border-forest shadow-md"></div>
          <div class="layer-3d z-mid w-22 h-26 bg-ivory rounded-r-xl border-r-2 border-sand-d shadow-sm flex flex-col justify-center px-2 py-3 space-y-1.5">
            <div class="w-full h-px bg-sand-d"></div>
            <div class="w-full h-px bg-sand-d"></div>
            <div class="w-full h-px bg-sand-d"></div>
            <div class="w-full h-px bg-sand-d"></div>
          </div>
          <div class="layer-3d z-front w-22 h-26 bg-gradient-to-br from-forest to-forest-d rounded-r-xl shadow-inner p-2.5 flex flex-col justify-between">
            <div class="bg-white/90 rounded p-1 border border-sand shadow-sm">
              <p class="text-[7px] font-extrabold text-forest uppercase leading-tight">DSA NOTES</p>
              <p class="text-[6px] font-mono text-terracotta">23CS101 • C &amp; JS</p>
            </div>
            <div class="flex justify-end">
              <span class="text-[10px]">📖</span>
            </div>
          </div>
          <div class="layer-3d z-accent -ml-20 w-3 h-26 flex flex-col justify-around py-1">
            <div class="w-3 h-1.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-xs"></div>
            <div class="w-3 h-1.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-xs"></div>
            <div class="w-3 h-1.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-xs"></div>
            <div class="w-3 h-1.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-xs"></div>
            <div class="w-3 h-1.5 bg-gradient-to-r from-slate-300 to-slate-500 rounded-full shadow-xs"></div>
          </div>
        </div>
        <div class="floor-shadow"></div>
      </div>
    `;
  }

  // 5. Default: Backpack / Campus Gear
  return `
    <div class="stage-3d">
      <div class="object-3d float-6axis">
        <div class="layer-3d z-back w-22 h-24 bg-terracotta/70 rounded-2xl shadow-md border border-terra-d flex justify-between px-2 pt-2">
          <div class="w-3 h-14 bg-terra-d rounded-full"></div>
          <div class="w-3 h-14 bg-terra-d rounded-full"></div>
        </div>
        <div class="layer-3d z-mid w-24 h-24 bg-gradient-to-b from-terracotta to-terra-d rounded-3xl border border-terra-d shadow-md p-2 flex flex-col items-center">
          <div class="w-10 h-1.5 bg-black/30 rounded-full mb-1"></div>
        </div>
        <div class="layer-3d z-front w-20 h-13 bg-gradient-to-br from-terra-l to-terracotta rounded-2xl border-t border-white/30 shadow-inner flex flex-col items-center justify-center mt-7">
          <div class="w-12 h-1 bg-black/25 rounded-full mb-1"></div>
          <span class="text-[7px] font-black text-white/90 tracking-wider">CAMPUS</span>
        </div>
        <div class="layer-3d z-accent w-10 h-3 rounded-t-full border-2 border-terra-d bg-transparent -mt-24"></div>
      </div>
      <div class="floor-shadow"></div>
    </div>
  `;
}

// ============================================================
//  RENDER ACTIVE REPORTS (visionOS Glassmorphic Cards)
// ============================================================
function renderReports(items) {
  const grid = document.getElementById("reports-grid");
  if (!grid) return;

  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full visionos-panel rounded-3xl flex flex-col items-center justify-center py-20 text-gray-400 p-8">
        <svg class="w-16 h-16 mb-4 text-sand-d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M21 21l-5.197-5.197M16.804 15.804A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0011.608 10.608z"/>
        </svg>
        <p class="text-lg font-bold text-gray-800">No matching reports found</p>
        <p class="text-sm text-gray-500 mt-1">Try another search keyword or submit a new report.</p>
      </div>`;
    return;
  }

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  grid.innerHTML = items
    .map((r) => {
      const isLost = r.type === "Lost";
      const catInfo = getCategoryInfo(r.category);
      const badgeBg = isLost ? "bg-red-600/90 text-white" : "bg-forest text-white";
      const badgeDot = isLost ? "🔴" : "🟢";
      const badgeLabel = isLost ? "LOST" : "FOUND";
      const isOwner = isReportOwner(user, r);

      return `
      <div class="card-3d visionos-card rounded-3xl cursor-pointer group flex flex-col"
           onclick="showDetail('${r.id}')">

        <!-- Glass Sheen & Specular Glare Highlights -->
        <div class="glass-sheen"></div>
        <div class="specular-glare"></div>

        <!-- 3D Item Showcase Stage -->
        <div class="preserve-3d-space h-48 w-full bg-gradient-to-b ${catInfo.gradient} relative overflow-hidden flex items-center justify-center border-b border-white/40">
          <div class="depth-item w-full h-full flex items-center justify-center">
            ${create3DItemHTML(r.category, r.title)}
          </div>
        </div>

        <!-- Card Content with Z-Depth Stacking -->
        <div class="preserve-3d-space p-5 flex flex-col flex-1 relative z-30">
          <!-- Badges Row -->
          <div class="depth-badge flex items-center justify-between mb-3">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full shadow-xs ${badgeBg}">
                ${badgeDot} ${badgeLabel}
              </span>
              ${
                isOwner
                  ? `<span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">👑 Your Report</span>`
                  : ""
              }
            </div>
            <span class="text-xs text-forest font-semibold bg-white/70 px-2.5 py-0.5 rounded-full border border-sand-d">
              ${escapeHtml(r.category)}
            </span>
          </div>

          <!-- Title -->
          <h3 class="depth-title text-base font-extrabold text-gray-900 mb-1 group-hover:text-forest transition-colors">
            ${escapeHtml(r.title)}
          </h3>

          <!-- Description -->
          <p class="depth-desc text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            ${escapeHtml(r.description)}
          </p>

          <!-- Location & Date -->
          <div class="depth-meta mt-auto space-y-1.5 pt-2 border-t border-sand-d/60">
            <div class="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
              <span class="text-terracotta">📍</span>
              <span>${escapeHtml(r.location)}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span class="flex items-center gap-1">
                <span>📅</span> ${formatDate(r.timestamp)}
              </span>
              <span class="font-mono text-[10px] text-gray-400 font-bold">${escapeHtml(r.id)}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          ${
            isLost
              ? `<button onclick="event.stopPropagation(); showDetail('${r.id}')"
                  class="depth-btn mt-4 w-full visionos-btn text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer">
                  <span>${isOwner ? "Manage Your Report" : "View Details"}</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>`
              : `<div class="depth-btn mt-4 flex gap-2 w-full">
                  <button onclick="event.stopPropagation(); showDetail('${r.id}')"
                    class="flex-1 visionos-btn text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-1 cursor-pointer">
                    <span>Details</span>
                  </button>
                  ${
                    !isOwner
                      ? `<button onclick="event.stopPropagation(); openClaimModal('${r.id}')"
                          class="visionos-btn-terracotta text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                          <span>🛡️ Claim</span>
                        </button>`
                      : ""
                  }
                </div>`
          }
        </div>
      </div>`;
    })
    .join("");

  attach3DTiltListeners();
}

// ============================================================
//  MOUSE-TRACKED 3D TILT & SPECULAR GLARE
// ============================================================
function attach3DTiltListeners() {
  const cards = document.querySelectorAll(".card-3d");
  cards.forEach((card) => {
    if (card.dataset.tiltAttached) return;
    card.dataset.tiltAttached = "true";

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;

      const rotY = (px * 24).toFixed(2);
      const rotX = (-py * 24).toFixed(2);

      const glareX = ((x / rect.width) * 100).toFixed(1) + "%";
      const glareY = ((y / rect.height) * 100).toFixed(1) + "%";

      card.style.setProperty("--rotX", `${rotX}deg`);
      card.style.setProperty("--rotY", `${rotY}deg`);
      card.style.setProperty("--glareX", glareX);
      card.style.setProperty("--glareY", glareY);
      card.style.setProperty("--glareOpacity", "0.85");
    });

    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--rotX", "0deg");
      card.style.setProperty("--rotY", "0deg");
      card.style.setProperty("--glareOpacity", "0");
    });
  });
}

// ============================================================
//  ITEM DETAIL MODAL
// ============================================================
function showDetail(id) {
  const report = activeReportsList.findById(id);
  if (!report) return;

  const catInfo = getCategoryInfo(report.category);
  const isLost = report.type === "Lost";
  const badgeBg = isLost ? "bg-red-600 text-white" : "bg-forest text-white";
  const badgeDot = isLost ? "🔴" : "🟢";

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const isOwner = isReportOwner(user, report);
  const reviewerMode = typeof isReviewer === "function" ? isReviewer(user) : false;

  const container = document.getElementById("detail-content");

  // Determine actions based on report type and ownership
  let actionsHtml = "";
  let ownershipBannerHtml = "";

  if (isLost) {
    if (isOwner) {
      ownershipBannerHtml = `
        <div class="bg-amber-50 rounded-2xl p-3 mb-4 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
          <span class="text-base">👑</span>
          <div class="flex-1">
            <p class="font-black">Your Report</p>
            <p class="text-[11px] text-amber-800">You reported this lost item. When found, mark it as found to move it to resolved history, or remove it.</p>
          </div>
        </div>`;
      actionsHtml = `
        <button id="btn-detail-mark-found" onclick="triggerMarkFoundConfirm('${report.id}')"
          class="flex-1 visionos-btn text-white font-bold py-3 rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer text-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Mark as Found</span>
        </button>
        <button id="btn-detail-remove" onclick="triggerRemoveReportConfirm('${report.id}')"
          class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs">
          <span>🗑️ Remove</span>
        </button>
        <button onclick="closeDetailModal()"
          class="px-5 py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    } else if (reviewerMode) {
      ownershipBannerHtml = `
        <div class="bg-blue-50 rounded-2xl p-3 mb-4 border border-blue-200 text-xs text-blue-900 flex items-center gap-2.5">
          <span class="text-base">🛡️</span>
          <div class="flex-1">
            <p class="font-black">Reviewer / Admin View</p>
            <p class="text-[11px] text-blue-800">Reported lost by ${escapeHtml(report.creatorName || report.creatorRoll || 'Student')}. You have administrative oversight.</p>
          </div>
        </div>`;
      actionsHtml = `
        <button onclick="triggerMarkFoundConfirm('${report.id}')"
          class="flex-1 visionos-btn text-white font-bold py-3 rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer text-xs">
          <span>✨ Mark as Found</span>
        </button>
        <button onclick="triggerRemoveReportConfirm('${report.id}')"
          class="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs">
          <span>🗑️ Remove</span>
        </button>
        <button onclick="closeDetailModal()"
          class="px-5 py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    } else {
      // Regular student who is NOT the owner
      ownershipBannerHtml = `
        <div class="bg-sand/30 rounded-2xl p-3.5 mb-4 border border-sand text-xs text-gray-600 flex items-center gap-2.5">
          <span class="text-lg">ℹ️</span>
          <div>
            <p class="font-bold text-gray-800">Reported Lost by ${escapeHtml(report.creatorName || report.creatorRoll || 'a Student')}</p>
            <p class="text-[11px] text-gray-500">Only the original creator may mark this item as found or remove the report.</p>
          </div>
        </div>`;
      actionsHtml = `
        <button onclick="closeDetailModal()"
          class="w-full py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    }
  } else {
    // Found item
    if (reviewerMode) {
      actionsHtml = `
        <button onclick="closeDetailModal(); switchTab('claim-requests');"
          class="flex-1 visionos-btn text-white font-bold py-3 rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer text-xs">
          <span>📋 Review Claims</span>
        </button>
        <button onclick="closeDetailModal()"
          class="px-5 py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    } else if (isOwner) {
      ownershipBannerHtml = `
        <div class="bg-forest/10 rounded-2xl p-3 mb-4 border border-forest/20 text-xs text-forest flex items-center gap-2">
          <span>🟢</span>
          <span class="font-bold">You reported finding this item. Campus reviewers manage verification and handovers.</span>
        </div>`;
      actionsHtml = `
        <button onclick="closeDetailModal()"
          class="w-full py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    } else {
      actionsHtml = `
        <button onclick="closeDetailModal(); openClaimModal('${report.id}');"
          class="flex-1 visionos-btn-terracotta text-white font-bold py-3 rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer text-xs">
          <span>🛡️ Claim This Found Item</span>
        </button>
        <button onclick="closeDetailModal()"
          class="px-5 py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs cursor-pointer">
          Close
        </button>`;
    }
  }

  container.innerHTML = `
    <div class="h-44 -mx-6 -mt-6 rounded-t-3xl bg-gradient-to-b ${catInfo.gradient} border-b border-sand flex items-center justify-center relative overflow-hidden mb-5">
      <div class="scale-110">
        ${create3DItemHTML(report.category, report.title)}
      </div>
    </div>

    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-black ${badgeBg} px-3 py-1 rounded-full shadow-xs">
          ${badgeDot} ${report.type.toUpperCase()} ITEM
        </span>
        ${
          isOwner
            ? `<span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">👑 Your Report</span>`
            : ""
        }
      </div>
      <span class="text-xs text-gray-500 font-mono font-bold bg-ivory px-2.5 py-1 rounded-md border border-sand">
        ${escapeHtml(report.id)}
      </span>
    </div>

    <h2 class="text-xl font-extrabold text-gray-900 mb-2">${escapeHtml(report.title)}</h2>

    <div class="flex flex-wrap gap-2 mb-4">
      <span class="inline-flex items-center gap-1 text-xs text-forest bg-forest/10 px-3 py-1 rounded-lg border border-forest/20 font-semibold">
        🏷️ ${escapeHtml(report.category)}
      </span>
      <span class="inline-flex items-center gap-1 text-xs text-terracotta bg-terracotta/10 px-3 py-1 rounded-lg border border-terracotta/20 font-semibold">
        📍 ${escapeHtml(report.location)}
      </span>
      <span class="inline-flex items-center gap-1 text-xs text-gray-600 bg-sand/40 px-3 py-1 rounded-lg border border-sand font-semibold">
        📅 ${formatDateLong(report.timestamp)}
      </span>
    </div>

    <div class="bg-ivory rounded-2xl p-4 mb-4 border border-sand">
      <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Description &amp; Contact Info</h4>
      <p class="text-xs text-gray-700 leading-relaxed">${escapeHtml(report.description)}</p>
    </div>

    ${ownershipBannerHtml}

    <div class="flex gap-3">
      ${actionsHtml}
    </div>
  `;

  const modal = document.getElementById("detail-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDetailModal() {
  const modal = document.getElementById("detail-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// ============================================================
//  RECOVERY HISTORY VIEW
// ============================================================
function renderRecoveryHistory() {
  const container = document.getElementById("recovery-list");
  if (!container) return;
  const items = recoveryHistoryList.toArray();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg class="w-16 h-16 mb-4 text-sand-d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
        </svg>
        <p class="text-base font-bold text-gray-700">No recovered items yet</p>
        <p class="text-xs text-gray-400 mt-1">Items unlinked from active Linked List and moved here will show up.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-forest uppercase tracking-wider border-b border-sand pb-3 font-bold">
            <th class="pb-3 pr-4">ID</th>
            <th class="pb-3 pr-4">Item Name</th>
            <th class="pb-3 pr-4 hidden sm:table-cell">Type</th>
            <th class="pb-3 pr-4 hidden md:table-cell">Category</th>
            <th class="pb-3 pr-4 hidden md:table-cell">Location</th>
            <th class="pb-3 pr-4">Reported</th>
            <th class="pb-3">Recovered</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-l">
          ${items
            .map((r) => {
              const catInfo = getCategoryInfo(r.category);
              return `
            <tr class="hover:bg-sand/30 transition-colors">
              <td class="py-3 pr-4 font-mono text-xs text-gray-500 font-bold">${escapeHtml(r.id)}</td>
              <td class="py-3 pr-4">
                <div class="flex items-center gap-2">
                  <span class="text-base">${catInfo.emoji}</span>
                  <span class="font-bold text-gray-800">${escapeHtml(r.title)}</span>
                </div>
              </td>
              <td class="py-3 pr-4 hidden sm:table-cell">
                <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  r.type === "Lost"
                    ? "bg-red-100 text-red-700"
                    : "bg-forest/15 text-forest"
                }">${r.type === "Lost" ? "🔴" : "🟢"} ${escapeHtml(r.type)}</span>
              </td>
              <td class="py-3 pr-4 text-gray-600 font-medium hidden md:table-cell">${escapeHtml(r.category)}</td>
              <td class="py-3 pr-4 text-gray-600 font-medium hidden md:table-cell">${escapeHtml(r.location)}</td>
              <td class="py-3 pr-4 text-gray-500 text-xs">${formatDateLong(r.timestamp)}</td>
              <td class="py-3 text-forest font-semibold text-xs">${r.recoveredAt ? formatDateLong(r.recoveredAt) : "—"}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
}

// ============================================================
//  POTENTIAL MATCHES PANEL
// ============================================================
function findMatches() {
  const active = activeReportsList.toArray();
  const lostItems = active.filter((r) => r.type === "Lost");
  const foundItems = active.filter((r) => r.type === "Found");
  const matches = [];

  foundItems.forEach((f) => {
    lostItems.forEach((l) => {
      if (
        f.category.toLowerCase() === l.category.toLowerCase() &&
        f.location.toLowerCase() === l.location.toLowerCase()
      ) {
        matches.push({ found: f, lost: l });
      }
    });
  });

  return matches;
}

function renderMatches() {
  const container = document.getElementById("matches-list");
  if (!container) return;
  const matches = findMatches();

  const badge = document.getElementById("matches-badge");
  if (badge) {
    if (matches.length > 0) {
      badge.textContent = matches.length;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="visionos-panel rounded-3xl flex flex-col items-center justify-center py-16 text-gray-400 p-8">
        <svg class="w-16 h-16 mb-4 text-sand-d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
        <p class="text-base font-bold text-gray-800">No matches currently detected</p>
        <p class="text-xs text-gray-500 mt-1">Automatic matches appear when a Found item shares the same category &amp; spot as a Lost item.</p>
      </div>`;
    return;
  }

  container.innerHTML = matches
    .map((m, i) => {
      const lostCat = getCategoryInfo(m.lost.category);
      const foundCat = getCategoryInfo(m.found.category);
      return `
    <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-sand rounded-3xl p-5 shadow-sm">
      <div class="flex items-center gap-2.5 mb-4">
        <span class="flex items-center justify-center w-7 h-7 rounded-full bg-terracotta text-white text-xs font-black shadow-xs">${i + 1}</span>
        <h4 class="font-extrabold text-terracotta text-base">Match Found: Category + Location Overlap!</h4>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-white/90 rounded-2xl p-4 border border-red-200 shadow-xs">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">${lostCat.emoji}</span>
            <span class="text-[10px] font-black text-white bg-red-600 px-2.5 py-0.5 rounded-full">🔴 LOST</span>
            <span class="font-mono text-[10px] text-gray-400 ml-auto">${escapeHtml(m.lost.id)}</span>
          </div>
          <p class="font-extrabold text-gray-900">${escapeHtml(m.lost.title)}</p>
          <p class="text-xs text-gray-500 mt-1">📍 ${escapeHtml(m.lost.location)} · 📅 ${formatDate(m.lost.timestamp)}</p>
        </div>
        <div class="bg-white/90 rounded-2xl p-4 border border-forest/30 shadow-xs">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">${foundCat.emoji}</span>
            <span class="text-[10px] font-black text-white bg-forest px-2.5 py-0.5 rounded-full">🟢 FOUND</span>
            <span class="font-mono text-[10px] text-gray-400 ml-auto">${escapeHtml(m.found.id)}</span>
          </div>
          <p class="font-extrabold text-gray-900">${escapeHtml(m.found.title)}</p>
          <p class="text-xs text-gray-500 mt-1">📍 ${escapeHtml(m.found.location)} · 📅 ${formatDate(m.found.timestamp)}</p>
        </div>
      </div>
      <p class="text-xs text-forest mt-3 font-bold flex items-center gap-1.5">
        <span>🔗</span> Both indexed in <strong>${escapeHtml(m.found.category)}</strong> at <strong>${escapeHtml(m.found.location)}</strong>
      </p>
    </div>`;
    })
    .join("");
}

// ============================================================
//  CORE OPERATIONS: Add Report, Recover, Search
// ============================================================
function addReport(formData) {
  const user = getCurrentUser();
  const report = {
    id: generateId(),
    type: formData.type,
    title: formData.title.trim(),
    category: formData.category,
    location: formData.location.trim(),
    description: formData.description.trim(),
    creatorId: user ? user.id : null,
    creatorRoll: user ? user.rollNo : null,
    creatorName: user ? user.name : null,
    status: "Active",
    timestamp: new Date().toISOString(),
  };

  // Singly Linked List — O(1) prepend
  activeReportsList.insertAtHead(report);

  // Hash Table — index category and title keywords
  categoryHashTable.insert(report.category, report);
  report.title
    .toLowerCase()
    .split(/\s+/)
    .forEach((word) => {
      if (word.length > 1) categoryHashTable.insert(word, report);
    });

  saveToLocalStorage();
  refreshAll();

  // Instant opposite type match alert
  const oppositeType = report.type === "Lost" ? "Found" : "Lost";
  const categoryMatches = categoryHashTable
    .search(report.category)
    .filter(
      (r) =>
        r.type === oppositeType &&
        r.location.toLowerCase() === report.location.toLowerCase() &&
        r.id !== report.id
    );

  if (categoryMatches.length > 0) {
    showToast(
      `🔗 Match detected! ${categoryMatches.length} ${oppositeType.toLowerCase()} item(s) in "${report.category}" at "${report.location}".`,
      "match"
    );
    switchTab("matches");
  } else {
    showToast(`✅ ${report.type} report posted: ${report.title}`, "success");
  }

  return report;
}

function markRecovered(id) {
  const report = activeReportsList.findById(id);
  if (!report) return;

  const user = getCurrentUser();

  // Enforce role and ownership authorization checks
  if (report.type === "Lost") {
    if (!isReportOwner(user, report) && !isReviewer(user)) {
      showToast("Unauthorized: Only the creator of this lost item report can mark it as recovered or found.", "error");
      return;
    }
  } else if (report.type === "Found") {
    if (!isReviewer(user)) {
      showToast("Unauthorized: Only authorized reviewers can mark found items as recovered.", "error");
      return;
    }
  }

  // Snapshot before removal for undo stack
  const reportSnapshot = JSON.parse(JSON.stringify(report));
  const invalidatedClaims = (typeof allClaims !== "undefined" && Array.isArray(allClaims))
    ? allClaims
        .filter((c) => c.itemId === id && c.status === "Pending")
        .map((c) => ({
          id: c.id,
          previousStatus: c.status,
          previousRejectionReason: c.rejectionReason,
          previousReviewedAt: c.reviewedAt,
          previousReviewedBy: c.reviewedBy,
        }))
    : [];

  if (typeof recordAdminAction === "function" && isReviewer(user)) {
    recordAdminAction(
      "DIRECT_RECOVERY",
      `Marked "${report.title}" as recovered`,
      {
        itemId: id,
        itemTitle: report.title,
        reportSnapshot: reportSnapshot,
        invalidatedClaims: invalidatedClaims,
      }
    );
  }

  activeReportsList.removeById(id);
  report.status = "Recovered";
  report.recoveredAt = new Date().toISOString();

  recoveryHistoryList.insertAtHead(report);
  categoryHashTable.removeById(id);

  // Invalidate any active pending claims for this recovered item
  if (typeof allClaims !== "undefined" && Array.isArray(allClaims)) {
    allClaims.forEach((c) => {
      if (c.itemId === id && c.status === "Pending") {
        c.status = "Rejected";
        c.reviewedAt = new Date().toISOString();
        c.rejectionReason = "Item was marked as recovered and removed from active listings.";
        if (typeof pendingClaimQueue !== "undefined" && pendingClaimQueue.removeById) {
          pendingClaimQueue.removeById(c.id);
        }
      }
    });
    if (typeof saveClaimsToLocalStorage === "function") {
      saveClaimsToLocalStorage();
    }
  }

  saveToLocalStorage();
  refreshAll();
  showToast(`🎉 "${report.title}" marked as recovered!`, "success");
}

// State variables for report modal confirmations
let pendingMarkFoundId = null;
let pendingRemoveReportId = null;

function triggerMarkFoundConfirm(id) {
  const report = activeReportsList.findById(id);
  if (!report) return;

  const user = getCurrentUser();
  if (!isReportOwner(user, report) && !isReviewer(user)) {
    showToast("Unauthorized: Only the creator of this report can mark it as found.", "error");
    return;
  }

  pendingMarkFoundId = id;
  const titleEl = document.getElementById("mark-found-modal-item-title");
  const idEl = document.getElementById("mark-found-modal-item-id");
  const ownerEl = document.getElementById("mark-found-modal-item-owner");
  if (titleEl) titleEl.textContent = report.title;
  if (idEl) idEl.textContent = report.id;
  if (ownerEl) {
    ownerEl.textContent = report.creatorName
      ? `${report.creatorName} (${report.creatorRoll || ''})`
      : (report.creatorRoll || 'Report Owner');
  }

  closeDetailModal();
  const modal = document.getElementById("mark-found-confirm-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeMarkFoundConfirmModal() {
  pendingMarkFoundId = null;
  const modal = document.getElementById("mark-found-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function confirmMarkLostItemFound() {
  if (!pendingMarkFoundId) return;
  const id = pendingMarkFoundId;
  closeMarkFoundConfirmModal();
  markLostItemFound(id);
}

function markLostItemFound(id) {
  const report = activeReportsList.findById(id);
  if (!report) {
    showToast("Report not found or already resolved.", "error");
    return;
  }

  const user = getCurrentUser();
  if (!isReportOwner(user, report) && !isReviewer(user)) {
    showToast("Unauthorized: Only the creator of this report can mark it as found.", "error");
    return;
  }

  activeReportsList.removeById(id);
  report.status = "Found";
  report.resolvedAt = new Date().toISOString();
  report.recoveredAt = report.resolvedAt;
  report.resolvedBy = user ? (user.name || user.rollNo || user.id) : "Owner";

  recoveryHistoryList.insertAtHead(report);
  categoryHashTable.removeById(id);

  // Invalidate any active pending claims if any existed
  if (typeof allClaims !== "undefined" && Array.isArray(allClaims)) {
    allClaims.forEach((c) => {
      if (c.itemId === id && c.status === "Pending") {
        c.status = "Cancelled";
        c.rejectionReason = "Item was marked as found by its owner.";
        if (typeof pendingClaimQueue !== "undefined" && pendingClaimQueue.removeById) {
          pendingClaimQueue.removeById(c.id);
        }
      }
    });
    if (typeof saveClaimsToLocalStorage === "function") {
      saveClaimsToLocalStorage();
    }
  }

  saveToLocalStorage();
  refreshAll();
  showToast(`🎉 "${report.title}" marked as found! Moved to resolved history.`, "success");
}

function triggerRemoveReportConfirm(id) {
  const report = activeReportsList.findById(id);
  if (!report) return;

  const user = getCurrentUser();
  if (!isReportOwner(user, report) && !isReviewer(user)) {
    showToast("Unauthorized: Only the report creator can remove this report.", "error");
    return;
  }

  pendingRemoveReportId = id;
  const titleEl = document.getElementById("remove-report-modal-item-title");
  const idEl = document.getElementById("remove-report-modal-item-id");
  if (titleEl) titleEl.textContent = report.title;
  if (idEl) idEl.textContent = report.id;

  closeDetailModal();
  const modal = document.getElementById("remove-report-confirm-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeRemoveReportConfirmModal() {
  pendingRemoveReportId = null;
  const modal = document.getElementById("remove-report-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function confirmRemoveReport() {
  if (!pendingRemoveReportId) return;
  const id = pendingRemoveReportId;
  closeRemoveReportConfirmModal();
  removeReport(id);
}

function removeReport(id) {
  const report = activeReportsList.findById(id);
  if (!report) {
    showToast("Report not found.", "error");
    return;
  }

  const user = getCurrentUser();
  if (!isReportOwner(user, report) && !isReviewer(user)) {
    showToast("Unauthorized: Only the report creator can remove this report.", "error");
    return;
  }

  activeReportsList.removeById(id);
  categoryHashTable.removeById(id);

  report.status = "Removed";
  report.removedAt = new Date().toISOString();
  report.removedBy = user ? (user.name || user.rollNo || user.id) : "Owner";

  // Data integrity: update any associated pending claims safely
  if (typeof allClaims !== "undefined" && Array.isArray(allClaims)) {
    allClaims.forEach((c) => {
      if (c.itemId === id && c.status === "Pending") {
        c.status = "Cancelled";
        c.rejectionReason = "Report was removed by its creator.";
        if (typeof pendingClaimQueue !== "undefined" && pendingClaimQueue.removeById) {
          pendingClaimQueue.removeById(c.id);
        }
      }
    });
    if (typeof saveClaimsToLocalStorage === "function") {
      saveClaimsToLocalStorage();
    }
  }

  saveToLocalStorage();
  refreshAll();
  showToast(`🗑️ Report "${report.title}" removed successfully.`, "info");
}

function searchAndFilter() {
  const searchInput = document.getElementById("search-input");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const catFilter = document.getElementById("filter-category");
  const categoryFilter = catFilter ? catFilter.value : "All";
  const tFilter = document.getElementById("filter-type");
  const typeFilter = tFilter ? tFilter.value : "All";

  let results;

  if (query.length > 0) {
    // Hash Table O(1) average lookup
    const hashResults = categoryHashTable.search(query);

    // ID prefix and text substring checks
    const allActive = activeReportsList.toArray();
    const extraMatches = allActive.filter(
      (r) =>
        r.id.toLowerCase().includes(query) ||
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query)
    );

    const seen = new Set();
    results = [];
    [...hashResults, ...extraMatches].forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        results.push(r);
      }
    });
  } else {
    results = activeReportsList.toArray();
  }

  if (categoryFilter !== "All") {
    results = results.filter((r) => r.category === categoryFilter);
  }

  if (typeFilter !== "All") {
    results = results.filter((r) => r.type === typeFilter);
  }

  renderReports(results);
}

// ----- Tab Switching ----------------------------------------
function switchTab(tabName) {
  if (tabName === "claim-requests") {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    const reviewerMode = typeof isReviewer === "function" && isReviewer(user);
    if (!reviewerMode) {
      if (typeof showToast === "function") {
        showToast("Access Restricted: Reviewer authorization required.", "error");
      }
      tabName = "reports";
    }
  }

  const tabs = ["reports", "matches", "recovery", "my-claims", "claim-requests"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const panel = document.getElementById(`tab-panel-${t}`);
    if (!btn || !panel) return;

    if (t === tabName) {
      btn.classList.add("border-forest", "text-forest", "font-bold");
      btn.classList.remove("border-transparent", "text-gray-500");
      panel.classList.remove("hidden");
    } else {
      btn.classList.remove("border-forest", "text-forest", "font-bold");
      btn.classList.add("border-transparent", "text-gray-500");
      panel.classList.add("hidden");
    }
  });
}

// ----- Toast Notifications ----------------------------------
function showToast(message, type = "success") {
  if (typeof window !== "undefined" && typeof window.onToast === "function") {
    window.onToast(message, type);
  }
  const container = document.getElementById("toast-container");
  if (!container || typeof container.appendChild !== "function") return;
  const toast = document.createElement("div");

  const colors = {
    success: "bg-forest",
    match: "bg-terracotta",
    error: "bg-red-700",
  };

  toast.className = `${colors[type] || colors.success} text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transform translate-x-full opacity-0 transition-all duration-300 border border-white/20 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      toast.classList.remove("translate-x-full", "opacity-0");
    });
  } else {
    toast.classList.remove("translate-x-full", "opacity-0");
  }

  setTimeout(() => {
    toast.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----- Post Item Modal Controls -----------------------------
function openModal() {
  const modal = document.getElementById("report-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  const titleInput = document.getElementById("input-title");
  if (titleInput) titleInput.focus();
}

function closeModal() {
  const modal = document.getElementById("report-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  const form = document.getElementById("report-form");
  if (form) form.reset();
}

// ----- Refresh All Views ------------------------------------
function refreshAll() {
  updateStats();
  searchAndFilter();
  renderMatches();
  renderRecoveryHistory();
  if (typeof renderClaimsUI === "function") {
    renderClaimsUI();
  }
}

// ============================================================
//  DOM INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Load data from localStorage
  loadFromLocalStorage();

  // Render initial view (Explore or Dashboard depending on auth)
  renderAppView();

  // Auth Form Submit
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const errorBox = document.getElementById("auth-error");
      errorBox.classList.add("hidden");

      const rollNo = document.getElementById("auth-roll").value.trim();
      const password = document.getElementById("auth-password").value;

      if (authMode === "signup") {
        const name = document.getElementById("auth-name").value.trim();
        const confirm = document.getElementById("auth-confirm").value;

        if (password !== confirm) {
          errorBox.textContent = "Passwords do not match.";
          errorBox.classList.remove("hidden");
          return;
        }
        if (password.length < 6) {
          errorBox.textContent = "Password must be at least 6 characters.";
          errorBox.classList.remove("hidden");
          return;
        }

        const res = registerUser(name, rollNo, password);
        if (res.success) {
          closeAuthModal();
          renderAppView();
          showToast(`Account created! Welcome, ${res.user.name}.`, "success");
        } else {
          errorBox.textContent = res.message;
          errorBox.classList.remove("hidden");
        }
      } else {
        const res = loginUser(rollNo, password);
        if (res.success) {
          closeAuthModal();
          renderAppView();
          showToast(`Welcome back, ${res.user.name}!`, "success");
        } else {
          errorBox.textContent = res.message;
          errorBox.classList.remove("hidden");
        }
      }
    });
  }

  // Logout Button
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", logoutUser);
  }

  // Auth Modal Backdrop Close
  const authBackdrop = document.getElementById("auth-backdrop");
  if (authBackdrop) {
    authBackdrop.addEventListener("click", closeAuthModal);
  }

  // Post Report Form Submit
  const reportForm = document.getElementById("report-form");
  if (reportForm) {
    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      addReport({
        type: fd.get("report-type") || "Lost",
        title: fd.get("title"),
        category: fd.get("category"),
        location: fd.get("location"),
        description: fd.get("description"),
      });
      closeModal();
    });
  }

  // Search & Filter listeners
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", searchAndFilter);

  const filterCategory = document.getElementById("filter-category");
  if (filterCategory) filterCategory.addEventListener("change", searchAndFilter);

  const filterType = document.getElementById("filter-type");
  if (filterType) filterType.addEventListener("change", searchAndFilter);

  // Tab Buttons
  const tabReports = document.getElementById("tab-btn-reports");
  if (tabReports) tabReports.addEventListener("click", () => switchTab("reports"));

  const tabMatches = document.getElementById("tab-btn-matches");
  if (tabMatches) tabMatches.addEventListener("click", () => switchTab("matches"));

  const tabRecovery = document.getElementById("tab-btn-recovery");
  if (tabRecovery) tabRecovery.addEventListener("click", () => switchTab("recovery"));

  const tabMyClaims = document.getElementById("tab-btn-my-claims");
  if (tabMyClaims) tabMyClaims.addEventListener("click", () => switchTab("my-claims"));

  const tabClaimRequests = document.getElementById("tab-btn-claim-requests");
  if (tabClaimRequests) tabClaimRequests.addEventListener("click", () => switchTab("claim-requests"));

  // Modal Controls
  const btnOpenModal = document.getElementById("btn-open-modal");
  if (btnOpenModal) btnOpenModal.addEventListener("click", openModal);

  const btnCloseModal = document.getElementById("btn-close-modal");
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeModal);

  const modalBackdrop = document.getElementById("modal-backdrop");
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);

  const detailBackdrop = document.getElementById("detail-backdrop");
  if (detailBackdrop) detailBackdrop.addEventListener("click", closeDetailModal);

  // Escape key closes open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeDetailModal();
      closeAuthModal();
      closeMarkFoundConfirmModal();
      closeRemoveReportConfirmModal();
    }
  });
});

// Explicit global exports for inline event handlers and console access
window.triggerMarkFoundConfirm = triggerMarkFoundConfirm;
window.confirmMarkLostItemFound = confirmMarkLostItemFound;
window.closeMarkFoundConfirmModal = closeMarkFoundConfirmModal;
window.triggerRemoveReportConfirm = triggerRemoveReportConfirm;
window.confirmRemoveReport = confirmRemoveReport;
window.closeRemoveReportConfirmModal = closeRemoveReportConfirmModal;
window.markLostItemFound = markLostItemFound;
window.removeReport = removeReport;
window.markRecovered = markRecovered;
window.isReportOwner = isReportOwner;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.addReport = addReport;
window.showDetail = showDetail;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.getActiveReportsList = () => activeReportsList;
window.getRecoveryHistoryList = () => recoveryHistoryList;
window.getCategoryHashTable = () => categoryHashTable;
window.isReviewer = isReviewer;
window.showToast = showToast;
window.formatDate = formatDate;
window.formatDateLong = formatDateLong;
window.refreshAll = refreshAll;
