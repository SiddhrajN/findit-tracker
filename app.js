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
let activePriorityQueue = new PriorityQueue();
let recoveryHistoryList = new LinkedList();
let categoryHashTable = new HashTable();
let reportCounter = 1000;
let adminMode = true; // Admin privileges enabled for Campus Lost & Found administrators
let heapInspectorOpen = false;

// ----- Priority Levels Configuration & Visual Mapping ------
const PRIORITY_CONFIG = {
  3: {
    level: 3,
    key: "urgent",
    name: "Urgent",
    label: "URGENT",
    icon: "🚨",
    badgeBg: "bg-red-600 text-white shadow-xs shadow-red-500/30 ring-1 ring-red-400/40",
    pillBg: "bg-red-50 text-red-700 border border-red-200",
    borderHighlight: "border-red-400/80 shadow-md shadow-red-500/10",
    glowDot: "bg-red-500",
    desc: "Critical items: College IDs, Wallets, Keys, Essential Official Belongings",
  },
  2: {
    level: 2,
    key: "medium",
    name: "Medium",
    label: "MEDIUM",
    icon: "⚡",
    badgeBg: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
    pillBg: "bg-amber-50 text-amber-800 border border-amber-200",
    borderHighlight: "border-amber-300",
    glowDot: "bg-amber-400",
    desc: "Electronics, Calculators, Audio devices, Textbooks",
  },
  1: {
    level: 1,
    key: "low",
    name: "Low",
    label: "LOW",
    icon: "🟢",
    badgeBg: "bg-stone-500 text-white shadow-xs",
    pillBg: "bg-stone-100 text-stone-700 border border-stone-200",
    borderHighlight: "border-sand-d",
    glowDot: "bg-stone-400",
    desc: "Standard items: Stationery, Umbrellas, Water bottles, Accessories",
  },
};

function getPriorityInfo(priority) {
  const p = Number(priority) || 1;
  return PRIORITY_CONFIG[p] || PRIORITY_CONFIG[1];
}

