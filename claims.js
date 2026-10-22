// ============================================================
//  claims.js — FindIt: Claim Verification System
//  Integrated with FIFO ClaimQueue (dsa.js), Linked List & Hash Table
// ============================================================

const STORAGE_KEY_CLAIMS = "findit_claims";
const STORAGE_KEY_CLAIM_COUNTER = "findit_claim_counter";
const STORAGE_KEY_UNDO_STACK = "findit_undo_stack";

// Global Claims State
let allClaims = [];
let pendingClaimQueue = new ClaimQueue();
let adminActionStack = new ActionStack(20);
let claimCounter = 1000;
let currentClaimFilter = "All"; // "All", "Pending", "Approved", "Rejected"
let isUndoing = false;

// Fallback HTML sanitizer if app.js is not loaded first
function escapeHtml(str) {
  if (typeof str !== "string") return str == null ? "" : String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----- Role Authorization Helpers ---------------------------
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

function toggleDemoRole() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in first.", "error");
    return;
  }

  const newRole = isReviewer(user) ? "student" : "reviewer";
  user.role = newRole;

  // Persist user role in storage
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id || u.rollNo.toUpperCase() === user.rollNo.toUpperCase());
  if (idx !== -1) {
    users[idx].role = newRole;
    saveUsers(users);
  }
  setCurrentUser(user);

  updateRoleUI();

  // If switched to student while on reviewer desk, return to reports
  if (newRole === "student") {
    const tabClaimRequests = document.getElementById("tab-panel-claim-requests");
    if (tabClaimRequests && !tabClaimRequests.classList.contains("hidden")) {
      if (typeof switchTab === "function") switchTab("reports");
    }
  }

  refreshAll();
  showToast(`Switched active role to: ${newRole === "reviewer" ? "🛡️ Reviewer" : "🎒 Student"}`, "success");
}

function quickReviewerLogin() {
  const revRoll = "FAC-901";
  const revName = "Dr. Aris Thorne";
  const revPass = "campus123";
  const users = getUsers();

  let user = users.find((u) => u.rollNo === revRoll);
  if (!user) {
    user = {
      id: "USR-REV-01",
      name: revName,
      rollNo: revRoll,
      password: revPass,
      role: "reviewer",
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
  } else {
    user.role = "reviewer";
  }

  setCurrentUser(user);
  closeAuthModal();
  renderAppView();
  showToast(`Logged in as Reviewer: ${revName}!`, "success");
}

function updateRoleUI() {
  const user = getCurrentUser();
  const badge = document.getElementById("user-role-badge");
  const toggleBtn = document.getElementById("btn-toggle-role");
  const tabClaimRequests = document.getElementById("tab-btn-claim-requests");

  if (!user) return;

  const reviewerMode = isReviewer(user);
  if (badge) {
    badge.textContent = reviewerMode ? "Reviewer" : "Student";
    badge.className = reviewerMode
      ? "text-[9px] font-bold px-2 py-0.5 bg-terracotta/15 text-terracotta rounded-full border border-terracotta/25 shadow-xs"
      : "text-[9px] font-bold px-2 py-0.5 bg-forest/10 text-forest rounded-full border border-forest/20 shadow-xs";
  }

  if (toggleBtn) {
    toggleBtn.textContent = reviewerMode ? "⇄ Switch to Student" : "⇄ Switch to Reviewer";
    toggleBtn.title = reviewerMode ? "Switch to Student perspective" : "Switch to Reviewer perspective";
  }

  // Strict Privacy: Hide Reviewer Claim Desk from student tab navigation
  if (tabClaimRequests) {
    if (reviewerMode) {
      tabClaimRequests.classList.remove("hidden");
    } else {
      tabClaimRequests.classList.add("hidden");
    }
  }
}

// ----- LocalStorage Persistence & FIFO Queue Reconstruction --
function saveClaimsToLocalStorage() {
  localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(allClaims));
  localStorage.setItem(STORAGE_KEY_CLAIM_COUNTER, String(claimCounter));
}

function loadClaimsFromLocalStorage() {
  const rawClaims = localStorage.getItem(STORAGE_KEY_CLAIMS);
  const rawCounter = localStorage.getItem(STORAGE_KEY_CLAIM_COUNTER);

  if (rawClaims) {
    try {
      allClaims = JSON.parse(rawClaims);
      claimCounter = rawCounter ? parseInt(rawCounter, 10) : 1000 + allClaims.length;
    } catch (e) {
      console.error("Malformed claim storage data; resetting claims", e);
      allClaims = [];
      claimCounter = 1000;
    }
  } else {
    // Initial Seed Claims for demonstration
    allClaims = [
      {
        id: "CLM-1001",
        itemId: "REP-1002",
        itemTitle: "Casio Scientific Calculator",
        itemCategory: "Electronics",
        itemLocation: "Library 2nd Floor",
        claimantId: "USR-DEMO-2",
        claimantName: "Ananya Verma",
        claimantRollNumber: "23CS145",
        ownershipExplanation: "I lost my Casio fx-991EX calculator during study hours on the 2nd floor desk near the north window on Monday.",
        privateDetails: "There is a faint scratch on the back battery compartment and my initials 'A.V.' are inscribed with a pencil inside the hard slide-on protective lid.",
        additionalNote: "Can collect from campus lost & found anytime between 2 PM and 5 PM.",
        status: "Pending",
        submittedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
        rejectionReason: null,
        handedOverAt: null,
        handedOverBy: null,
        recoveryHistoryId: null,
      },
      {
        id: "CLM-1002",
        itemId: "REP-1006",
        itemTitle: "Student ID Card",
        itemCategory: "ID/Wallet",
        itemLocation: "Canteen",
        claimantId: "USR-DEMO-3",
        claimantName: "Priya Mohan",
        claimantRollNumber: "23CS189",
        ownershipExplanation: "I left my college ID card near counter 3 while picking up snacks after class.",
        privateDetails: "The barcode sticker on the back is slightly peeling at the top-left corner, and my department is CSE 3rd semester.",
        additionalNote: "Urgent since I need it for the computer lab entrance tomorrow.",
        status: "Pending",
        submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
        rejectionReason: null,
        handedOverAt: null,
        handedOverBy: null,
        recoveryHistoryId: null,
      }
    ];
    claimCounter = 1002;
    saveClaimsToLocalStorage();
  }

  // Reconstruct FIFO ClaimQueue from all 'Pending' claims, sorted strictly by submission time
  reconstructPendingQueue();

  // Load and reconstruct LIFO Admin Undo Stack
  loadUndoStack();
}

function reconstructPendingQueue() {
  const pendingClaims = allClaims
    .filter((c) => c.status === "Pending")
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

  pendingClaimQueue = ClaimQueue.fromArray(pendingClaims);
}

// ----- Claim Submission Workflow ----------------------------
let currentClaimReportId = null;

