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

// Export for use in app.js (global scope since we're using vanilla <script> tags)
window.LinkedList = LinkedList;
window.HashTable = HashTable;

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

window.PriorityQueue = PriorityQueue;
