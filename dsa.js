// ============================================================
//  dsa.js — Custom Data Structures for FindIt Tracker
//  Implements a Linked List and a Hash Table from scratch.
// ============================================================

// ----- Node (Linked List building block) --------------------
class Node {
  constructor(reportData) {
    this.reportData = reportData;
    this.next = null;
  }
}

// ----- Linked List ------------------------------------------
class LinkedList {
  constructor() {
    this.head = null;
    this.length = 0;
  }

  /** Prepend a report to the front — O(1) */
  insertAtHead(report) {
    const node = new Node(report);
    node.next = this.head;
    this.head = node;
    this.length++;
  }

  /** Remove by report id — O(n) worst case */
  removeById(id) {
    if (!this.head) return null;

    // Head is the target
    if (this.head.reportData.id === id) {
      const removed = this.head;
      this.head = this.head.next;
      removed.next = null;
      this.length--;
      return removed.reportData;
    }

    let current = this.head;
    while (current.next) {
      if (current.next.reportData.id === id) {
        const removed = current.next;
        current.next = removed.next;
        removed.next = null;
        this.length--;
        return removed.reportData;
      }
      current = current.next;
    }
    return null; // not found
  }

  /** Find a report by id — O(n) */
  findById(id) {
    let current = this.head;
    while (current) {
      if (current.reportData.id === id) return current.reportData;
      current = current.next;
    }
    return null;
  }

  /** Convert entire list to an array (for rendering) */
  toArray() {
    const arr = [];
    let current = this.head;
    while (current) {
      arr.push(current.reportData);
      current = current.next;
    }
    return arr;
  }

  /** Visual chain string for the DSA debug panel */
  toChainString() {
    if (!this.head) return "NULL (empty)";
    const parts = [];
    let current = this.head;
    while (current) {
      parts.push(`[${current.reportData.title}]`);
      current = current.next;
    }
    parts.push("NULL");
    return parts.join(" → ");
  }

  /** Rebuild list from an array (used when loading from localStorage) */
  static fromArray(arr) {
    const list = new LinkedList();
    // Insert in reverse so first element ends up at head
    for (let i = arr.length - 1; i >= 0; i--) {
      list.insertAtHead(arr[i]);
    }
    return list;
  }
}

// ----- Hash Table (Separate Chaining) -----------------------
class HashTable {
  constructor(size = 53) {
    this.size = size;
    this.buckets = new Array(size).fill(null).map(() => []);
    this.keyCount = 0;
  }

  /** Hash function: sum of weighted char codes mod table size */
  hash(key) {
    const PRIME = 31;
    let total = 0;
    const str = String(key).toLowerCase();
    for (let i = 0; i < Math.min(str.length, 100); i++) {
      total = (total * PRIME + str.charCodeAt(i)) % this.size;
    }
    return total;
  }

  /** Insert a report reference under the given key */
  insert(key, report) {
    const idx = this.hash(key);
    // Avoid duplicate entries (same report id in same bucket)
    const bucket = this.buckets[idx];
    const exists = bucket.some(
      (entry) => entry.key === key.toLowerCase() && entry.report.id === report.id
    );
    if (!exists) {
      bucket.push({ key: key.toLowerCase(), report });
      this.keyCount++;
    }
  }

  /** Search: returns all reports stored under the given key */
  search(key) {
    const idx = this.hash(key);
    return this.buckets[idx]
      .filter((entry) => entry.key === key.toLowerCase())
      .map((entry) => entry.report);
  }

  /** Remove all entries for a given report id (across every bucket) */
  removeById(id) {
    for (let i = 0; i < this.size; i++) {
      const before = this.buckets[i].length;
      this.buckets[i] = this.buckets[i].filter((entry) => entry.report.id !== id);
      this.keyCount -= before - this.buckets[i].length;
    }
  }

  /** Return a snapshot of non-empty buckets for the debug panel */
  debugSnapshot() {
    const snap = [];
    for (let i = 0; i < this.size; i++) {
      if (this.buckets[i].length > 0) {
        snap.push({
          index: i,
          entries: this.buckets[i].map((e) => ({
            key: e.key,
            title: e.report.title,
            id: e.report.id,
          })),
        });
      }
    }
    return snap;
  }

  /** Rebuild table from an array of reports, indexing each by category and title keywords */
  static fromReports(reports) {
    const ht = new HashTable();
    reports.forEach((r) => {
      ht.insert(r.category, r);
      // Index every word in the title as a keyword
      r.title
        .toLowerCase()
        .split(/\s+/)
        .forEach((word) => {
          if (word.length > 1) ht.insert(word, r);
        });
    });
    return ht;
  }
}

// ----- Queue Node (Queue building block) --------------------
class QueueNode {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

// ----- Claim Queue (FIFO using Linked List) -----------------
class ClaimQueue {
  constructor() {
    this.front = null;
    this.rear = null;
    this._size = 0;
  }

  /** Add a claim to the back of the queue — O(1) */
  enqueue(claim) {
    if (this.contains(claim.id)) return false;
    const node = new QueueNode(claim);
    if (this.rear) {
      this.rear.next = node;
    } else {
      this.front = node;
    }
    this.rear = node;
    this._size++;
    return true;
  }

  /** Remove and return the front claim — O(1) */
  dequeue() {
    if (!this.front) return null;
    const data = this.front.data;
    this.front = this.front.next;
    if (!this.front) this.rear = null;
    this._size--;
    return data;
  }

  /** Inspect front claim without removing — O(1) */
  peek() {
    return this.front ? this.front.data : null;
  }

  /** Check if queue is empty — O(1) */
  isEmpty() {
    return this._size === 0;
  }

  /** Number of claims in the queue — O(1) */
  size() {
    return this._size;
  }