function openClaimModal(reportId) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to submit an ownership claim.", "error");
    openAuthModal("login");
    return;
  }

  const report = activeReportsList.findById(reportId);
  if (!report) {
    showToast("Report not found or no longer active.", "error");
    return;
  }

  if (report.type !== "Found") {
    showToast("Claims can only be filed against Found items.", "error");
    return;
  }

  if (report.status === "Recovered") {
    showToast("This item has already been marked as recovered.", "error");
    return;
  }

  // Check if current user already has a pending claim for this item
  const existingPending = allClaims.find(
    (c) =>
      c.itemId === reportId &&
      c.claimantRollNumber.toUpperCase() === user.rollNo.toUpperCase() &&
      c.status === "Pending"
  );
  if (existingPending) {
    showToast(`You already have a Pending claim (${existingPending.id}) for this item.`, "error");
    return;
  }

  // Check if user created this found report (prevent claiming own found item if creator matches)
  if (report.creatorRoll && report.creatorRoll.toUpperCase() === user.rollNo.toUpperCase()) {
    showToast("You cannot submit an ownership claim for an item you posted as found.", "error");
    return;
  }

  currentClaimReportId = reportId;

  // Populate Claim Modal Fields
  const modal = document.getElementById("claim-modal");
  const errorBox = document.getElementById("claim-form-error");
  if (errorBox) errorBox.classList.add("hidden");

  document.getElementById("claim-item-title").textContent = report.title;
  document.getElementById("claim-item-id").textContent = report.id;
  document.getElementById("claim-item-category").textContent = report.category;
  document.getElementById("claim-item-location").textContent = report.location;

  document.getElementById("claimant-name-display").textContent = user.name || "Student";
  document.getElementById("claimant-roll-display").textContent = user.rollNo || "23CS101";

  // Reset inputs
  document.getElementById("claim-explanation").value = "";
  document.getElementById("claim-details").value = "";
  document.getElementById("claim-notes").value = "";

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("claim-explanation").focus();
}

function closeClaimModal() {
  const modal = document.getElementById("claim-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  currentClaimReportId = null;
}

function handleClaimSubmit(e) {
  e.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    showToast("You must be logged in to submit a claim.", "error");
    return;
  }

  if (!currentClaimReportId) {
    showToast("No item selected for claim.", "error");
    return;
  }

  const report = activeReportsList.findById(currentClaimReportId);
  if (!report || report.status === "Recovered") {
    showToast("This item is no longer available to claim.", "error");
    closeClaimModal();
    return;
  }

  const errorBox = document.getElementById("claim-form-error");
  errorBox.classList.add("hidden");

  const explanation = document.getElementById("claim-explanation").value.trim();
  const privateDetails = document.getElementById("claim-details").value.trim();
  const notes = document.getElementById("claim-notes").value.trim();

  // Meaningful validation
  if (!explanation || explanation.length < 10) {
    errorBox.textContent = "Please provide a clear explanation of how and when you lost this item (minimum 10 characters).";
    errorBox.classList.remove("hidden");
    return;
  }

  if (!privateDetails || privateDetails.length < 5) {
    errorBox.textContent = "Please provide specific private identifying details known only to the genuine owner (minimum 5 characters).";
    errorBox.classList.remove("hidden");
    return;
  }

  // Prevent duplicate pending claims by the same user for the same item
  const duplicate = allClaims.find(
    (c) =>
      c.itemId === report.id &&
      c.claimantRollNumber.toUpperCase() === user.rollNo.toUpperCase() &&
      c.status === "Pending"
  );
  if (duplicate) {
    errorBox.textContent = `You already submitted claim ${duplicate.id} for this item. Please await review.`;
    errorBox.classList.remove("hidden");
    return;
  }

  // Generate unique claim ID
  claimCounter++;
  const newClaim = {
    id: `CLM-${claimCounter}`,
    itemId: report.id,
    itemTitle: report.title,
    itemCategory: report.category,
    itemLocation: report.location,
    claimantId: user.id || "USR-" + Date.now(),
    claimantName: user.name || "Student",
    claimantRollNumber: user.rollNo || "23CS101",
    ownershipExplanation: explanation,
    privateDetails: privateDetails,
    additionalNote: notes,
    status: "Pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    rejectionReason: null,
    handedOverAt: null,
    handedOverBy: null,
    recoveryHistoryId: null,
  };

  // Add to collection
  allClaims.push(newClaim);

  // FIFO Queue insertion — O(1)
  pendingClaimQueue.enqueue(newClaim);

  // Persist
  saveClaimsToLocalStorage();

  closeClaimModal();
  refreshAll();

  const pos = pendingClaimQueue.size();
  showToast(`🎉 Claim submitted! Your request is #${pos} in the FIFO review queue.`, "success");
}

// ----- Claim Reviewer Operations (FIFO Queue & Review Modal) --
let activeReviewClaimId = null;