function autoDetectPriority(title = "", category = "") {
  const combined = `${title} ${category}`.toLowerCase();
  if (
    combined.includes("id") ||
    combined.includes("card") ||
    combined.includes("wallet") ||
    combined.includes("key") ||
    combined.includes("license") ||
    combined.includes("passport") ||
    combined.includes("aadhaar") ||
    category === "ID/Wallet" ||
    category === "Keys"
  ) {
    return 3; // Urgent
  }
  if (
    combined.includes("calc") ||
    combined.includes("phone") ||
    combined.includes("laptop") ||
    combined.includes("airpod") ||
    combined.includes("headphone") ||
    combined.includes("charger") ||
    combined.includes("watch") ||
    category === "Electronics"
  ) {
    return 2; // Medium
  }
  return 1; // Low
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

// ----- Initial Campus Seed Data -----------------------------
const SEED_DATA = [
  {
    id: "REP-1001",
    type: "Lost",
    title: "Black Leather Wallet",
    category: "ID/Wallet",
    location: "Canteen",
    description: "Contains campus student ID card and cash. Contact Roll No: 23CS101 (Siddhraj Nimje).",
    priority: 3, // Urgent: College ID & Cash
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
    priority: 2, // Medium
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
    priority: 1, // Low
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
    priority: 3, // Urgent: Vehicle keys
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
    priority: 2, // Medium
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
    priority: 3, // Urgent: Official College ID Card
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
    let activeArr = JSON.parse(activeRaw);
    let migrated = false;
    // Upgrade existing stored records if missing priority
    activeArr = activeArr.map((item) => {
      if (!item.priority) {
        item.priority = autoDetectPriority(item.title, item.category);
        migrated = true;
      }
      return item;
    });

    activeReportsList = LinkedList.fromArray(activeArr);
    activePriorityQueue = PriorityQueue.fromReports(activeArr);
    categoryHashTable = HashTable.fromReports(activeArr);
    reportCounter = counterRaw ? parseInt(counterRaw, 10) : 1000 + activeArr.length;

    if (migrated) {
      saveToLocalStorage();
    }
  } else {
    activePriorityQueue = new PriorityQueue();
    SEED_DATA.forEach((item) => {
      activeReportsList.insertAtHead(item);
      activePriorityQueue.insert(item, item.priority || 1);
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
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ id: user.id, name: user.name, rollNo: user.rollNo })
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
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ----- Stats Counter & Heap Status ------------------------
function updateStats() {
  const all = activeReportsList.toArray();
  const lostCount = all.filter((r) => r.type === "Lost").length;
  const foundCount = all.filter((r) => r.type === "Found").length;
  const recoveredCount = recoveryHistoryList.length;
  const urgentCount = all.filter((r) => r.priority === 3).length;

  const statLost = document.getElementById("stat-lost");
  const statFound = document.getElementById("stat-found");
  const statRecovered = document.getElementById("stat-recovered");
  const statUrgent = document.getElementById("stat-urgent");

  if (statLost) statLost.textContent = lostCount;
  if (statFound) statFound.textContent = foundCount;
  if (statRecovered) statRecovered.textContent = recoveredCount;
  if (statUrgent) statUrgent.textContent = urgentCount;

  // Update Priority Queue Console Desk
  const pqHeapCount = document.getElementById("pq-heap-count");
  const pqUrgentCount = document.getElementById("pq-urgent-count");
  const pqTopTitle = document.getElementById("pq-top-title");
  const pqTopBadge = document.getElementById("pq-top-badge");

  if (pqHeapCount) pqHeapCount.textContent = activePriorityQueue.size();
  if (pqUrgentCount) pqUrgentCount.textContent = urgentCount;

  const topReport = activePriorityQueue.peek();
  if (topReport) {
    const pInfo = getPriorityInfo(topReport.priority);
    if (pqTopTitle) pqTopTitle.textContent = `[${topReport.id}] ${topReport.title} — ${topReport.location}`;
    if (pqTopBadge) {
      pqTopBadge.className = `inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full ${pInfo.badgeBg}`;
      pqTopBadge.innerHTML = `<span>${pInfo.icon}</span> <span>${pInfo.label} (Level ${pInfo.level})</span>`;
      pqTopBadge.classList.remove("hidden");
    }
  } else {
    if (pqTopTitle) pqTopTitle.textContent = "Queue Empty (No active reports to process)";
    if (pqTopBadge) pqTopBadge.classList.add("hidden");
  }

  if (heapInspectorOpen) {
    renderHeapInspector();
  }
}

// ----- Admin Controls & Priority Queue Actions --------------
function toggleAdminMode() {
  adminMode = !adminMode;
  const btnText = document.getElementById("admin-toggle-label");
  const btn = document.getElementById("btn-admin-toggle");
  if (btnText) {
    btnText.textContent = adminMode ? "Admin: Active" : "Admin: Off";
  }
  if (btn) {
    if (adminMode) {
      btn.className = "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border transition-all bg-forest/10 border-forest/30 text-forest hover:bg-forest hover:text-white shadow-xs";
    } else {
      btn.className = "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border transition-all bg-stone-100 border-stone-300 text-stone-500 hover:bg-stone-200 shadow-xs";
    }
  }
  refreshAll();
  showToast(
    adminMode
      ? "🛡️ Admin mode active: priority adjustment and high-priority processing enabled."
      : "👤 Switched to standard student view (read-only priority tags).",
    "success"
  );
}

function setReportPriority(id, newPriority) {
  const pVal = Number(newPriority) || 1;
  // 1. Binary Heap restructure: bubble-up if increased, bubble-down if decreased — O(log n)
  activePriorityQueue.changePriority(id, pVal);

  // 2. Synchronize report in Linked List
  const rep = activeReportsList.findById(id);
  if (rep) {
    rep.priority = pVal;
  }

  saveToLocalStorage();
  refreshAll();

  const pInfo = getPriorityInfo(pVal);
  showToast(
    `⭐ ${rep ? rep.title : id} priority set to ${pInfo.name} (${pInfo.icon}) — Binary Heap reorganized in O(log n)`,
    "success"
  );
}

function processHighestPriorityReport() {
  const top = activePriorityQueue.peek();
  if (!top) {
    showToast("⚠️ Priority Queue is empty. No reports to process.", "error");
    return;
  }
  showDetail(top.id, /* isProcessingMode = */ true);
  const pInfo = getPriorityInfo(top.priority);
  showToast(
    `⚡ Processing highest-priority item from Binary Heap: [${top.id}] ${top.title} (${pInfo.name})`,
    "match"
  );
}

function toggleHeapInspector() {
  heapInspectorOpen = !heapInspectorOpen;
  const panel = document.getElementById("heap-inspector-panel");
  const chevron = document.getElementById("heap-chevron");
  if (!panel) return;

  if (heapInspectorOpen) {
    panel.classList.remove("hidden");
    if (chevron) chevron.classList.add("rotate-180");
    renderHeapInspector();
  } else {
    panel.classList.add("hidden");
    if (chevron) chevron.classList.remove("rotate-180");
  }
}

function renderHeapInspector() {
  const arrayContainer = document.getElementById("heap-array-view");
  const treeContainer = document.getElementById("heap-tree-view");
  if (!arrayContainer || !treeContainer) return;

  const snapshot = activePriorityQueue.debugSnapshot();
  if (snapshot.length === 0) {
    arrayContainer.innerHTML = `<span class="text-xs text-gray-400 italic">Binary Heap is currently empty.</span>`;
    treeContainer.innerHTML = `<span class="text-xs text-gray-400 italic">Binary Heap is currently empty.</span>`;
    return;
  }

  // 1. Array Memory Representation
  arrayContainer.innerHTML = snapshot
    .map((node) => {
      const pInfo = getPriorityInfo(node.priority);
      const nodeClass =
        node.priority === 3
          ? "heap-node-urgent"
          : node.priority === 2
          ? "heap-node-medium"
          : "heap-node-low";

      return `
      <div class="flex flex-col items-center">
        <div class="${nodeClass} rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
          <span class="heap-pill-badge">[${node.index}]</span>
          <span class="text-xs font-black truncate max-w-[130px]">${escapeHtml(node.title)}</span>
          <span class="text-[10px] font-black bg-white/20 px-1 rounded">${pInfo.icon} P${node.priority}</span>
        </div>
        <span class="text-[9px] text-gray-400 font-mono mt-0.5">${node.id}</span>
      </div>`;
    })
    .join("");

  // 2. Binary Tree Structure (Levels)
  const levels = [];
  let levelStart = 0;
  let levelCount = 1;
  while (levelStart < snapshot.length) {
    levels.push(snapshot.slice(levelStart, levelStart + levelCount));
    levelStart += levelCount;
    levelCount *= 2;
  }

  treeContainer.innerHTML = `
    <div class="space-y-4">
      ${levels
        .map((levelNodes, lvlIdx) => {
          return `
        <div class="flex flex-col items-center">
          <div class="text-[10px] font-mono font-bold text-gray-400 mb-1.5">
            ── Level ${lvlIdx} ${lvlIdx === 0 ? '(Root • Highest Priority)' : ''} ──
          </div>
          <div class="flex flex-wrap items-center justify-center gap-3">
            ${levelNodes
              .map((node) => {
                const pInfo = getPriorityInfo(node.priority);
                const isRoot = node.index === 0;
                return `
                <div class="p-3 rounded-2xl bg-white border ${isRoot ? 'border-red-400 ring-2 ring-red-400/40 shadow-md' : 'border-sand'} flex flex-col items-center text-center min-w-[140px] shadow-xs">
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-[10px] font-mono font-bold text-gray-400">[${node.index}]</span>
                    <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full ${pInfo.badgeBg}">${pInfo.icon} ${pInfo.label}</span>
                  </div>
                  <p class="text-xs font-bold text-gray-800 line-clamp-1">${escapeHtml(node.title)}</p>
                  <p class="text-[10px] font-mono text-terracotta font-semibold">${node.id}</p>
                  <div class="mt-1 text-[9px] text-gray-400 font-mono">
                    ${node.parentIndex !== null ? `Parent: [${node.parentIndex}]` : '<span class="text-forest font-black">HEAP ROOT</span>'}
                  </div>
                </div>`;
              })
              .join("")}
          </div>
        </div>`;
        })
        .join("")}
    </div>`;
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

  grid.innerHTML = items
    .map((r) => {
      const isLost = r.type === "Lost";
      const catInfo = getCategoryInfo(r.category);
      const prioInfo = getPriorityInfo(r.priority);
      const isUrgent = prioInfo.level === 3;
      const typeBadgeBg = isLost ? "bg-red-600/90 text-white" : "bg-forest text-white";
      const typeBadgeDot = isLost ? "🔴" : "🟢";
      const typeBadgeLabel = isLost ? "LOST" : "FOUND";

      return `
      <div class="card-3d visionos-card rounded-3xl cursor-pointer group flex flex-col ${isUrgent ? 'ring-2 ring-red-500/40 shadow-lg shadow-red-500/10' : ''}"
           onclick="showDetail('${r.id}')">

        <!-- Glass Sheen & Specular Glare Highlights -->
        <div class="glass-sheen"></div>
        <div class="specular-glare"></div>

        <!-- 3D Item Showcase Stage -->
        <div class="preserve-3d-space h-48 w-full bg-gradient-to-b ${catInfo.gradient} relative overflow-hidden flex items-center justify-center border-b border-white/40">
          <div class="depth-item w-full h-full flex items-center justify-center">
            ${create3DItemHTML(r.category, r.title)}
          </div>
          <!-- Priority Badge floating on Top-Right -->
          <div class="absolute top-3 right-3 z-30">
            <span class="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full shadow-md ${prioInfo.badgeBg}">
              <span>${prioInfo.icon}</span>
              <span>${prioInfo.label}</span>
              ${isUrgent ? '<span class="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5"></span>' : ''}
            </span>
          </div>
        </div>

        <!-- Card Content with Z-Depth Stacking -->
        <div class="preserve-3d-space p-5 flex flex-col flex-1 relative z-30">
          <!-- Badges Row -->
          <div class="depth-badge flex items-center justify-between mb-3">
            <div class="flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${typeBadgeBg}">
                ${typeBadgeDot} ${typeBadgeLabel}
              </span>
              <span class="text-xs text-forest font-semibold bg-white/70 px-2.5 py-0.5 rounded-full border border-sand-d">
                ${escapeHtml(r.category)}
              </span>
            </div>
            <span class="text-[10px] font-mono font-bold text-gray-400 bg-sand/30 px-2 py-0.5 rounded border border-sand/60">
              ${escapeHtml(r.id)}
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

          <!-- Location, Date & Priority Status -->
          <div class="depth-meta mt-auto space-y-1.5 pt-2 border-t border-sand-d/60">
            <div class="flex items-center justify-between text-xs text-gray-700 font-medium">
              <div class="flex items-center gap-1.5">
                <span class="text-terracotta">📍</span>
                <span>${escapeHtml(r.location)}</span>
              </div>
              <span class="text-[11px] font-bold ${isUrgent ? 'text-red-700' : 'text-gray-500'}">
                Priority: <span class="font-extrabold">${prioInfo.level}/3</span>
              </span>
            </div>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span class="flex items-center gap-1">
                <span>📅</span> ${formatDate(r.timestamp)}
              </span>
              <span class="text-[10px] text-gray-400 font-mono">Heap Ranked</span>
            </div>
          </div>

          ${
            adminMode
              ? `
          <!-- Admin Direct Priority Adjuster Strip -->
          <div class="mt-3 pt-2.5 border-t border-sand-d/40 flex items-center justify-between" onclick="event.stopPropagation()">
            <span class="text-[10px] font-extrabold uppercase text-forest tracking-wider flex items-center gap-1">
              <span>🛡️ Set Priority:</span>
            </span>
            <div class="inline-flex rounded-lg shadow-2xs border border-sand bg-white/90 p-0.5 text-[10px] font-bold">
              <button onclick="setReportPriority('${r.id}', 3)" title="Assign Urgent Priority (P3)"
                class="px-2 py-0.5 rounded-md transition-all ${r.priority === 3 ? 'bg-red-600 text-white font-black shadow-xs' : 'text-gray-600 hover:text-red-700 hover:bg-red-50'}">
                🚨 Urgent
              </button>
              <button onclick="setReportPriority('${r.id}', 2)" title="Assign Medium Priority (P2)"
                class="px-2 py-0.5 rounded-md transition-all ${r.priority === 2 ? 'bg-amber-500 text-white font-black shadow-xs' : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'}">
                ⚡ Med
              </button>
              <button onclick="setReportPriority('${r.id}', 1)" title="Assign Low Priority (P1)"
                class="px-2 py-0.5 rounded-md transition-all ${r.priority === 1 ? 'bg-stone-600 text-white font-black shadow-xs' : 'text-gray-600 hover:text-stone-800 hover:bg-stone-100'}">
                🟢 Low
              </button>
            </div>
          </div>
          `
              : ""
          }

          <!-- View Details Button -->
          <button onclick="event.stopPropagation(); showDetail('${r.id}')"
            class="depth-btn mt-3 w-full visionos-btn text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-1.5">
            <span>View Details &amp; Actions</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
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
function showDetail(id, isProcessingMode = false) {
  const report = activeReportsList.findById(id);
  if (!report) return;

  const catInfo = getCategoryInfo(report.category);
  const isLost = report.type === "Lost";
  const badgeBg = isLost ? "bg-red-600 text-white" : "bg-forest text-white";
  const badgeDot = isLost ? "🔴" : "🟢";
  const prioInfo = getPriorityInfo(report.priority);

  const container = document.getElementById("detail-content");
  container.innerHTML = `
    ${
      isProcessingMode
        ? `
      <div class="mb-4 -mx-6 -mt-6 p-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-t-3xl shadow-md flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">⚡</span>
          <div>
            <p class="text-xs font-black uppercase tracking-wider">Priority Queue Active Dispatch Desk</p>
            <p class="text-[11px] text-white/90">This report occupies the ROOT node of the Binary Max-Heap.</p>
          </div>
        </div>
        <span class="text-[10px] font-mono font-black bg-white/20 px-2.5 py-1 rounded-full border border-white/30">O(1) Peek</span>
      </div>
      `
        : ""
    }

    <div class="h-44 -mx-6 ${isProcessingMode ? '' : '-mt-6 rounded-t-3xl'} bg-gradient-to-b ${catInfo.gradient} border-b border-sand flex items-center justify-center relative overflow-hidden mb-5">
      <div class="scale-110">
        ${create3DItemHTML(report.category, report.title)}
      </div>
      <!-- Priority Badge on Header -->
      <div class="absolute top-3 right-3">
        <span class="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-full shadow-md ${prioInfo.badgeBg}">
          ${prioInfo.icon} ${prioInfo.label} PRIORITY
        </span>
      </div>
    </div>

    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 text-xs font-black ${badgeBg} px-3 py-1 rounded-full shadow-xs">
          ${badgeDot} ${report.type.toUpperCase()} ITEM
        </span>
        <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${prioInfo.pillBg}">
          ${prioInfo.icon} Score: ${prioInfo.level}/3
        </span>
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

    <!-- Priority Status Explanation -->
    <div class="bg-amber-50/70 rounded-2xl p-3.5 mb-4 border border-amber-200/80 text-xs">
      <div class="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
        <span>${prioInfo.icon}</span>
        <span>Priority Level: ${prioInfo.name}</span>
      </div>
      <p class="text-[11px] text-amber-800">${prioInfo.desc}</p>
    </div>

    ${
      adminMode
        ? `
    <!-- Admin Priority Assignment Panel -->
    <div class="bg-white rounded-2xl p-4 mb-5 border-2 border-forest/30 shadow-xs">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-xs font-black uppercase text-forest tracking-wide flex items-center gap-1.5">
          <span>🛡️ Admin Controls: Adjust Priority</span>
        </h4>
        <span class="text-[10px] font-mono text-gray-400">Binary Heap Rebalance</span>
      </div>
      <p class="text-[11px] text-gray-600 mb-3">
        Assign urgency to reposition this report in the Priority Queue (bubble-up/down in O(log n)).
      </p>
      <div class="grid grid-cols-3 gap-2">
        <button onclick="setReportPriority('${report.id}', 3); showDetail('${report.id}', ${isProcessingMode});"
          class="py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
            report.priority === 3
              ? 'bg-red-600 text-white border-red-700 ring-2 ring-red-400 shadow-sm'
              : 'border-sand hover:border-red-400 hover:bg-red-50 text-gray-700'
          }">
          <span>🚨 Urgent</span>
          <span class="text-[9px] opacity-80">P-Score: 3</span>
        </button>
        <button onclick="setReportPriority('${report.id}', 2); showDetail('${report.id}', ${isProcessingMode});"
          class="py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
            report.priority === 2
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400 shadow-sm'
              : 'border-sand hover:border-amber-400 hover:bg-amber-50 text-gray-700'
          }">
          <span>⚡ Medium</span>
          <span class="text-[9px] opacity-80">P-Score: 2</span>
        </button>
        <button onclick="setReportPriority('${report.id}', 1); showDetail('${report.id}', ${isProcessingMode});"
          class="py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
            report.priority === 1
              ? 'bg-stone-600 text-white border-stone-700 ring-2 ring-stone-400 shadow-sm'
              : 'border-sand hover:border-stone-400 hover:bg-stone-100 text-gray-700'
          }">
          <span>🟢 Low</span>
          <span class="text-[9px] opacity-80">P-Score: 1</span>
        </button>
      </div>
    </div>
    `
        : ""
    }

    <div class="flex gap-3">
      <button onclick="markRecovered('${report.id}'); closeDetailModal();"
        class="flex-1 visionos-btn text-white font-bold py-3 rounded-xl shadow-md transition-all hover:brightness-110 flex items-center justify-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        <span>${isProcessingMode ? 'Resolve &amp; Mark as Recovered' : 'Mark as Recovered'}</span>
      </button>
      <button onclick="closeDetailModal()"
        class="px-5 py-3 border-2 border-sand hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-white text-xs">
        Close
      </button>
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
  const detectedPrio = autoDetectPriority(formData.title, formData.category);
  const priority = Number(formData.priority) || detectedPrio;

  const report = {
    id: generateId(),
    type: formData.type,
    title: formData.title.trim(),
    category: formData.category,
    location: formData.location.trim(),
    description: formData.description.trim(),
    priority: priority,
    status: "Active",
    timestamp: new Date().toISOString(),
  };

  // 1. Singly Linked List — O(1) prepend
  activeReportsList.insertAtHead(report);

  // 2. Binary Max-Heap Priority Queue — O(log n) bubble-up insertion
  activePriorityQueue.insert(report, priority);

  // 3. Hash Table — O(1) average index by category and title keywords
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

  const prioInfo = getPriorityInfo(priority);
  if (categoryMatches.length > 0) {
    showToast(
      `🔗 Match detected! ${categoryMatches.length} ${oppositeType.toLowerCase()} item(s) in "${report.category}" at "${report.location}". Enqueued with ${prioInfo.name} Priority.`,
      "match"
    );
    switchTab("matches");
  } else {
    showToast(`✅ ${report.type} report posted with ${prioInfo.name} Priority (${prioInfo.icon}): ${report.title}`, "success");
  }

  return report;
}

function markRecovered(id) {
  const report = activeReportsList.removeById(id);
  if (!report) return;

  // Remove from Binary Heap Priority Queue — O(n + log n)
  activePriorityQueue.removeById(id);

  report.status = "Recovered";
  report.recoveredAt = new Date().toISOString();

  recoveryHistoryList.insertAtHead(report);
  categoryHashTable.removeById(id);

  saveToLocalStorage();
  refreshAll();
  showToast(`🎉 "${report.title}" marked as recovered and removed from Priority Queue!`, "success");
}

function searchAndFilter() {
  const searchInput = document.getElementById("search-input");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const catFilter = document.getElementById("filter-category");
  const categoryFilter = catFilter ? catFilter.value : "All";
  const tFilter = document.getElementById("filter-type");
  const typeFilter = tFilter ? tFilter.value : "All";
  const prioFilter = document.getElementById("filter-priority");
  const priorityFilter = prioFilter ? prioFilter.value : "All";
  const sortFilter = document.getElementById("filter-sort");
  const sortMode = sortFilter ? sortFilter.value : "priority";

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
    // When priority sort is requested, retrieve reports ranked by Binary Heap!
    if (sortMode === "priority") {
      results = activePriorityQueue.getSortedReports();
    } else {
      results = activeReportsList.toArray();
    }
  }

  // Filter by Category
  if (categoryFilter !== "All") {
    results = results.filter((r) => r.category === categoryFilter);
  }

  // Filter by Type
  if (typeFilter !== "All") {
    results = results.filter((r) => r.type === typeFilter);
  }

  // Filter by Priority Level
  if (priorityFilter !== "All") {
    const pNum = Number(priorityFilter);
    results = results.filter((r) => r.priority === pNum);
  }

  // Sorting
  if (sortMode === "priority") {
    results.sort((a, b) => {
      if ((b.priority || 1) !== (a.priority || 1)) {
        return (b.priority || 1) - (a.priority || 1);
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  } else if (sortMode === "newest") {
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else if (sortMode === "oldest") {
    results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  renderReports(results);
}

// ----- Tab Switching ----------------------------------------
function switchTab(tabName) {
  const tabs = ["reports", "matches", "recovery"];
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
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");

  const colors = {
    success: "bg-forest",
    match: "bg-terracotta",
    error: "bg-red-700",
  };

  toast.className = `${colors[type] || colors.success} text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transform translate-x-full opacity-0 transition-all duration-300 border border-white/20 pointer-events-auto`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
  });

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
  const defaultPrio = document.getElementById("prio-opt-1");
  if (defaultPrio) defaultPrio.checked = true;
}

// ----- Refresh All Views ------------------------------------
function refreshAll() {
  updateStats();
  searchAndFilter();
  renderMatches();
  renderRecoveryHistory();
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
        priority: fd.get("priority") || "1",
      });
      closeModal();
    });
  }

  // Intelligent Priority Auto-detection on Post Modal
  const inputTitle = document.getElementById("input-title");
  const selectCat = document.getElementById("input-category");
  const prioHint = document.getElementById("prio-auto-hint");

  function triggerPriorityAutoDetect() {
    const titleVal = inputTitle ? inputTitle.value : "";
    const catVal = selectCat ? selectCat.value : "";
    const detected = autoDetectPriority(titleVal, catVal);

    const optRadio = document.getElementById(`prio-opt-${detected}`);
    if (optRadio) optRadio.checked = true;

    if (prioHint) {
      if (detected === 3) {
        prioHint.innerHTML = `<span class="text-red-700 font-bold">🚨 Auto-detected URGENT:</span> Essential items (IDs, Keys, Wallets) receive peak priority in Binary Heap.`;
      } else if (detected === 2) {
        prioHint.innerHTML = `<span class="text-amber-700 font-bold">⚡ Auto-detected MEDIUM:</span> Electronics and textbooks receive medium priority.`;
      } else {
        prioHint.innerHTML = `💡 <em>Standard priority assigned. You can manually adjust options above.</em>`;
      }
    }
  }

  if (inputTitle) inputTitle.addEventListener("input", triggerPriorityAutoDetect);
  if (selectCat) selectCat.addEventListener("change", triggerPriorityAutoDetect);

  // Search & Filter listeners
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", searchAndFilter);

  const filterCategory = document.getElementById("filter-category");
  if (filterCategory) filterCategory.addEventListener("change", searchAndFilter);

  const filterType = document.getElementById("filter-type");
  if (filterType) filterType.addEventListener("change", searchAndFilter);

  const filterPriority = document.getElementById("filter-priority");
  if (filterPriority) filterPriority.addEventListener("change", searchAndFilter);

  const filterSort = document.getElementById("filter-sort");
  if (filterSort) filterSort.addEventListener("change", searchAndFilter);

  // Tab Buttons
  const tabReports = document.getElementById("tab-btn-reports");
  if (tabReports) tabReports.addEventListener("click", () => switchTab("reports"));

  const tabMatches = document.getElementById("tab-btn-matches");
  if (tabMatches) tabMatches.addEventListener("click", () => switchTab("matches"));

  const tabRecovery = document.getElementById("tab-btn-recovery");
  if (tabRecovery) tabRecovery.addEventListener("click", () => switchTab("recovery"));

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
    }
  });
});