  /** Check if a claim with given ID exists in the queue — O(n) */
  contains(claimId) {
    let current = this.front;
    while (current) {
      if (current.data.id === claimId) return true;
      current = current.next;
    }
    return false;
  }

  /** Remove a specific claim by ID — O(n) */
  removeById(claimId) {
    if (!this.front) return null;
    if (this.front.data.id === claimId) {
      return this.dequeue();
    }
    let current = this.front;
    while (current.next) {
      if (current.next.data.id === claimId) {
        const removed = current.next.data;
        current.next = current.next.next;
        if (!current.next) this.rear = current;
        this._size--;
        return removed;
      }
      current = current.next;
    }
    return null;
  }

  /** Convert queue to array (front to rear, for rendering) */
  toArray() {
    const arr = [];
    let current = this.front;
    while (current) {
      arr.push(current.data);
      current = current.next;
    }
    return arr;
  }

  /** Rebuild queue from an array */
  static fromArray(arr) {
    const q = new ClaimQueue();
    arr.forEach((item) => q.enqueue(item));
    return q;
  }

  /** Visual chain string for the DSA debug panel */
  toChainString() {
    if (!this.front) return "FRONT → NULL (empty queue)";
    const parts = [];
    let current = this.front;
    while (current) {
      parts.push(`[${current.data.id}]`);
      current = current.next;
    }
    parts.push("NULL");
    return "FRONT → " + parts.join(" → ");
  }
}

// ----- Stack Node (Stack building block) ---------------------
class StackNode {
  constructor(data) {
    this.data = data;
    this.next = null;
  }
}

// ----- Action Stack (LIFO for Undo Operations) ---------------
class ActionStack {
  constructor(maxSize = 20) {
    this.top = null;
    this._size = 0;
    this.maxSize = maxSize;
  }

  /** Push an action onto the top of the stack — O(1) */
  push(action) {
    const node = new StackNode(action);
    node.next = this.top;
    this.top = node;
    this._size++;

    // Enforce max capacity (bounded stack)
    if (this._size > this.maxSize) {
      this._trimBottom();
    }
    return true;
  }

  /** Remove and return the top action — O(1) */
  pop() {
    if (!this.top) return null;
    const data = this.top.data;
    this.top = this.top.next;
    this._size--;
    return data;
  }

  /** Inspect the top action without removing — O(1) */
  peek() {
    return this.top ? this.top.data : null;
  }

  /** Check if the stack is empty — O(1) */
  isEmpty() {
    return this._size === 0;
  }

  /** Number of actions on the stack — O(1) */
  size() {
    return this._size;
  }

  /** Clear all actions from the stack */
  clear() {
    this.top = null;
    this._size = 0;
  }

  /** Trim bottom element when size exceeds maxSize */
  _trimBottom() {
    if (this._size <= 1) return;
    let current = this.top;
    while (current.next && current.next.next) {
      current = current.next;
    }
    current.next = null;
    this._size--;
  }

  /** Convert stack to array (from top to bottom) */
  toArray() {
    const arr = [];
    let current = this.top;
    while (current) {
      arr.push(current.data);
      current = current.next;
    }
    return arr;
  }

  /** Rebuild stack from an array (where arr[0] was top) */
  static fromArray(arr, maxSize = 20) {
    const stack = new ActionStack(maxSize);
    if (!Array.isArray(arr)) return stack;
    // Iterate in reverse so arr[0] ends up at the top
    for (let i = arr.length - 1; i >= 0; i--) {
      stack.push(arr[i]);
    }
    return stack;
  }

  /** Visual chain string for the DSA debug panel */
  toChainString() {
    if (!this.top) return "TOP → NULL (empty stack)";
    const parts = [];
    let current = this.top;
    while (current) {
      const label = current.data.type || current.data.id || "Action";
      parts.push(`[${label}]`);
      current = current.next;
    }
    parts.push("BOTTOM");
    return "TOP → " + parts.join(" → ");
  }
}


// ============================================================
//  3.  PRIORITY QUEUE (Binary Max-Heap Implementation)
//      Syllabus Demonstration: Complete Binary Tree in an Array
//      - Root is stored at index 0 (Highest priority item)
//      - Parent index for node i: Math.floor((i - 1) / 2)
//      - Left child index:  2 * i + 1
//      - Right child index: 2 * i + 2
//      - Insertion: O(log n) via Bubble-Up (Heapify-Up)
//      - Extract-Max: O(log n) via Bubble-Down (Heapify-Down)
//      - Priority Update: O(n + log n) with Heap Rebalancing
//      - Heap Sort: O(n log n) priority-ranked retrieval
// ============================================================

class PriorityQueue {
  constructor() {
    this.heap = []; // Array of nodes: { id, priority, insertOrder, report }
    this.orderCounter = 0; // FIFO tie-breaker for items with identical priority
  }

  /** Parent index: floor((i - 1) / 2) */
  parentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /** Left child index: 2i + 1 */
  leftChildIndex(i) {
    return 2 * i + 1;
  }

  /** Right child index: 2i + 2 */
  rightChildIndex(i) {
    return 2 * i + 2;
  }

  /**
   * Compare two nodes:
   * Higher priority value wins (3 = Urgent, 2 = Medium, 1 = Low).
   * In case of tie, smaller insertOrder wins (FIFO: earlier reported item processed first).
   */
  compare(nodeA, nodeB) {
    if (!nodeA) return -1;
    if (!nodeB) return 1;
    if (nodeA.priority !== nodeB.priority) {
      return nodeA.priority - nodeB.priority;
    }
    return nodeB.insertOrder - nodeA.insertOrder;
  }