function openReviewModal(claimId) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in first.", "error");
    return;
  }

  // Strict Privacy: Only authorized campus reviewers can open the review modal and view private details
  if (!isReviewer(user)) {
    showToast("Access Restricted: Only authorized campus reviewers can inspect claim evidence.", "error");
    return;
  }

  const claim = allClaims.find((c) => c.id === claimId);
  if (!claim) {
    showToast("Claim record not found.", "error");
    return;
  }

  activeReviewClaimId = claimId;
  const modal = document.getElementById("claim-review-modal");

  // Populate Claim & Item Details
  document.getElementById("review-claim-id").textContent = claim.id;
  document.getElementById("review-claim-status-badge").innerHTML = renderStatusBadgeHTML(claim.status);
  document.getElementById("review-claim-submitted").textContent = formatDateLong(claim.submittedAt);

  document.getElementById("review-item-title").textContent = claim.itemTitle;
  document.getElementById("review-item-id").textContent = claim.itemId;
  document.getElementById("review-item-category").textContent = claim.itemCategory;
  document.getElementById("review-item-location").textContent = claim.itemLocation;

  document.getElementById("review-claimant-name").textContent = claim.claimantName;
  document.getElementById("review-claimant-roll").textContent = claim.claimantRollNumber;

  document.getElementById("review-explanation-text").textContent = claim.ownershipExplanation;
  document.getElementById("review-details-text").textContent = claim.privateDetails;
  document.getElementById("review-notes-text").textContent = claim.additionalNote || "— None provided —";

  // Check queue position if Pending
  const queueArr = pendingClaimQueue.toArray();
  const queueIdx = queueArr.findIndex((c) => c.id === claim.id);
  const queuePosElement = document.getElementById("review-queue-position");
  if (queuePosElement) {
    if (claim.status === "Pending" && queueIdx !== -1) {
      queuePosElement.textContent = `#${queueIdx + 1} of ${pendingClaimQueue.size()} in FIFO Queue`;
      queuePosElement.classList.remove("hidden");
    } else {
      queuePosElement.classList.add("hidden");
    }
  }

  // Decision & Audit History Section
  const auditSection = document.getElementById("review-audit-section");
  if (claim.status !== "Pending") {
    auditSection.classList.remove("hidden");
    document.getElementById("review-decision-by").textContent = claim.reviewedBy || "Campus Reviewer";
    document.getElementById("review-decision-at").textContent = claim.reviewedAt ? formatDateLong(claim.reviewedAt) : "—";
    
    const reasonContainer = document.getElementById("review-decision-reason-container");
    const reasonTitle = document.getElementById("review-decision-reason-title");
    const reasonText = document.getElementById("review-decision-reason-text");

    if (claim.status === "Rejected") {
      reasonContainer.classList.remove("hidden");
      reasonTitle.textContent = "Rejection Reason:";
      reasonText.textContent = claim.rejectionReason || "Insufficient proof provided.";
    } else if (claim.status === "Approved") {
      reasonContainer.classList.remove("hidden");
      reasonTitle.textContent = "Reviewer Verification Note:";
      reasonText.textContent = claim.reviewNote || "Ownership verified successfully.";
    } else {
      reasonContainer.classList.add("hidden");
    }

    // Handover audit info if completed
    const handoverAudit = document.getElementById("review-handover-audit");
    if (claim.handedOverAt) {
      handoverAudit.classList.remove("hidden");
      document.getElementById("review-handover-by").textContent = claim.handedOverBy || "Authorized Staff";
      document.getElementById("review-handover-at").textContent = formatDateLong(claim.handedOverAt);
    } else {
      handoverAudit.classList.add("hidden");
    }
  } else {
    auditSection.classList.add("hidden");
  }

  // Action Buttons visibility based on status (reviewer verified)
  const pendingActions = document.getElementById("review-pending-actions");
  const handoverActions = document.getElementById("review-handover-actions");
  const nonReviewerNotice = document.getElementById("review-non-reviewer-notice");

  // Reset inputs
  const noteInput = document.getElementById("review-note-input");
  const reasonInput = document.getElementById("review-reject-reason-input");
  if (noteInput) noteInput.value = "";
  if (reasonInput) reasonInput.value = "";
  document.getElementById("reject-input-group").classList.add("hidden");
  document.getElementById("approve-input-group").classList.add("hidden");

  if (nonReviewerNotice) nonReviewerNotice.classList.add("hidden");
  if (claim.status === "Pending") {
    pendingActions.classList.remove("hidden");
    handoverActions.classList.add("hidden");
  } else if (claim.status === "Approved" && !claim.handedOverAt) {
    pendingActions.classList.add("hidden");
    handoverActions.classList.remove("hidden");
  } else {
    pendingActions.classList.add("hidden");
    handoverActions.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeReviewModal() {
  const modal = document.getElementById("claim-review-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  // Sanitize DOM fields on close so private details do not remain in memory
  const clearIds = [
    "review-claim-id", "review-item-title", "review-item-id",
    "review-claimant-name", "review-claimant-roll",
    "review-explanation-text", "review-details-text", "review-notes-text"
  ];
  clearIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  activeReviewClaimId = null;
}

function toggleApproveInput() {
  const grp = document.getElementById("approve-input-group");
  const rejectGrp = document.getElementById("reject-input-group");
  rejectGrp.classList.add("hidden");
  grp.classList.toggle("hidden");
  if (!grp.classList.contains("hidden")) {
    document.getElementById("review-note-input").focus();
  }
}

function toggleRejectInput() {
  const grp = document.getElementById("reject-input-group");
  const approveGrp = document.getElementById("approve-input-group");
  approveGrp.classList.add("hidden");
  grp.classList.toggle("hidden");
  if (!grp.classList.contains("hidden")) {
    document.getElementById("review-reject-reason-input").focus();
  }
}

function confirmApproveClaim() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Action restricted: Authorized Reviewer role required.", "error");
    return;
  }

  if (!activeReviewClaimId) return;
  const claim = allClaims.find((c) => c.id === activeReviewClaimId);
  if (!claim) return;

  if (claim.status !== "Pending") {
    showToast(`Claim ${claim.id} is already marked as ${claim.status}.`, "error");
    return;
  }

  const note = document.getElementById("review-note-input").value.trim();

  // Record undoable admin action before state mutation
  recordAdminAction(
    "APPROVE_CLAIM",
    `Approved claim ${claim.id} for "${claim.itemTitle}"`,
    {
      claimId: claim.id,
      itemId: claim.itemId,
      itemTitle: claim.itemTitle,
      previousStatus: claim.status,
      previousReviewNote: claim.reviewNote,
      previousReviewedAt: claim.reviewedAt,
      previousReviewedBy: claim.reviewedBy
    }
  );

  // Approve claim
  claim.status = "Approved";
  claim.reviewedAt = new Date().toISOString();
  claim.reviewedBy = `${user.name} (${user.rollNo})`;
  claim.reviewNote = note || "Claim evidence inspected and approved by campus reviewer.";

  // Remove from FIFO pending queue — O(n)
  pendingClaimQueue.removeById(claim.id);

  saveClaimsToLocalStorage();
  closeReviewModal();
  refreshAll();

  showToast(`✅ Claim ${claim.id} APPROVED! Ready for physical handover confirmation.`, "success");
}

function confirmRejectClaim() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Action restricted: Authorized Reviewer role required.", "error");
    return;
  }

  if (!activeReviewClaimId) return;
  const claim = allClaims.find((c) => c.id === activeReviewClaimId);
  if (!claim) return;

  if (claim.status !== "Pending") {
    showToast(`Claim ${claim.id} is already marked as ${claim.status}.`, "error");
    return;
  }

  const reason = document.getElementById("review-reject-reason-input").value.trim();
  if (!reason || reason.length < 5) {
    showToast("Please provide a meaningful rejection reason (minimum 5 characters).", "error");
    document.getElementById("review-reject-reason-input").focus();
    return;
  }

  // Record undoable admin action before state mutation
  recordAdminAction(
    "REJECT_CLAIM",
    `Rejected claim ${claim.id} for "${claim.itemTitle}"`,
    {
      claimId: claim.id,
      itemId: claim.itemId,
      itemTitle: claim.itemTitle,
      previousStatus: claim.status,
      previousRejectionReason: claim.rejectionReason,
      previousReviewedAt: claim.reviewedAt,
      previousReviewedBy: claim.reviewedBy
    }
  );

  // Reject claim
  claim.status = "Rejected";
  claim.reviewedAt = new Date().toISOString();
  claim.reviewedBy = `${user.name} (${user.rollNo})`;
  claim.rejectionReason = reason;

  // Remove from FIFO pending queue
  pendingClaimQueue.removeById(claim.id);

  saveClaimsToLocalStorage();
  closeReviewModal();
  refreshAll();

  showToast(`❌ Claim ${claim.id} has been rejected. Reason logged for claimant.`, "success");
}

