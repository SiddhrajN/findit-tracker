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

// Export for use in app.js (global scope since we're using vanilla <script> tags)
window.LinkedList = LinkedList;
window.HashTable = HashTable;
window.ClaimQueue = ClaimQueue;
window.ActionStack = ActionStack;