  /** Swap elements at positions i and j in the heap array */
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Insert a report into the Priority Queue — O(log n)
   * Places element at end of heap array and bubbles up.
   */
  insert(report, priority = 1) {
    const prioVal = Number(priority) || 1;
    report.priority = prioVal;

    const node = {
      id: report.id,
      priority: prioVal,
      insertOrder: this.orderCounter++,
      report: report,
    };

    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
    return node;
  }

  /** Bubble-up (Heapify-Up) — O(log n) */
  bubbleUp(index) {
    while (index > 0) {
      const pIdx = this.parentIndex(index);
      if (this.compare(this.heap[index], this.heap[pIdx]) > 0) {
        this.swap(index, pIdx);
        index = pIdx;
      } else {
        break;
      }
    }
  }

  /**
   * Extract and return the highest-priority report (Root) — O(log n)
   * Swaps root with last leaf, pops, and bubbles down.
   */
  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      return this.heap.pop().report;
    }

    const maxReport = this.heap[0].report;
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return maxReport;
  }

  /** Bubble-down (Heapify-Down) — O(log n) */
  bubbleDown(index) {
    const len = this.heap.length;
    while (this.leftChildIndex(index) < len) {
      let largest = index;
      const left = this.leftChildIndex(index);
      const right = this.rightChildIndex(index);

      if (left < len && this.compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < len && this.compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }

      if (largest !== index) {
        this.swap(index, largest);
        index = largest;
      } else {
        break;
      }
    }
  }

  /** Peek root report without removing — O(1) */
  peek() {
    return this.heap.length > 0 ? this.heap[0].report : null;
  }

  /**
   * Adjust or assign priority to an existing report — O(n + log n)
   * Updates priority value, then bubbles up or down as required.
   */
  changePriority(reportId, newPriority) {
    const idx = this.heap.findIndex((n) => n.id === reportId);
    if (idx === -1) return false;

    const oldPriority = this.heap[idx].priority;
    const prioVal = Number(newPriority) || 1;
    this.heap[idx].priority = prioVal;
    this.heap[idx].report.priority = prioVal;

    if (prioVal > oldPriority) {
      this.bubbleUp(idx);
    } else if (prioVal < oldPriority) {
      this.bubbleDown(idx);
    }
    return true;
  }

  /** Remove by report ID — O(n + log n) */
  removeById(reportId) {
    const idx = this.heap.findIndex((n) => n.id === reportId);
    if (idx === -1) return null;

    const removed = this.heap[idx].report;
    if (idx === this.heap.length - 1) {
      this.heap.pop();
      return removed;
    }

    this.heap[idx] = this.heap.pop();
    this.bubbleUp(idx);
    this.bubbleDown(idx);
    return removed;
  }

  /** Heap size */
  size() {
    return this.heap.length;
  }

  /** Check if heap is empty */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Heap Sort: returns reports ordered from highest to lowest priority — O(n log n)
   * Clones current heap structure to avoid mutating live heap.
   */
  getSortedReports() {
    const clone = new PriorityQueue();
    clone.heap = this.heap.map((node) => ({ ...node }));
    clone.orderCounter = this.orderCounter;

    const sorted = [];
    while (!clone.isEmpty()) {
      sorted.push(clone.extractMax());
    }
    return sorted;
  }

  /** Raw reports array from heap */
  toArray() {
    return this.heap.map((n) => n.report);
  }

  /**
   * Diagnostic snapshot for Binary Heap visualizer
   */
  debugSnapshot() {
    return this.heap.map((node, idx) => ({
      index: idx,
      id: node.id,
      title: node.report.title,
      category: node.report.category,
      priority: node.priority,
      parentIndex: idx > 0 ? this.parentIndex(idx) : null,
      leftChildIndex: this.leftChildIndex(idx) < this.heap.length ? this.leftChildIndex(idx) : null,
      rightChildIndex: this.rightChildIndex(idx) < this.heap.length ? this.rightChildIndex(idx) : null,
    }));
  }

  /** Rebuild priority queue from an array of reports */
  static fromReports(reports) {
    const pq = new PriorityQueue();
    reports.forEach((r) => {
      pq.insert(r, r.priority || 1);
    });
    return pq;
  }
}

// ============================================================
//  4.  CAMPUS GRAPH & LOCATION NAVIGATOR (Person 2)
//  Represents campus places (Library, Canteen, Labs, Classrooms)
//  as an unweighted undirected graph using an Adjacency List.
//  - Show connected locations (Adjacency List)
//  - BFS: Route with fewest edges (Shortest path in unweighted graph)
//  - DFS: Explore connected campus locations
// ============================================================
class CampusGraph {
  constructor() {
    // Map of locationName -> Array of neighbor names
    this.adjacencyList = new Map();
    // Map of locationName -> metadata { id, name, floor, type, description, icon }
    this.nodeMetadata = new Map();
    // Bi-directional lookup: vertexId <-> locationName
    this.idToName = new Map();
    this.nameToId = new Map();
  }

  static toVertexId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  addLocation(name, metadata = {}) {
    const id = metadata.id || CampusGraph.toVertexId(name);
    if (!this.adjacencyList.has(name)) {
      this.adjacencyList.set(name, []);
      this.nodeMetadata.set(name, {
        id,
        name,
        floor: metadata.floor || "Floor 1",
        type: metadata.type || "room",
        description: metadata.description || "",
        icon: metadata.icon || "📍",
      });
      this.idToName.set(id, name);
      this.nameToId.set(name, id);
    }
  }

  addEdge(loc1, loc2) {
    if (!this.adjacencyList.has(loc1)) this.addLocation(loc1);
    if (!this.adjacencyList.has(loc2)) this.addLocation(loc2);

    if (!this.adjacencyList.get(loc1).includes(loc2)) {
      this.adjacencyList.get(loc1).push(loc2);
    }
    if (!this.adjacencyList.get(loc2).includes(loc1)) {
      this.adjacencyList.get(loc2).push(loc1);
    }
  }