// ----- Handover & Recovery Integration (Feature D) -----------
function triggerHandoverConfirmation(claimId) {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Action restricted: Authorized Reviewer role required.", "error");
    return;
  }

  const claim = allClaims.find((c) => c.id === (claimId || activeReviewClaimId));
  if (!claim) return;

  if (claim.status !== "Approved") {
    showToast("Only approved claims can proceed to physical handover.", "error");
    return;
  }

  if (claim.handedOverAt) {
    showToast("This item has already been handed over and recovered.", "error");
    return;
  }

  // Verify item is currently in active list
  const item = activeReportsList.findById(claim.itemId);
  if (!item) {
    showToast(`Item ${claim.itemId} is no longer in active reports.`, "error");
    return;
  }

  // Open Handover Confirmation Modal
  document.getElementById("handover-claim-id").textContent = claim.id;
  document.getElementById("handover-item-title").textContent = claim.itemTitle;
  document.getElementById("handover-claimant-name").textContent = `${claim.claimantName} (${claim.claimantRollNumber})`;

  const modal = document.getElementById("handover-confirm-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeHandoverConfirmModal() {
  const modal = document.getElementById("handover-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function executeHandover() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Action restricted: Authorized Reviewer role required.", "error");
    closeHandoverConfirmModal();
    return;
  }

  const claimId = document.getElementById("handover-claim-id").textContent;
  const claim = allClaims.find((c) => c.id === claimId);
  if (!claim) {
    showToast("Claim record not found.", "error");
    closeHandoverConfirmModal();
    return;
  }

  // Verify item is currently in active list and snapshot for undo
  const report = activeReportsList.findById(claim.itemId);
  if (!report) {
    showToast("Item was already removed or recovered.", "error");
    closeHandoverConfirmModal();
    return;
  }

  const reportSnapshot = JSON.parse(JSON.stringify(report));
  const competingClaims = allClaims
    .filter((c) => c.itemId === claim.itemId && c.id !== claim.id && c.status === "Pending")
    .map((c) => ({
      id: c.id,
      previousStatus: c.status,
      previousRejectionReason: c.rejectionReason,
      previousReviewedAt: c.reviewedAt,
      previousReviewedBy: c.reviewedBy
    }));

  // Record undoable admin action before mutation
  recordAdminAction(
    "HANDOVER",
    `Confirmed handover of "${claim.itemTitle}" to ${claim.claimantName}`,
    {
      itemId: claim.itemId,
      claimId: claim.id,
      itemTitle: claim.itemTitle,
      claimantName: claim.claimantName,
      reportSnapshot: reportSnapshot,
      previousClaimState: {
        status: claim.status,
        handedOverAt: claim.handedOverAt,
        handedOverBy: claim.handedOverBy,
        recoveryHistoryId: claim.recoveryHistoryId
      },
      invalidatedClaims: competingClaims
    }
  );

  // 1. Remove item from Active Reports Linked List
  activeReportsList.removeById(claim.itemId);

  const handoverTimestamp = new Date().toISOString();

  // 2. Mark report as Recovered and link claim metadata
  report.status = "Recovered";
  report.recoveredAt = handoverTimestamp;
  report.recoveredViaClaim = {
    claimId: claim.id,
    claimantName: claim.claimantName,
    claimantRoll: claim.claimantRollNumber,
    handedOverBy: `${user.name} (${user.rollNo})`,
  };

  // 3. Prepend into Recovery History Linked List — O(1)
  recoveryHistoryList.insertAtHead(report);

  // 4. Update Category Hash Table
  categoryHashTable.removeById(report.id);

  // 5. Update Claim record
  claim.handedOverAt = handoverTimestamp;
  claim.handedOverBy = `${user.name} (${user.rollNo})`;
  claim.recoveryHistoryId = report.id;

  // 6. Invalidate any other pending claims for this item (only 1 claim can result in handover)
  allClaims.forEach((otherClaim) => {
    if (otherClaim.itemId === claim.itemId && otherClaim.id !== claim.id && otherClaim.status === "Pending") {
      otherClaim.status = "Rejected";
      otherClaim.reviewedAt = handoverTimestamp;
      otherClaim.reviewedBy = `${user.name} (${user.rollNo})`;
      otherClaim.rejectionReason = `Item successfully verified and handed over to claimant ${claim.claimantName} (${claim.claimantRollNumber}) via Claim #${claim.id}.`;
      pendingClaimQueue.removeById(otherClaim.id);
    }
  });

  // 7. Persist both app storage and claims storage
  saveToLocalStorage();
  saveClaimsToLocalStorage();

  closeHandoverConfirmModal();
  closeReviewModal();
  refreshAll();

  showToast(`🎉 Handover confirmed! "${report.title}" is officially recorded as Recovered.`, "success");
}

// ----- FIFO Queue Inspector Action ---------------------------
function processNextInQueue() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Action restricted: Switch to Reviewer role to process the queue.", "error");
    return;
  }

  // Inspect front without removing
  const nextClaim = pendingClaimQueue.peek();
  if (!nextClaim) {
    showToast("The FIFO Pending Claim Queue is currently empty!", "match");
    return;
  }

  openReviewModal(nextClaim.id);
  showToast(`Inspecting Front of Queue (FIFO): Claim ${nextClaim.id}`, "success");
}

// ----- UI Rendering: Claim Requests Dashboard (Feature C) ----
function filterClaims(status) {
  currentClaimFilter = status;

  // Update pill styles
  const filterBtns = ["All", "Pending", "Approved", "Rejected"];
  filterBtns.forEach((st) => {
    const btn = document.getElementById(`filter-claim-${st.toLowerCase()}`);
    if (btn) {
      if (st === status) {
        btn.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-forest text-white shadow-xs transition-all";
      } else {
        btn.className = "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-sand text-gray-700 hover:border-forest/40 transition-all";
      }
    }
  });

  renderClaimRequests();
}

