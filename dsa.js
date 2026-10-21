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