  getNeighbors(name) {
    return this.adjacencyList.get(name) || [];
  }

  getMetadata(name) {
    return this.nodeMetadata.get(name) || {
      id: CampusGraph.toVertexId(name || "unknown"),
      name: name || "Unknown",
      floor: "Unknown",
      type: "room",
      icon: "📍",
      description: "",
    };
  }

  getVertexId(name) {
    const resolved = this.resolveLocation(name);
    return resolved ? this.nameToId.get(resolved) : null;
  }

  getLocationById(id) {
    if (!id) return null;
    return this.idToName.get(id) || this.resolveLocation(id);
  }

  getAllLocations() {
    return Array.from(this.adjacencyList.keys());
  }

  getLocationsByFloor(floorName) {
    const locations = [];
    for (const [name, meta] of this.nodeMetadata.entries()) {
      if (!floorName || floorName === "All" || meta.floor.toLowerCase().includes(floorName.toLowerCase())) {
        locations.push({ name, ...meta, degree: (this.adjacencyList.get(name) || []).length });
      }
    }
    return locations;
  }

  /**
   * Resolve location from vertex ID, name, or search query
   * E.g. "library_floor_2" -> "Library 2nd Floor", "canteen" -> "Open Canteen", "lab 302" -> "Lab 302"
   */
  resolveLocation(query) {
    if (!query) return null;
    const q = String(query).trim().toLowerCase();

    // 1. Direct ID lookup
    if (this.idToName.has(q)) return this.idToName.get(q);

    // 2. Exact name match (case-insensitive)
    for (const [name, meta] of this.nodeMetadata.entries()) {
      if (name.toLowerCase() === q || meta.id.toLowerCase() === q) {
        return name;
      }
    }

    const all = this.getAllLocations();

    // 3. Substring contains match
    const contains = all.find((loc) => loc.toLowerCase().includes(q) || q.includes(loc.toLowerCase()));
    if (contains) return contains;

    // 4. Known campus keywords from floormaps.vercel.app
    if (q.includes("canteen") || q.includes("food") || q.includes("cafeteria")) return "Open Canteen";
    if (q.includes("library") || q.includes("book") || q.includes("reading")) return "Library 2nd Floor";
    if (q.includes("302")) return "Lab 302";
    if (q.includes("301")) return "Lab 301";
    if (q.includes("303")) return "Classroom 303";
    if (q.includes("304")) return "Lab 304";
    if (q.includes("parking") || q.includes("bike") || q.includes("car")) return "Parking Lot B";
    if (q.includes("gate") || q.includes("entrance")) return "Gate 1 / Main Entrance";
    if (q.includes("audi") || q.includes("auditorium") || q.includes("hall") || q.includes("samvad")) return "Auditorium (Samvad Hall)";
    if (q.includes("physics")) return "Physics Lab";
    if (q.includes("chem")) return "Chemistry Lab";
    if (q.includes("stuco") || q.includes("council")) return "STUCO Room";
    if (q.includes("incubation")) return "Incubation Cell";
    if (q.includes("exam")) return "Exam Cell";
    if (q.includes("cad")) return "CAD Lab (Floor 4)";
    if (q.includes("presentation") || q.includes("508")) return "Presentation Room 508";
    if (q.includes("language")) return "Language Lab (Floor 5)";

    return all[0] || null;
  }