function renderClaimRequests() {
  const container = document.getElementById("claim-requests-list");
  if (!container) return;

  const user = getCurrentUser();
  const reviewerMode = isReviewer(user);

  const queueBadge = document.getElementById("claims-queue-badge");
  const queueCountText = document.getElementById("queue-count-display");
  const queueChainText = document.getElementById("queue-chain-display");
  const queueFrontText = document.getElementById("queue-front-display");

  // Strict Privacy: Only authorized campus reviewers may inspect claim requests
  if (!reviewerMode) {
    if (queueBadge) queueBadge.classList.add("hidden");
    if (queueCountText) queueCountText.textContent = "— Restricted —";
    if (queueChainText) queueChainText.textContent = "— Reviewer Authorization Required —";
    if (queueFrontText) queueFrontText.textContent = "—";
    container.innerHTML = `
      <div class="visionos-panel rounded-3xl p-12 text-center text-gray-500">
        <div class="w-16 h-16 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center text-3xl mx-auto mb-4 border border-terracotta/20">🔒</div>
        <h3 class="text-lg font-extrabold text-gray-900 mb-1">Access Restricted: Reviewer Authority Required</h3>
        <p class="text-xs text-gray-500 max-w-md mx-auto">This desk contains confidential student ownership evidence and is restricted to authorized campus reviewers and administrative staff.</p>
      </div>`;
    return;
  }

  // Update FIFO Queue Inspector Banner for authorized reviewer
  const queueSize = pendingClaimQueue.size();
  if (queueBadge) {
    queueBadge.textContent = queueSize;
    if (queueSize > 0) {
      queueBadge.classList.remove("hidden");
    } else {
      queueBadge.classList.add("hidden");
    }
  }

  if (queueCountText) queueCountText.textContent = `${queueSize} Pending`;
  if (queueChainText) queueChainText.textContent = pendingClaimQueue.toChainString();

  const nextClaim = pendingClaimQueue.peek();
  if (queueFrontText) {
    queueFrontText.textContent = nextClaim ? `${nextClaim.id} · ${nextClaim.itemTitle} (${nextClaim.claimantRollNumber})` : "None (Queue Empty)";
  }

  // Filter claims
  let filtered = allClaims;
  if (currentClaimFilter !== "All") {
    filtered = allClaims.filter((c) => c.status === currentClaimFilter);
  }

  // Sort: Pending first (submission order), then approved/rejected (most recent first)
  filtered.sort((a, b) => {
    if (a.status === "Pending" && b.status !== "Pending") return -1;
    if (a.status !== "Pending" && b.status === "Pending") return 1;
    if (a.status === "Pending" && b.status === "Pending") {
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    }
    return new Date(b.reviewedAt || b.submittedAt) - new Date(a.reviewedAt || a.submittedAt);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="visionos-panel rounded-3xl p-10 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-forest/10 flex items-center justify-center text-3xl mb-4 text-forest">🛡️</div>
        <h4 class="text-base font-bold text-gray-800">No claims match filter: ${currentClaimFilter}</h4>
        <p class="text-xs text-gray-500 max-w-sm mt-1">Claims submitted by students for found campus items will appear here for review.</p>
      </div>`;
    return;
  }

  const queueArray = pendingClaimQueue.toArray();

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${filtered
        .map((claim) => {
          const isPending = claim.status === "Pending";
          const isApproved = claim.status === "Approved";
          const isRejected = claim.status === "Rejected";
          const isHandedOver = Boolean(claim.handedOverAt);

          // Find queue position if pending
          const qIndex = isPending ? queueArray.findIndex((c) => c.id === claim.id) : -1;
          const posBadge = qIndex !== -1
            ? `<span class="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                ⚡ FIFO #${qIndex + 1}
              </span>`
            : "";

          return `
          <div class="visionos-card rounded-2xl p-5 border border-white/60 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <!-- Header Badges -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono text-xs font-black text-gray-700 bg-white/80 px-2.5 py-0.5 rounded-lg border border-sand">
                    ${escapeHtml(claim.id)}
                  </span>
                  ${renderStatusBadgeHTML(claim.status, isHandedOver)}
                  ${posBadge}
                </div>
                <span class="text-[10px] text-gray-400 font-medium">${formatDateLong(claim.submittedAt)}</span>
              </div>

              <!-- Item Information -->
              <div class="mb-3">
                <h4 class="text-base font-extrabold text-gray-900 leading-snug">${escapeHtml(claim.itemTitle)}</h4>
                <p class="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>📍 ${escapeHtml(claim.itemLocation)}</span>
                  <span>•</span>
                  <span>🏷️ ${escapeHtml(claim.itemCategory)}</span>
                  <span>•</span>
                  <span class="font-mono font-bold">${escapeHtml(claim.itemId)}</span>
                </p>
              </div>

              <!-- Claimant Information -->
              <div class="bg-white/80 rounded-xl p-3 border border-sand/60 mb-3 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500 font-medium">Claimant:</span>
                  <span class="font-bold text-gray-800">${escapeHtml(claim.claimantName)}</span>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-gray-500 font-medium">Roll Number:</span>
                  <span class="font-mono font-bold text-terracotta">${escapeHtml(claim.claimantRollNumber)}</span>
                </div>
              </div>

              <!-- Evidence snippet (Protected preview) -->
              <div class="bg-ivory/60 rounded-xl p-3 border border-sand text-xs mb-4">
                <p class="font-bold text-gray-700 uppercase text-[10px] tracking-wide mb-1">Ownership Reason:</p>
                <p class="text-gray-600 line-clamp-2">${escapeHtml(claim.ownershipExplanation)}</p>
                <p class="text-[10px] text-forest font-semibold mt-1.5 flex items-center gap-1">
                  🔒 Private details hidden (click to inspect evidence)
                </p>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="pt-3 border-t border-sand-d/40 flex items-center gap-2">
              <button onclick="openReviewModal('${claim.id}')"
                class="flex-1 visionos-btn text-white text-xs font-bold py-2.5 rounded-xl transition-all hover:brightness-110 flex items-center justify-center gap-1.5">
                <span>Inspect Evidence</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>

              ${
                reviewerMode && isApproved && !isHandedOver
                  ? `<button onclick="triggerHandoverConfirmation('${claim.id}')"
                      class="visionos-btn-terracotta text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all hover:brightness-110 flex items-center gap-1">
                      <span>🤝 Handover</span>
                    </button>`
                  : ""
              }
            </div>
          </div>`;
        })
        .join("")}
    </div>`;
}

// ----- UI Rendering: Student "My Claims" View (Feature E) ----
function renderMyClaims() {
  const container = document.getElementById("my-claims-list");
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="visionos-panel rounded-3xl p-10 flex flex-col items-center justify-center text-center">
        <p class="text-base font-bold text-gray-800">Please log in to view your submitted claims.</p>
      </div>`;
    return;
  }

  // Strict Privacy: Filter claims belonging specifically to current authenticated user
  const userRoll = (user.rollNo || "").trim().toUpperCase();
  const userId = user.id;
  const myClaims = allClaims.filter((c) => {
    const matchRoll = userRoll && c.claimantRollNumber && c.claimantRollNumber.trim().toUpperCase() === userRoll;
    const matchId = userId && c.claimantId && c.claimantId === userId;
    return Boolean(matchRoll || matchId);
  });

  // Update badge count
  const myBadge = document.getElementById("my-claims-badge");
  if (myBadge) {
    myBadge.textContent = myClaims.length;
    if (myClaims.length > 0) {
      myBadge.classList.remove("hidden");
    } else {
      myBadge.classList.add("hidden");
    }
  }

  if (myClaims.length === 0) {
    container.innerHTML = `
      <div class="visionos-panel rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-sand flex items-center justify-center text-3xl mb-4 text-terracotta">🙋</div>
        <h4 class="text-base font-bold text-gray-800">You haven't claimed any items yet</h4>
        <p class="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
          If you see an item in the <strong>All Items</strong> tab marked as <strong>Found</strong> that belongs to you, click <strong>"Claim This Item"</strong> to submit private proof.
        </p>
        <button onclick="switchTab('reports')" class="mt-5 visionos-btn text-white text-xs font-bold px-5 py-2.5 rounded-xl">
          Browse Found Items
        </button>
      </div>`;
    return;
  }

  // Sort: most recent submission first
  myClaims.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const queueArr = pendingClaimQueue.toArray();

  container.innerHTML = `
    <div class="space-y-4">
      ${myClaims
        .map((claim) => {
          const isPending = claim.status === "Pending";
          const isApproved = claim.status === "Approved";
          const isRejected = claim.status === "Rejected";
          const isHandedOver = Boolean(claim.handedOverAt);

          let statusDetailHTML = "";
          if (isPending) {
            const qIdx = queueArr.findIndex((c) => c.id === claim.id);
            const qMsg = qIdx !== -1
              ? `Waiting for reviewer verification (Position #${qIdx + 1} in FIFO Queue).`
              : "Waiting for reviewer verification.";
            statusDetailHTML = `
              <div class="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>${qMsg}</span>
              </div>`;
          } else if (isApproved && !isHandedOver) {
            statusDetailHTML = `
              <div class="mt-3 bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900">
                <p class="font-bold flex items-center gap-1.5 text-forest">
                  <span>🎉</span> Claim Approved by ${escapeHtml(claim.reviewedBy || "Reviewer")}!
                </p>
                <p class="text-emerald-700 mt-1">
                  Please visit the Campus Security / Lost &amp; Found desk with your Student ID to collect your item.
                </p>
                ${claim.reviewNote ? `<p class="mt-1.5 italic text-gray-600 bg-white/70 p-2 rounded-lg border border-emerald-200">"${escapeHtml(claim.reviewNote)}"</p>` : ""}
              </div>`;
          } else if (isApproved && isHandedOver) {
            statusDetailHTML = `
              <div class="mt-3 bg-forest/10 border border-forest/30 rounded-xl p-3 text-xs text-forest">
                <p class="font-bold flex items-center gap-1.5">
                  <span>✅</span> Handover Completed on ${formatDateLong(claim.handedOverAt)}
                </p>
                <p class="text-forest-d mt-0.5">
                  Verified &amp; released by ${escapeHtml(claim.handedOverBy || "Authorized Staff")}.
                </p>
              </div>`;
          } else if (isRejected) {
            statusDetailHTML = `
              <div class="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                <p class="font-bold flex items-center gap-1.5">
                  <span>❌</span> Claim Rejected
                </p>
                <p class="mt-1 text-red-600">
                  <strong>Reviewer feedback:</strong> ${escapeHtml(claim.rejectionReason || "Details did not match the found item.")}
                </p>
              </div>`;
          }

          return `
          <div class="visionos-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sand">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-black text-gray-700 bg-white px-2 py-0.5 rounded-md border border-sand">
                  ${escapeHtml(claim.id)}
                </span>
                <span class="text-xs text-gray-500 font-mono">Item ID: ${escapeHtml(claim.itemId)}</span>
              </div>
              <div class="flex items-center gap-2">
                ${renderStatusBadgeHTML(claim.status, isHandedOver)}
                <span class="text-xs text-gray-400">${formatDateLong(claim.submittedAt)}</span>
              </div>
            </div>

            <div class="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 class="text-base font-extrabold text-gray-900">${escapeHtml(claim.itemTitle)}</h4>
                <p class="text-xs text-gray-500 mt-0.5">
                  Category: <strong>${escapeHtml(claim.itemCategory)}</strong> · Spot: <strong>${escapeHtml(claim.itemLocation)}</strong>
                </p>
              </div>
              <button onclick="openMyClaimDetailModal('${claim.id}')"
                class="text-xs font-bold text-forest hover:text-forest-d bg-forest/10 hover:bg-forest/15 px-4 py-2 rounded-xl transition-all self-start sm:self-auto border border-forest/20">
                View My Submitted Evidence
              </button>
            </div>

            ${statusDetailHTML}
          </div>`;
        })
        .join("")}
    </div>`;
}

// ----- Modal for Claimant to inspect their own evidence --------
function openMyClaimDetailModal(claimId) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in first.", "error");
    return;
  }

  const claim = allClaims.find((c) => c.id === claimId);
  if (!claim) {
    showToast("Claim record not found.", "error");
    return;
  }

  const userRoll = (user.rollNo || "").trim().toUpperCase();
  const userId = user.id;
  const isOwner = Boolean(
    (userRoll && claim.claimantRollNumber && claim.claimantRollNumber.trim().toUpperCase() === userRoll) ||
    (userId && claim.claimantId && claim.claimantId === userId)
  );

  // Security check: only the claimant who submitted it or an authorized reviewer can view
  if (!isReviewer(user) && !isOwner) {
    showToast("Unauthorized: You cannot view another student's private claim details.", "error");
    return;
  }

  document.getElementById("my-claim-detail-id").textContent = claim.id;
  document.getElementById("my-claim-detail-title").textContent = claim.itemTitle;
  document.getElementById("my-claim-detail-status").innerHTML = renderStatusBadgeHTML(claim.status, Boolean(claim.handedOverAt));
  document.getElementById("my-claim-detail-explanation").textContent = claim.ownershipExplanation;
  document.getElementById("my-claim-detail-evidence").textContent = claim.privateDetails;
  document.getElementById("my-claim-detail-notes").textContent = claim.additionalNote || "— None —";

  const modal = document.getElementById("my-claim-detail-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeMyClaimDetailModal() {
  const modal = document.getElementById("my-claim-detail-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
  // Sanitize DOM fields on close so private details do not remain in memory
  const clearIds = [
    "my-claim-detail-id", "my-claim-detail-title",
    "my-claim-detail-explanation", "my-claim-detail-evidence", "my-claim-detail-notes"
  ];
  clearIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

// ----- Helper: Render Status Badge HTML ----------------------
function renderStatusBadgeHTML(status, isHandedOver = false) {
  if (isHandedOver) {
    return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-forest text-white shadow-xs">
      ✅ HANDED OVER
    </span>`;
  }

  switch (status) {
    case "Pending":
      return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
        ⏳ PENDING REVIEW
      </span>`;
    case "Approved":
      return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
        ✓ APPROVED
      </span>`;
    case "Rejected":
      return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
        ✕ REJECTED
      </span>`;
    default:
      return `<span class="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gray-500 text-white">
        ${escapeHtml(status)}
      </span>`;
  }
}

// ----- Master UI Refresher -----------------------------------
function renderClaimsUI() {
  updateRoleUI();
  renderClaimRequests();
  renderMyClaims();
  updateUndoUI();
}

// ============================================================
//  LIFO ADMIN UNDO STACK SUBSYSTEM
// ============================================================

function saveUndoStack() {
  try {
    localStorage.setItem(STORAGE_KEY_UNDO_STACK, JSON.stringify(adminActionStack.toArray()));
  } catch (e) {
    console.error("Failed to save undo stack to localStorage", e);
  }
}

function loadUndoStack() {
  const raw = localStorage.getItem(STORAGE_KEY_UNDO_STACK);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      adminActionStack = ActionStack.fromArray(arr, 20);
    } catch (e) {
      console.error("Malformed undo stack storage data; resetting", e);
      adminActionStack = new ActionStack(20);
    }
  } else {
    adminActionStack = new ActionStack(20);
  }
  updateUndoUI();
}

function recordAdminAction(type, description, payload) {
  const user = getCurrentUser();
  const action = {
    id: "ACT-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    type: type,
    description: description,
    timestamp: new Date().toISOString(),
    actor: {
      name: user ? user.name : "Campus Reviewer",
      rollNo: user ? user.rollNo : "FAC-901",
      role: user ? user.role : "reviewer"
    },
    payload: payload
  };

  adminActionStack.push(action);
  saveUndoStack();
  updateUndoUI();
  return action;
}

/**
 * Reverses an administrative action safely.
 * Returns { success: boolean, message: string }
 */
function executeUndo(action) {
  if (!action || !action.type || !action.payload) {
    return { success: false, message: "Invalid action record." };
  }

  const user = getCurrentUser();
  if (!isReviewer(user)) {
    return { success: false, message: "Unauthorized: Reviewer role required to undo actions." };
  }

  const { type, payload } = action;

  if (type === "APPROVE_CLAIM") {
    const claim = allClaims.find((c) => c.id === payload.claimId);
    if (!claim) {
      return { success: false, message: `Claim ${payload.claimId} no longer exists.` };
    }
    if (claim.status !== "Approved") {
      return { success: false, message: `Claim is currently marked as ${claim.status}, expected Approved.` };
    }
    if (claim.handedOverAt) {
      return { success: false, message: "Item has already been handed over. Undo the handover first." };
    }

    // Restore pre-approval state
    claim.status = payload.previousStatus || "Pending";
    claim.reviewNote = payload.previousReviewNote || null;
    claim.reviewedAt = payload.previousReviewedAt || null;
    claim.reviewedBy = payload.previousReviewedBy || null;

    reconstructPendingQueue();
    saveClaimsToLocalStorage();
    saveUndoStack();
    refreshAll();
    return {
      success: true,
      message: `Reversed approval of claim ${claim.id}. Returned to Pending review queue.`
    };
  }

  if (type === "REJECT_CLAIM") {
    const claim = allClaims.find((c) => c.id === payload.claimId);
    if (!claim) {
      return { success: false, message: `Claim ${payload.claimId} no longer exists.` };
    }
    if (claim.status !== "Rejected") {
      return { success: false, message: `Claim is currently marked as ${claim.status}, expected Rejected.` };
    }

    // Verify item is still active
    const activeItem = activeReportsList.findById(claim.itemId);
    if (!activeItem) {
      return {
        success: false,
        message: `The item (${claim.itemId}) is no longer active or was already recovered.`
      };
    }

    // Restore pre-rejection state
    claim.status = payload.previousStatus || "Pending";
    claim.rejectionReason = payload.previousRejectionReason || null;
    claim.reviewedAt = payload.previousReviewedAt || null;
    claim.reviewedBy = payload.previousReviewedBy || null;

    reconstructPendingQueue();
    saveClaimsToLocalStorage();
    saveUndoStack();
    refreshAll();
    return {
      success: true,
      message: `Reversed rejection of claim ${claim.id}. Returned to Pending review queue.`
    };
  }

  if (type === "HANDOVER") {
    const itemId = payload.itemId;
    // Remove from recovery history Linked List
    const recoveredReport = recoveryHistoryList.removeById(itemId);
    if (!recoveredReport) {
      return {
        success: false,
        message: `Report ${itemId} was not found in Recovery History.`
      };
    }

    // Prevent duplicate in active reports
    activeReportsList.removeById(itemId);

    // Re-insert into active reports Linked List — O(1) prepend
    const restoredReport = Object.assign({}, payload.reportSnapshot);
    restoredReport.status = "Active";
    delete restoredReport.recoveredAt;
    delete restoredReport.recoveredViaClaim;
    activeReportsList.insertAtHead(restoredReport);

    // Re-index into categoryHashTable
    categoryHashTable.insert(restoredReport.category, restoredReport);
    restoredReport.title.toLowerCase().split(/\s+/).forEach((w) => {
      if (w.length > 1) categoryHashTable.insert(w, restoredReport);
    });

    // Revert primary claim handover metadata
    const primaryClaim = allClaims.find((c) => c.id === payload.claimId);
    if (primaryClaim) {
      primaryClaim.status = (payload.previousClaimState && payload.previousClaimState.status) || "Approved";
      primaryClaim.handedOverAt = null;
      primaryClaim.handedOverBy = null;
      primaryClaim.recoveryHistoryId = null;
    }

    // Revert invalidated competing claims
    if (Array.isArray(payload.invalidatedClaims)) {
      payload.invalidatedClaims.forEach((inv) => {
        const c = allClaims.find((x) => x.id === inv.id);
        if (c) {
          c.status = inv.previousStatus || "Pending";
          c.rejectionReason = inv.previousRejectionReason || null;
          c.reviewedAt = inv.previousReviewedAt || null;
          c.reviewedBy = inv.previousReviewedBy || null;
        }
      });
    }

    reconstructPendingQueue();
    saveToLocalStorage();
    saveClaimsToLocalStorage();
    saveUndoStack();
    refreshAll();
    return {
      success: true,
      message: `Reversed handover: "${restoredReport.title}" restored to Active reports and claims reopened.`
    };
  }

  if (type === "DIRECT_RECOVERY") {
    const itemId = payload.itemId;
    const recoveredReport = recoveryHistoryList.removeById(itemId);
    if (!recoveredReport) {
      return {
        success: false,
        message: `Report ${itemId} was not found in Recovery History.`
      };
    }

    activeReportsList.removeById(itemId);

    const restoredReport = Object.assign({}, payload.reportSnapshot);
    restoredReport.status = "Active";
    delete restoredReport.recoveredAt;
    activeReportsList.insertAtHead(restoredReport);

    categoryHashTable.insert(restoredReport.category, restoredReport);
    restoredReport.title.toLowerCase().split(/\s+/).forEach((w) => {
      if (w.length > 1) categoryHashTable.insert(w, restoredReport);
    });

    if (Array.isArray(payload.invalidatedClaims)) {
      payload.invalidatedClaims.forEach((inv) => {
        const c = allClaims.find((x) => x.id === inv.id);
        if (c) {
          c.status = inv.previousStatus || "Pending";
          c.rejectionReason = inv.previousRejectionReason || null;
          c.reviewedAt = inv.previousReviewedAt || null;
          c.reviewedBy = inv.previousReviewedBy || null;
        }
      });
    }

    reconstructPendingQueue();
    saveToLocalStorage();
    saveClaimsToLocalStorage();
    saveUndoStack();
    refreshAll();
    return {
      success: true,
      message: `Reversed recovery: "${restoredReport.title}" restored to Active reports.`
    };
  }

  return { success: false, message: `Unsupported action type: ${type}` };
}

// ----- User Interface Handlers for Undo ----------------------

function handleUndoClick() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Unauthorized: Switch to Reviewer mode to undo administrative actions.", "error");
    return;
  }

  if (adminActionStack.isEmpty()) {
    showToast("No administrative actions available to undo.", "match");
    return;
  }

  const action = adminActionStack.peek();
  if (!action) return;

  // Populate confirmation dialog
  document.getElementById("undo-modal-action-title").textContent = action.description;
  document.getElementById("undo-modal-action-type").textContent = action.type;
  document.getElementById("undo-modal-action-time").textContent = formatDateLong(action.timestamp);

  let impactText = "";
  if (action.type === "HANDOVER") {
    impactText = "• Item will be unlinked from Recovery History and returned to Active reports in O(1).\n• Category Hash Table index will be restored.\n• Primary claim will return to Approved (awaiting handover).\n• Any competing claims closed during handover will be restored to Pending.";
  } else if (action.type === "DIRECT_RECOVERY") {
    impactText = "• Item will be removed from Recovery History and returned to Active reports in O(1).\n• Category Hash Table index will be restored.";
  } else if (action.type === "APPROVE_CLAIM") {
    impactText = "• Claim will be reverted from Approved back to Pending in the FIFO review queue.\n• Review verification notes and timestamp will be cleared.";
  } else if (action.type === "REJECT_CLAIM") {
    impactText = "• Claim will be reverted from Rejected back to Pending in the FIFO review queue.\n• Rejection reason will be cleared, making the claim eligible for review again.";
  }

  document.getElementById("undo-modal-impact-text").textContent = impactText;

  const modal = document.getElementById("undo-confirm-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeUndoConfirmModal() {
  const modal = document.getElementById("undo-confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function confirmUndoModalAction() {
  if (isUndoing) return;
  isUndoing = true;

  if (adminActionStack.isEmpty()) {
    showToast("No actions to undo.", "error");
    closeUndoConfirmModal();
    isUndoing = false;
    return;
  }

  // LIFO: Pop top action
  const action = adminActionStack.pop();
  const res = executeUndo(action);

  if (!res.success) {
    // If undo failed, re-push to preserve stack integrity
    adminActionStack.push(action);
    showToast(`Undo cancelled: ${res.message}`, "error");
  } else {
    showToast(`↶ ${res.message}`, "success");
  }

  isUndoing = false;
  closeUndoConfirmModal();
  updateUndoUI();
}

function updateUndoUI() {
  const user = getCurrentUser();
  const reviewerMode = isReviewer(user);
  const size = adminActionStack.size();
  const topAction = adminActionStack.peek();

  // Header Button
  const btnHeader = document.getElementById("btn-undo-header");
  const badgeHeader = document.getElementById("undo-stack-badge");
  if (btnHeader) {
    if (reviewerMode && size > 0) {
      btnHeader.disabled = false;
      btnHeader.title = `Undo last action: ${topAction.description}`;
      if (badgeHeader) {
        badgeHeader.textContent = size;
        badgeHeader.classList.remove("hidden");
      }
    } else {
      btnHeader.disabled = true;
      btnHeader.title = reviewerMode ? "No actions to undo" : "Switch to Reviewer mode to undo admin actions";
      if (badgeHeader) badgeHeader.classList.add("hidden");
    }
  }

  // Panel elements
  const btnPanel = document.getElementById("btn-undo-panel");
  if (btnPanel) {
    btnPanel.disabled = !reviewerMode || size === 0;
  }

  const sizeDisplay = document.getElementById("undo-stack-size-display");
  if (sizeDisplay) {
    sizeDisplay.textContent = `${size} Actions in Stack`;
  }

  const topDisplay = document.getElementById("undo-top-action-display");
  if (topDisplay) {
    topDisplay.textContent = topAction ? topAction.description : "None (Stack Empty)";
  }

  const chainDisplay = document.getElementById("undo-chain-display");
  if (chainDisplay) {
    chainDisplay.textContent = adminActionStack.toChainString();
  }

  // If History modal is currently visible, update it
  const histModal = document.getElementById("undo-history-modal");
  if (histModal && !histModal.classList.contains("hidden")) {
    renderUndoHistoryList();
  }
}

function openUndoHistoryModal() {
  renderUndoHistoryList();
  const modal = document.getElementById("undo-history-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeUndoHistoryModal() {
  const modal = document.getElementById("undo-history-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

function renderUndoHistoryList() {
  const container = document.getElementById("undo-history-list");
  if (!container) return;

  const actions = adminActionStack.toArray();
  if (actions.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-gray-400">
        <p class="font-bold text-sm text-gray-700">Action Stack is currently empty</p>
        <p class="text-xs text-gray-500 mt-1">Actions like claim reviews and handovers will be pushed to this LIFO stack.</p>
      </div>`;
    return;
  }

  container.innerHTML = actions
    .map((act, idx) => {
      const isTop = idx === 0;
      return `
      <div class="rounded-xl p-3.5 border ${
        isTop
          ? "bg-amber-50/80 border-terracotta/40 shadow-xs ring-1 ring-terracotta/20"
          : "bg-white border-sand"
      } text-xs">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
              isTop ? "bg-terracotta text-white" : "bg-sand text-gray-700"
            }">
              ${isTop ? "⚡ TOP OF STACK (Next Undo)" : `Stack Index #${actions.length - idx}`}
            </span>
            <span class="font-mono text-[10px] text-gray-500 font-bold">${escapeHtml(act.type)}</span>
          </div>
          <span class="text-[10px] text-gray-400 font-medium">${act.timestamp ? formatDateLong(act.timestamp) : "Recently"}</span>
        </div>
        <p class="font-bold text-gray-900 mt-1">${escapeHtml(act.description || act.type)}</p>
        <p class="text-[10px] text-gray-500 mt-0.5">${act.actor ? `By: ${escapeHtml(act.actor.name)} (${escapeHtml(act.actor.rollNo)})` : "By: Authorized Admin"}</p>
      </div>`;
    })
    .join("");
}

function clearUndoHistory() {
  const user = getCurrentUser();
  if (!isReviewer(user)) {
    showToast("Unauthorized: Reviewer role required.", "error");
    return;
  }

  if (adminActionStack.isEmpty()) {
    showToast("Undo stack is already empty.", "match");
    return;
  }

  adminActionStack.clear();
  saveUndoStack();
  updateUndoUI();
  closeUndoHistoryModal();
  showToast("Admin Undo Stack cleared successfully.", "success");
}

// Data Separation: Public Summary Helper (Excludes private identifying evidence)
function getSanitizedClaimSummary(claim) {
  if (!claim) return null;
  return {
    id: claim.id,
    itemId: claim.itemId,
    itemTitle: claim.itemTitle,
    itemCategory: claim.itemCategory,
    itemLocation: claim.itemLocation,
    status: claim.status,
    submittedAt: claim.submittedAt,
    handedOverAt: claim.handedOverAt
  };
}

// Global exports
if (typeof window !== "undefined") {
  window.adminActionStack = adminActionStack;
  window.recordAdminAction = recordAdminAction;
  window.executeUndo = executeUndo;
  window.performUndo = confirmUndoModalAction;
  window.confirmApproveClaim = confirmApproveClaim;
  window.confirmRejectClaim = confirmRejectClaim;
  window.executeHandover = executeHandover;
  window.openReviewModal = openReviewModal;
  window.closeReviewModal = closeReviewModal;
  window.openMyClaimDetailModal = openMyClaimDetailModal;
  window.closeMyClaimDetailModal = closeMyClaimDetailModal;
  window.renderMyClaims = renderMyClaims;
  window.renderClaimRequests = renderClaimRequests;
  window.getSanitizedClaimSummary = getSanitizedClaimSummary;
  window.saveClaimsToLocalStorage = saveClaimsToLocalStorage;
  window.loadClaimsFromLocalStorage = loadClaimsFromLocalStorage;
  window.saveUndoStack = saveUndoStack;
  window.loadUndoStack = loadUndoStack;
  window.getAllClaims = () => allClaims;
  window.setAllClaims = (claims) => { allClaims = claims; };
  window.getPendingClaimQueue = () => pendingClaimQueue;
  window.setPendingClaimQueue = (queue) => { pendingClaimQueue = queue; };
  window.getAdminActionStack = () => adminActionStack;
  window.setAdminActionStack = (stack) => { adminActionStack = stack; };
  window.getActiveReviewClaimId = () => activeReviewClaimId;
  window.setActiveReviewClaimId = (id) => { activeReviewClaimId = id; };
}