  /**
   * Depth-Limited Breadth-First Search (BFS)
   * Explores campus graph layer by layer up to maxHops (e.g. 0 = room only, 1 = neighbor corridors, 2 = adjacent wings).
   * Returns: Array of { node, id, hops, path, metadata } sorted by hops ascending.
   */
  bfsNearbyLocations(startLocation, maxHops = 2) {
    const resolvedStart = this.resolveLocation(startLocation);
    if (!resolvedStart || !this.adjacencyList.has(resolvedStart)) {
      return [];
    }

    const queue = [{ node: resolvedStart, depth: 0, path: [resolvedStart] }];
    const visited = new Map();
    visited.set(resolvedStart, 0);

    const results = [];

    while (queue.length > 0) {
      const current = queue.shift();
      const meta = this.getMetadata(current.node);

      results.push({
        node: current.node,
        id: meta.id || CampusGraph.toVertexId(current.node),
        hops: current.depth,
        path: current.path,
        metadata: meta,
      });

      if (current.depth < maxHops) {
        const neighbors = this.adjacencyList.get(current.node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.set(neighbor, current.depth + 1);
            queue.push({
              node: neighbor,
              depth: current.depth + 1,
              path: [...current.path, neighbor],
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Find Lost & Found reports near a selected location using Depth-Limited BFS
   * Ranks candidate reports by:
   *  1. Graph proximity (hops ascending: 0 edges -> 1 edge -> 2 edges)
   *  2. Report Priority (Max-Heap order: Urgent (3) -> Medium (2) -> Low (1))
   *  3. Recency (Newest timestamp first)
   */
  findNearbyReports(startLocation, allReports = [], maxHops = 2) {
    const nearbyNodes = this.bfsNearbyLocations(startLocation, maxHops);
    if (!nearbyNodes || nearbyNodes.length === 0) return [];

    const nodeInfoMap = new Map();
    nearbyNodes.forEach((item) => {
      nodeInfoMap.set(item.node, item);
    });

    const matchedReports = [];
    allReports.forEach((report) => {
      if (report.status && report.status.toLowerCase() !== "active") return;

      const reportNode = this.resolveLocation(report.location);
      if (reportNode && nodeInfoMap.has(reportNode)) {
        const nodeInfo = nodeInfoMap.get(reportNode);
        matchedReports.push({
          report,
          node: reportNode,
          vertexId: nodeInfo.id,
          hops: nodeInfo.hops,
          path: nodeInfo.path,
          distanceLabel:
            nodeInfo.hops === 0
              ? "Same Room (0 edges away)"
              : nodeInfo.hops === 1
              ? `1 edge away (Immediate connector)`
              : `2 edges away (Nearby corridor/wing)`,
        });
      }
    });

    matchedReports.sort((a, b) => {
      if (a.hops !== b.hops) return a.hops - b.hops;
      const prioA = a.report.priority || 1;
      const prioB = b.report.priority || 1;
      if (prioB !== prioA) return prioB - prioA;
      return new Date(b.report.timestamp) - new Date(a.report.timestamp);
    });

    return matchedReports;
  }

  /**
   * Count unresolved reports per location and detect locations with recent Found items
   * Powers the Campus Location Explorer map highlights
   */
  getUnresolvedReportCounts(allReports = []) {
    const counts = new Map();
    const foundLocations = new Set();
    const reportsByLocation = new Map();

    allReports.forEach((report) => {
      if (report.status && report.status.toLowerCase() !== "active") return;

      const resolved = this.resolveLocation(report.location);
      if (resolved) {
        counts.set(resolved, (counts.get(resolved) || 0) + 1);

        if (!reportsByLocation.has(resolved)) {
          reportsByLocation.set(resolved, []);
        }
        reportsByLocation.get(resolved).push(report);

        if (report.type && report.type.toLowerCase() === "found") {
          foundLocations.add(resolved);
        }
      }
    });

    return { counts, foundLocations, reportsByLocation };
  }

  /**
   * Breadth-First Search (BFS)
   * Finds the path with the fewest edges in an unweighted graph.
   * Guarantees the shortest path in terms of steps/hops!
   * Returns: { found, path, hops, visitedOrder, edgesExplored }
   */
  bfsShortestPath(start, destination) {
    const resolvedStart = this.resolveLocation(start);
    const resolvedDest = this.resolveLocation(destination);

    if (!resolvedStart || !resolvedDest || !this.adjacencyList.has(resolvedStart) || !this.adjacencyList.has(resolvedDest)) {
      return { found: false, path: [], hops: 0, visitedOrder: [] };
    }

    if (resolvedStart === resolvedDest) {
      return {
        found: true,
        start: resolvedStart,
        destination: resolvedDest,
        path: [resolvedStart],
        hops: 0,
        visitedOrder: [resolvedStart],
      };
    }

    const queue = [resolvedStart];
    const visited = new Set([resolvedStart]);
    const parent = new Map();
    const visitedOrder = [];

    let found = false;

    while (queue.length > 0) {
      const current = queue.shift();
      visitedOrder.push(current);

      if (current === resolvedDest) {
        found = true;
        break;
      }

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    if (!found) {
      return {
        found: false,
        start: resolvedStart,
        destination: resolvedDest,
        path: [],
        hops: 0,
        visitedOrder,
      };
    }

    // Reconstruct path from destination backwards to start
    const path = [];
    let curr = resolvedDest;
    while (curr) {
      path.unshift(curr);
      curr = parent.get(curr);
    }

    return {
      found: true,
      start: resolvedStart,
      destination: resolvedDest,
      path,
      hops: path.length - 1,
      visitedOrder,
    };
  }

  /**
   * Depth-First Search (DFS)
   * Explores all connected locations starting from a node.
   * Demonstrates graph traversal, discovery edges & connected component reachability.
   * Returns: { start, visitedOrder, discoveryEdges, reachableCount }
   */
  dfsExplore(start) {
    const resolvedStart = this.resolveLocation(start);
    if (!resolvedStart || !this.adjacencyList.has(resolvedStart)) {
      return { start: null, visitedOrder: [], discoveryEdges: [], reachableCount: 0 };
    }

    const visited = new Set();
    const visitedOrder = [];
    const discoveryEdges = [];

    const dfs = (node) => {
      visited.add(node);
      visitedOrder.push(node);

      const neighbors = this.adjacencyList.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          discoveryEdges.push({ from: node, to: neighbor });
          dfs(neighbor);
        }
      }
    };

    dfs(resolvedStart);

    return {
      start: resolvedStart,
      visitedOrder,
      discoveryEdges,
      reachableCount: visited.size,
    };
  }

  /**
   * Diagnostic snapshot for DSA Adjacency List inspector
   */
  debugAdjacencyList() {
    const list = {};
    for (const [node, neighbors] of this.adjacencyList.entries()) {
      list[node] = {
        meta: this.nodeMetadata.get(node) || {},
        neighbors: [...neighbors],
        degree: neighbors.length,
      };
    }
    return list;
  }

  /**
   * Factory method: Builds the complete FRCRCE campus graph
   * Modeled directly from https://floormaps.vercel.app/?floor=floor3
   */
  static createCampusGraph() {
    const g = new CampusGraph();

    // ==========================================
    // Ground Floor: Entrances & Parking
    // ==========================================
    g.addLocation("Gate 1 / Main Entrance", {
      floor: "Ground Floor",
      type: "facility",
      icon: "🚪",
      description: "Primary campus security checkpoint, visitor registration & main gate.",
    });
    g.addLocation("Parking Lot B", {
      floor: "Ground Floor",
      type: "facility",
      icon: "🅿️",
      description: "Student two-wheeler & staff vehicle parking stand near campus gate.",
    });
    g.addLocation("Campus Quadrangle", {
      floor: "Ground Floor",
      type: "facility",
      icon: "🏛️",
      description: "Central open-air courtyard connecting entrance gate and main academic wings.",
    });

    g.addEdge("Gate 1 / Main Entrance", "Parking Lot B");
    g.addEdge("Gate 1 / Main Entrance", "Campus Quadrangle");
    g.addEdge("Parking Lot B", "Campus Quadrangle");

    // ==========================================
    // Floor 1: Canteen, Labs, Admin & Seminar Hall
    // ==========================================
    g.addLocation("Open Canteen", {
      floor: "Floor 1",
      type: "facility",
      icon: "☕",
      description: "Open-air student dining space & social lounge.",
    });
    g.addLocation("Closed Canteen", {
      floor: "Floor 1",
      type: "facility",
      icon: "🥪",
      description: "Indoor cafeteria serving counter, food preparation & kitchen.",
    });
    g.addLocation("Central Stairs (Floor 1)", {
      floor: "Floor 1",
      type: "stairs",
      icon: "🪜",
      description: "Main central staircase connecting ground foyer to upper floors.",
    });
    g.addLocation("East Stairs (Floor 1)", {
      floor: "Floor 1",
      type: "stairs",
      icon: "🪜",
      description: "East wing staircase adjacent to elevator bank.",
    });
    g.addLocation("West Stairs (Floor 1)", {
      floor: "Floor 1",
      type: "stairs",
      icon: "🪜",
      description: "West wing staircase connecting physics and chemistry science labs.",
    });
    g.addLocation("Lifts N1/N2 (Floor 1)", {
      floor: "Floor 1",
      type: "elevator",
      icon: "🛗",
      description: "North passenger elevator bank servicing floors 1 through 9.",
    });
    g.addLocation("Physics Lab", {
      floor: "Floor 1",
      type: "academic",
      icon: "🔬",
      description: "Engineering Physics & Optics experimental lab.",
    });
    g.addLocation("Chemistry Lab", {
      floor: "Floor 1",
      type: "academic",
      icon: "🧪",
      description: "Applied Chemistry & Environmental Engineering lab.",
    });
    g.addLocation("Principal Cabin", {
      floor: "Floor 1",
      type: "admin",
      icon: "🏢",
      description: "Executive leadership & Principal administrative office.",
    });
    g.addLocation("Exam Cell", {
      floor: "Floor 1",
      type: "admin",
      icon: "📄",
      description: "University examination control division & verification desk.",
    });
    g.addLocation("Fr. Diniz Hall", {
      floor: "Floor 1",
      type: "hall",
      icon: "🎭",
      description: "Air-conditioned seminar hall for department orientations & workshops.",
    });

    g.addEdge("Campus Quadrangle", "Central Stairs (Floor 1)");
    g.addEdge("Campus Quadrangle", "Open Canteen");
    g.addEdge("Open Canteen", "Closed Canteen");
    g.addEdge("Open Canteen", "Central Stairs (Floor 1)");
    g.addEdge("Central Stairs (Floor 1)", "Principal Cabin");
    g.addEdge("Central Stairs (Floor 1)", "East Stairs (Floor 1)");
    g.addEdge("Central Stairs (Floor 1)", "West Stairs (Floor 1)");
    g.addEdge("East Stairs (Floor 1)", "Lifts N1/N2 (Floor 1)");
    g.addEdge("East Stairs (Floor 1)", "Exam Cell");
    g.addEdge("East Stairs (Floor 1)", "Fr. Diniz Hall");
    g.addEdge("West Stairs (Floor 1)", "Physics Lab");
    g.addEdge("West Stairs (Floor 1)", "Chemistry Lab");

    // ==========================================
    // Floor 2: Central College Library
    // ==========================================
    g.addLocation("Library 2nd Floor", {
      floor: "Floor 2",
      type: "academic",
      icon: "📚",
      description: "Central Academic Library, digital catalog, reference stacks & silent study desks.",
    });
    g.addLocation("Central Stairs (Floor 2)", {
      floor: "Floor 2",
      type: "stairs",
      icon: "🪜",
      description: "Floor 2 central staircase connector.",
    });
    g.addLocation("East Stairs (Floor 2)", {
      floor: "Floor 2",
      type: "stairs",
      icon: "🪜",
      description: "Floor 2 east staircase connector.",
    });
    g.addLocation("West Stairs (Floor 2)", {
      floor: "Floor 2",
      type: "stairs",
      icon: "🪜",
      description: "Floor 2 west staircase connector.",
    });
    g.addLocation("Lifts N1/N2 (Floor 2)", {
      floor: "Floor 2",
      type: "elevator",
      icon: "🛗",
      description: "Floor 2 elevator landing at library entrance.",
    });

    g.addEdge("Library 2nd Floor", "Central Stairs (Floor 2)");
    g.addEdge("Library 2nd Floor", "East Stairs (Floor 2)");
    g.addEdge("Library 2nd Floor", "Lifts N1/N2 (Floor 2)");
    g.addEdge("Central Stairs (Floor 2)", "West Stairs (Floor 2)");
    g.addEdge("Central Stairs (Floor 2)", "East Stairs (Floor 2)");

    // ==========================================
    // Floor 3: Engineering Labs & Classrooms (floormaps.vercel.app/?floor=floor3)
    // ==========================================
    g.addLocation("Lab 301", {
      floor: "Floor 3",
      type: "academic",
      icon: "💻",
      description: "Computer Engineering Hardware & Microprocessor Lab.",
    });
    g.addLocation("Lab 302", {
      floor: "Floor 3",
      type: "academic",
      icon: "🖥️",
      description: "Advanced Computing, Algorithms & Data Structures (DSA) Lab.",
    });
    g.addLocation("Classroom 303", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Third-year Computer Engineering lecture hall.",
    });
    g.addLocation("Lab 304", {
      floor: "Floor 3",
      type: "academic",
      icon: "💻",
      description: "Software Engineering & Database Management Lab.",
    });
    g.addLocation("Classroom 305", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Interactive smart classroom equipped with digital projectors.",
    });
    g.addLocation("Classroom 306", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Second-year CSE core lecture hall.",
    });
    g.addLocation("Classroom 307", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Department lecture & tutorial room.",
    });
    g.addLocation("STUCO Room", {
      floor: "Floor 3",
      type: "facility",
      icon: "🤝",
      description: "CRCE Student Council Headquarters & club coordination office.",
    });
    g.addLocation("Incubation Cell", {
      floor: "Floor 3",
      type: "facility",
      icon: "💡",
      description: "Student Innovation, Prototyping & Startup Incubation center.",
    });
    g.addLocation("Classroom 309", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "East wing engineering lecture room.",
    });
    g.addLocation("Classroom 310", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "East wing engineering lecture room.",
    });
    g.addLocation("Classroom 311", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Engineering lecture room.",
    });
    g.addLocation("Classroom 312", {
      floor: "Floor 3",
      type: "academic",
      icon: "🎓",
      description: "Advanced elective seminar room.",
    });
    g.addLocation("HVAC Lab 313", {
      floor: "Floor 3",
      type: "academic",
      icon: "⚙️",
      description: "Mechanical Engineering HVAC & Thermal Systems research lab.",
    });
    g.addLocation("Central Stairs (Floor 3)", {
      floor: "Floor 3",
      type: "stairs",
      icon: "🪜",
      description: "Floor 3 central lobby corridor & staircase landing.",
    });
    g.addLocation("East Stairs (Floor 3)", {
      floor: "Floor 3",
      type: "stairs",
      icon: "🪜",
      description: "Floor 3 east wing staircase connector.",
    });
    g.addLocation("West Stairs (Floor 3)", {
      floor: "Floor 3",
      type: "stairs",
      icon: "🪜",
      description: "Floor 3 west wing staircase directly serving Lab 301 and Lab 302.",
    });
    g.addLocation("Lifts N1/N2 (Floor 3)", {
      floor: "Floor 3",
      type: "elevator",
      icon: "🛗",
      description: "Floor 3 north elevator lobby.",
    });

    g.addEdge("West Stairs (Floor 3)", "Lab 301");
    g.addEdge("West Stairs (Floor 3)", "Lab 302");
    g.addEdge("Lab 302", "Classroom 303");
    g.addEdge("Classroom 303", "Lab 304");
    g.addEdge("Lab 304", "Central Stairs (Floor 3)");
    g.addEdge("Central Stairs (Floor 3)", "Classroom 305");
    g.addEdge("Central Stairs (Floor 3)", "Classroom 306");
    g.addEdge("Central Stairs (Floor 3)", "STUCO Room");
    g.addEdge("Central Stairs (Floor 3)", "Incubation Cell");
    g.addEdge("Central Stairs (Floor 3)", "East Stairs (Floor 3)");
    g.addEdge("East Stairs (Floor 3)", "Lifts N1/N2 (Floor 3)");
    g.addEdge("East Stairs (Floor 3)", "Classroom 307");
    g.addEdge("East Stairs (Floor 3)", "Classroom 309");
    g.addEdge("Classroom 309", "Classroom 310");
    g.addEdge("Classroom 310", "Classroom 311");
    g.addEdge("Classroom 311", "Classroom 312");
    g.addEdge("Classroom 312", "HVAC Lab 313");

    // ==========================================
    // Floor 4: CAD, I.E. Labs & Common Rooms
    // ==========================================
    g.addLocation("CAD Lab (Floor 4)", {
      floor: "Floor 4",
      type: "academic",
      icon: "📐",
      description: "Computer-Aided Design & Simulation workstation suite.",
    });
    g.addLocation("I.E. Lab (Floor 4)", {
      floor: "Floor 4",
      type: "academic",
      icon: "🔬",
      description: "Industrial Electronics & Mechatronics Lab.",
    });
    g.addLocation("Classroom 401", {
      floor: "Floor 4",
      type: "academic",
      icon: "🎓",
      description: "Engineering lecture hall.",
    });
    g.addLocation("Central Stairs (Floor 4)", {
      floor: "Floor 4",
      type: "stairs",
      icon: "🪜",
      description: "Floor 4 central staircase landing.",
    });
    g.addLocation("East Stairs (Floor 4)", {
      floor: "Floor 4",
      type: "stairs",
      icon: "🪜",
      description: "Floor 4 east wing staircase connector.",
    });
    g.addLocation("West Stairs (Floor 4)", {
      floor: "Floor 4",
      type: "stairs",
      icon: "🪜",
      description: "Floor 4 west wing staircase connector.",
    });
    g.addLocation("Lifts N1/N2 (Floor 4)", {
      floor: "Floor 4",
      type: "elevator",
      icon: "🛗",
      description: "Floor 4 north elevator lobby.",
    });

    g.addEdge("Central Stairs (Floor 4)", "CAD Lab (Floor 4)");
    g.addEdge("Central Stairs (Floor 4)", "I.E. Lab (Floor 4)");
    g.addEdge("Central Stairs (Floor 4)", "Classroom 401");
    g.addEdge("Central Stairs (Floor 4)", "East Stairs (Floor 4)");
    g.addEdge("Central Stairs (Floor 4)", "West Stairs (Floor 4)");
    g.addEdge("East Stairs (Floor 4)", "Lifts N1/N2 (Floor 4)");

    // ==========================================
    // Floor 5: Language & Seminar
    // ==========================================
    g.addLocation("Language Lab (Floor 5)", {
      floor: "Floor 5",
      type: "academic",
      icon: "🎧",
      description: "Professional Communication & Digital Language learning laboratory.",
    });
    g.addLocation("Presentation Room 508", {
      floor: "Floor 5",
      type: "facility",
      icon: "📽️",
      description: "Equipped presentation theater for capstone defenses & seminars.",
    });
    g.addLocation("Central Stairs (Floor 5)", {
      floor: "Floor 5",
      type: "stairs",
      icon: "🪜",
      description: "Floor 5 central staircase landing.",
    });
    g.addLocation("West Stairs (Floor 5)", {
      floor: "Floor 5",
      type: "stairs",
      icon: "🪜",
      description: "Floor 5 west staircase connector.",
    });
    g.addLocation("East Stairs (Floor 5)", {
      floor: "Floor 5",
      type: "stairs",
      icon: "🪜",
      description: "Floor 5 east staircase connector.",
    });
    g.addLocation("Lifts N1/N2 (Floor 5)", {
      floor: "Floor 5",
      type: "elevator",
      icon: "🛗",
      description: "Floor 5 elevator lobby.",
    });

    g.addEdge("Central Stairs (Floor 5)", "Language Lab (Floor 5)");
    g.addEdge("Central Stairs (Floor 5)", "Presentation Room 508");
    g.addEdge("Central Stairs (Floor 5)", "East Stairs (Floor 5)");
    g.addEdge("Central Stairs (Floor 5)", "West Stairs (Floor 5)");
    g.addEdge("East Stairs (Floor 5)", "Lifts N1/N2 (Floor 5)");

    // ==========================================
    // Floor 9: Auditorium (Samvad Hall)
    // ==========================================
    g.addLocation("Auditorium (Samvad Hall)", {
      floor: "Floor 9",
      type: "hall",
      icon: "🎭",
      description: "Samvad Central College Auditorium for festivals, convocations & cultural summits.",
    });
    g.addLocation("Activity Room", {
      floor: "Floor 9",
      type: "facility",
      icon: "🎨",
      description: "Student cultural & technical club activity hub.",
    });
    g.addLocation("Central Stairs (Floor 9)", {
      floor: "Floor 9",
      type: "stairs",
      icon: "🪜",
      description: "Top floor central staircase access.",
    });
    g.addLocation("West Stairs (Floor 9)", {
      floor: "Floor 9",
      type: "stairs",
      icon: "🪜",
      description: "Top floor west staircase connector.",
    });
    g.addLocation("Lifts N1/N2 (Floor 9)", {
      floor: "Floor 9",
      type: "elevator",
      icon: "🛗",
      description: "Top floor elevator landing directly serving Samvad Auditorium.",
    });

    g.addEdge("Auditorium (Samvad Hall)", "Central Stairs (Floor 9)");
    g.addEdge("Auditorium (Samvad Hall)", "West Stairs (Floor 9)");
    g.addEdge("Central Stairs (Floor 9)", "Activity Room");
    g.addEdge("Central Stairs (Floor 9)", "Lifts N1/N2 (Floor 9)");

    // ==========================================
    // Vertical Inter-Floor Interconnections (Stairs & Lifts)
    // ==========================================
    // Central Stairs Chain
    g.addEdge("Central Stairs (Floor 1)", "Central Stairs (Floor 2)");
    g.addEdge("Central Stairs (Floor 2)", "Central Stairs (Floor 3)");
    g.addEdge("Central Stairs (Floor 3)", "Central Stairs (Floor 4)");
    g.addEdge("Central Stairs (Floor 4)", "Central Stairs (Floor 5)");
    g.addEdge("Central Stairs (Floor 5)", "Central Stairs (Floor 9)");

    // West Stairs Chain
    g.addEdge("West Stairs (Floor 1)", "West Stairs (Floor 2)");
    g.addEdge("West Stairs (Floor 2)", "West Stairs (Floor 3)");
    g.addEdge("West Stairs (Floor 3)", "West Stairs (Floor 4)");
    g.addEdge("West Stairs (Floor 4)", "West Stairs (Floor 5)");
    g.addEdge("West Stairs (Floor 5)", "West Stairs (Floor 9)");

    // East Stairs Chain
    g.addEdge("East Stairs (Floor 1)", "East Stairs (Floor 2)");
    g.addEdge("East Stairs (Floor 2)", "East Stairs (Floor 3)");
    g.addEdge("East Stairs (Floor 3)", "East Stairs (Floor 4)");
    g.addEdge("East Stairs (Floor 4)", "East Stairs (Floor 5)");

    // Lifts N1/N2 Multi-Floor Shaft
    g.addEdge("Lifts N1/N2 (Floor 1)", "Lifts N1/N2 (Floor 2)");
    g.addEdge("Lifts N1/N2 (Floor 2)", "Lifts N1/N2 (Floor 3)");
    g.addEdge("Lifts N1/N2 (Floor 3)", "Lifts N1/N2 (Floor 4)");
    g.addEdge("Lifts N1/N2 (Floor 4)", "Lifts N1/N2 (Floor 5)");
    g.addEdge("Lifts N1/N2 (Floor 5)", "Lifts N1/N2 (Floor 9)");

    return g;
  }
}

if (typeof window !== "undefined") {
  window.LinkedList = LinkedList;
  window.HashTable = HashTable;
  window.ClaimQueue = ClaimQueue;
  window.ActionStack = ActionStack;
  window.PriorityQueue = PriorityQueue;
  window.CampusGraph = CampusGraph;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Node,
    LinkedList,
    HashTable,
    QueueNode,
    ClaimQueue,
    StackNode,
    ActionStack,
    PriorityQueue,
    CampusGraph,
  };
}
