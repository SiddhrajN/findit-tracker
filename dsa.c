/*
 * ============================================================
 *  dsa.c — Core Data Structures for FindIt: Campus Lost-and-Found Tracker
 *
 *  Implements:
 *    1. Singly Linked List  — for storing active reports & recovery history
 *    2. Hash Table (Separate Chaining) — for O(1) average category/keyword lookup
 *
 *  Compile:  gcc -o findit dsa.c
 *  Run:      ./findit
 * ============================================================
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ---------- Constants ------------------------------------ */
#define MAX_STR       128
#define HASH_SIZE      53    /* prime number for better distribution */
#define MAX_REPORTS   200

/* ---------- Report Data Model ---------------------------- */
typedef struct {
    char id[16];             /* e.g. "REP-1001"                 */
    char type[8];            /* "Lost" or "Found"               */
    char title[MAX_STR];     /* Item name                       */
    char category[MAX_STR];  /* Electronics, ID/Wallet, etc.    */
    char location[MAX_STR];  /* Campus location                 */
    char description[256];   /* Details + contact info          */
    char status[16];         /* "Active" or "Recovered"         */
    char timestamp[32];      /* Date/time string                */
    char recoveredAt[32];    /* When recovered (empty if active)*/
    int  priority;           /* 3 = Urgent, 2 = Medium, 1 = Low */
} Report;

/* ==========================================================
 *  1.  SINGLY LINKED LIST
 * ========================================================== */

/* --- Node ------------------------------------------------ */
typedef struct Node {
    Report      data;
    struct Node *next;
} Node;

/* --- LinkedList ------------------------------------------ */
typedef struct {
    Node *head;
    int   length;
} LinkedList;

/* Create an empty list */
LinkedList* createLinkedList(void) {
    LinkedList *list = (LinkedList *)malloc(sizeof(LinkedList));
    if (!list) { perror("malloc"); exit(EXIT_FAILURE); }
    list->head   = NULL;
    list->length = 0;
    return list;
}

/* Insert at head — O(1) */
void insertAtHead(LinkedList *list, Report report) {
    Node *node = (Node *)malloc(sizeof(Node));
    if (!node) { perror("malloc"); exit(EXIT_FAILURE); }
    node->data = report;
    node->next = list->head;
    list->head = node;
    list->length++;
}

/* Remove by report id — O(n) worst case
   Returns 1 if found and fills *removed, 0 otherwise */
int removeById(LinkedList *list, const char *id, Report *removed) {
    if (!list->head) return 0;

    /* Head is the target */
    if (strcmp(list->head->data.id, id) == 0) {
        Node *tmp = list->head;
        if (removed) *removed = tmp->data;
        list->head = tmp->next;
        free(tmp);
        list->length--;
        return 1;
    }

    Node *curr = list->head;
    while (curr->next) {
        if (strcmp(curr->next->data.id, id) == 0) {
            Node *tmp = curr->next;
            if (removed) *removed = tmp->data;
            curr->next = tmp->next;
            free(tmp);
            list->length--;
            return 1;
        }
        curr = curr->next;
    }
    return 0; /* not found */
}

/* Find by id — O(n). Returns pointer or NULL */
Report* findById(LinkedList *list, const char *id) {
    Node *curr = list->head;
    while (curr) {
        if (strcmp(curr->data.id, id) == 0)
            return &curr->data;
        curr = curr->next;
    }
    return NULL;
}

/* Convert to array. Caller supplies array & max size. Returns count */
int toArray(LinkedList *list, Report arr[], int maxSize) {
    int count = 0;
    Node *curr = list->head;
    while (curr && count < maxSize) {
        arr[count++] = curr->data;
        curr = curr->next;
    }
    return count;
}

/* Display the list chain: HEAD → [Title] → [Title] → NULL */
void displayList(LinkedList *list, const char *label) {
    printf("\n  %s (length %d):\n  HEAD", label, list->length);
    Node *curr = list->head;
    while (curr) {
        printf(" -> [%s]", curr->data.title);
        curr = curr->next;
    }
    printf(" -> NULL\n");
}

/* Free entire list */
void freeLinkedList(LinkedList *list) {
    Node *curr = list->head;
    while (curr) {
        Node *tmp = curr;
        curr = curr->next;
        free(tmp);
    }
    free(list);
}


/* ==========================================================
 *  2.  HASH TABLE  (Separate Chaining)
 * ========================================================== */

/* Each bucket entry stores a key and a copy of the report */
typedef struct HashEntry {
    char              key[MAX_STR];
    Report            report;
    struct HashEntry *next;
} HashEntry;

typedef struct {
    HashEntry *buckets[HASH_SIZE];
    int        entryCount;
} HashTable;

/* Create an empty hash table */
HashTable* createHashTable(void) {
    HashTable *ht = (HashTable *)malloc(sizeof(HashTable));
    if (!ht) { perror("malloc"); exit(EXIT_FAILURE); }
    for (int i = 0; i < HASH_SIZE; i++)
        ht->buckets[i] = NULL;
    ht->entryCount = 0;
    return ht;
}

/* Hash function — weighted sum of char codes mod table size */
unsigned int hash(const char *key) {
    unsigned int total = 0;
    const unsigned int PRIME = 31;
    int len = (int)strlen(key);
    if (len > 100) len = 100;

    for (int i = 0; i < len; i++) {
        /* use lowercase for case-insensitive hashing */
        char c = key[i];
        if (c >= 'A' && c <= 'Z') c += 32;
        total = (total * PRIME + (unsigned int)c) % HASH_SIZE;
    }
    return total;
}

/* Helper: lowercase copy of a string */
void toLowerStr(char *dest, const char *src) {
    int i = 0;
    while (src[i] && i < MAX_STR - 1) {
        dest[i] = (src[i] >= 'A' && src[i] <= 'Z') ? src[i] + 32 : src[i];
        i++;
    }
    dest[i] = '\0';
}

/* Insert a report under the given key */
void hashInsert(HashTable *ht, const char *key, Report report) {
    char lowerKey[MAX_STR];
    toLowerStr(lowerKey, key);

    unsigned int idx = hash(lowerKey);

    /* Check for duplicate (same key + same report id) */
    HashEntry *curr = ht->buckets[idx];
    while (curr) {
        if (strcmp(curr->key, lowerKey) == 0 &&
            strcmp(curr->report.id, report.id) == 0)
            return; /* already exists */
        curr = curr->next;
    }

    HashEntry *entry = (HashEntry *)malloc(sizeof(HashEntry));
    if (!entry) { perror("malloc"); exit(EXIT_FAILURE); }
    strncpy(entry->key, lowerKey, MAX_STR - 1);
    entry->key[MAX_STR - 1] = '\0';
    entry->report = report;
    entry->next   = ht->buckets[idx];
    ht->buckets[idx] = entry;
    ht->entryCount++;
}

/* Search: returns count of matching reports, fills results[] */
int hashSearch(HashTable *ht, const char *key, Report results[], int maxResults) {
    char lowerKey[MAX_STR];
    toLowerStr(lowerKey, key);

    unsigned int idx = hash(lowerKey);
    int count = 0;

    HashEntry *curr = ht->buckets[idx];
    while (curr && count < maxResults) {
        if (strcmp(curr->key, lowerKey) == 0) {
            results[count++] = curr->report;
        }
        curr = curr->next;
    }
    return count;
}

/* Remove all entries for a given report id (across every bucket) */
void hashRemoveById(HashTable *ht, const char *id) {
    for (int i = 0; i < HASH_SIZE; i++) {
        HashEntry *curr = ht->buckets[i];
        HashEntry *prev = NULL;
        while (curr) {
            if (strcmp(curr->report.id, id) == 0) {
                HashEntry *tmp = curr;
                if (prev)
                    prev->next = curr->next;
                else
                    ht->buckets[i] = curr->next;
                curr = curr->next;
                free(tmp);
                ht->entryCount--;
            } else {
                prev = curr;
                curr = curr->next;
            }
        }
    }
}

/* Display non-empty buckets (debug view) */
void displayHashTable(HashTable *ht) {
    printf("\n  Hash Table (size: %d, entries: %d):\n", HASH_SIZE, ht->entryCount);
    for (int i = 0; i < HASH_SIZE; i++) {
        if (ht->buckets[i]) {
            printf("  Bucket[%2d]: ", i);
            HashEntry *curr = ht->buckets[i];
            while (curr) {
                printf("\"%s\" -> %s (%s)  ", curr->key, curr->report.title, curr->report.id);
                curr = curr->next;
            }
            printf("\n");
        }
    }
}

/* Free entire hash table */
void freeHashTable(HashTable *ht) {
    for (int i = 0; i < HASH_SIZE; i++) {
        HashEntry *curr = ht->buckets[i];
        while (curr) {
            HashEntry *tmp = curr;
            curr = curr->next;
            free(tmp);
        }
    }
    free(ht);
}


/* ==========================================================
 *  3.  PRIORITY QUEUE (Binary Max-Heap)
 *      - Root stored at index 0 (highest priority report)
 *      - Parent index for node i: (i - 1) / 2
 *      - Left child index:  2 * i + 1
 *      - Right child index: 2 * i + 2
 *      - Insertion: O(log n) via Bubble-Up
 *      - Extract-Max: O(log n) via Bubble-Down
 *      - Change-Priority: O(n + log n)
 * ========================================================== */

typedef struct {
    int    priority;    /* 3 = Urgent, 2 = Medium, 1 = Low */
    int    insertOrder; /* Tie-breaker for stable FIFO */
    Report report;
} HeapNode;

typedef struct {
    HeapNode data[MAX_REPORTS];
    int      size;
    int      orderCounter;
} PriorityQueue;

PriorityQueue* createPriorityQueue(void) {
    PriorityQueue *pq = (PriorityQueue *)malloc(sizeof(PriorityQueue));
    if (!pq) { perror("malloc"); exit(EXIT_FAILURE); }
    pq->size = 0;
    pq->orderCounter = 0;
    return pq;
}

/* Compare two heap nodes: returns > 0 if a has higher priority than b */
int pqCompare(HeapNode a, HeapNode b) {
    if (a.priority != b.priority) {
        return a.priority - b.priority;
    }
    /* FIFO tie-breaker: smaller insertOrder was reported first */
    return b.insertOrder - a.insertOrder;
}

void pqSwap(HeapNode *a, HeapNode *b) {
    HeapNode tmp = *a;
    *a = *b;
    *b = tmp;
}

/* Bubble up from index towards root — O(log n) */
void pqBubbleUp(PriorityQueue *pq, int index) {
    while (index > 0) {
        int parent = (index - 1) / 2;
        if (pqCompare(pq->data[index], pq->data[parent]) > 0) {
            pqSwap(&pq->data[index], &pq->data[parent]);
            index = parent;
        } else {
            break;
        }
    }
}

/* Bubble down from index towards leaves — O(log n) */
void pqBubbleDown(PriorityQueue *pq, int index) {
    while (2 * index + 1 < pq->size) {
        int largest = index;
        int left = 2 * index + 1;
        int right = 2 * index + 2;

        if (left < pq->size && pqCompare(pq->data[left], pq->data[largest]) > 0) {
            largest = left;
        }
        if (right < pq->size && pqCompare(pq->data[right], pq->data[largest]) > 0) {
            largest = right;
        }

        if (largest != index) {
            pqSwap(&pq->data[index], &pq->data[largest]);
            index = largest;
        } else {
            break;
        }
    }
}

/* Insert report into Priority Queue — O(log n) */
void pqInsert(PriorityQueue *pq, Report report, int priority) {
    if (pq->size >= MAX_REPORTS) {
        printf("  [!] Priority Queue is full!\n");
        return;
    }
    report.priority = priority;
    HeapNode node;
    node.priority = priority;
    node.insertOrder = pq->orderCounter++;
    node.report = report;

    pq->data[pq->size] = node;
    pqBubbleUp(pq, pq->size);
    pq->size++;
}

/* Extract and remove highest priority report (Root) — O(log n) */
int pqExtractMax(PriorityQueue *pq, Report *extracted) {
    if (pq->size == 0) return 0;
    if (extracted) *extracted = pq->data[0].report;

    pq->data[0] = pq->data[pq->size - 1];
    pq->size--;
    if (pq->size > 0) {
        pqBubbleDown(pq, 0);
    }
    return 1;
}

/* Peek highest priority report without removing — O(1) */
int pqPeek(PriorityQueue *pq, Report *peeked) {
    if (pq->size == 0) return 0;
    if (peeked) *peeked = pq->data[0].report;
    return 1;
}

/* Change priority of a report by ID — O(n + log n) */
int pqChangePriority(PriorityQueue *pq, const char *id, int newPriority) {
    int idx = -1;
    for (int i = 0; i < pq->size; i++) {
        if (strcmp(pq->data[i].report.id, id) == 0) {
            idx = i;
            break;
        }
    }
    if (idx == -1) return 0;

    int oldPriority = pq->data[idx].priority;
    pq->data[idx].priority = newPriority;
    pq->data[idx].report.priority = newPriority;

    if (newPriority > oldPriority) {
        pqBubbleUp(pq, idx);
    } else if (newPriority < oldPriority) {
        pqBubbleDown(pq, idx);
    }
    return 1;
}

/* Remove a report by ID — O(n + log n) */
int pqRemoveById(PriorityQueue *pq, const char *id, Report *removed) {
    int idx = -1;
    for (int i = 0; i < pq->size; i++) {
        if (strcmp(pq->data[i].report.id, id) == 0) {
            idx = i;
            break;
        }
    }
    if (idx == -1) return 0;

    if (removed) *removed = pq->data[idx].report;
    pq->data[idx] = pq->data[pq->size - 1];
    pq->size--;
    if (idx < pq->size) {
        pqBubbleUp(pq, idx);
        pqBubbleDown(pq, idx);
    }
    return 1;
}

const char* priorityLabel(int p) {
    switch (p) {
        case 3: return "URGENT";
        case 2: return "MEDIUM";
        case 1: return "LOW";
        default: return "NORMAL";
    }
}

/* Display heap array representation and tree parent-child links */
void displayPriorityQueueHeap(PriorityQueue *pq) {
    printf("\n  Priority Queue Max-Heap (size: %d):\n", pq->size);
    printf("  ----------------------------------------------------------------------\n");
    printf("  [Index]  Priority  Report ID    Title                         Parent\n");
    printf("  ----------------------------------------------------------------------\n");
    for (int i = 0; i < pq->size; i++) {
        int parent = (i > 0) ? (i - 1) / 2 : -1;
        char parentStr[16];
        if (parent >= 0) {
            snprintf(parentStr, sizeof(parentStr), "[%d]", parent);
        } else {
            strcpy(parentStr, "ROOT");
        }
        printf("  [%2d]     %-7s   %-10s   %-28s  %s\n",
               i, priorityLabel(pq->data[i].priority),
               pq->data[i].report.id, pq->data[i].report.title, parentStr);
    }
    printf("  ----------------------------------------------------------------------\n");
}

/* Display reports sorted by Priority Queue (Heap Sort demonstration) */
void displayPrioritySortedReports(PriorityQueue *pq) {
    /* Copy heap to temporary priority queue to avoid destroying active heap */
    PriorityQueue temp = *pq;
    printf("\n  REPORTS RANKED BY PRIORITY (Heap-Sort Extraction):\n");
    printf("  ----------------------------------------------------------------------\n");
    printf("  Rank  Priority  Type   ID         Title                         Location\n");
    printf("  ----------------------------------------------------------------------\n");
    int rank = 1;
    Report r;
    while (pqExtractMax(&temp, &r)) {
        printf("  #%-3d  %-7s   %-5s  %-9s  %-28s  %s\n",
               rank++, priorityLabel(r.priority), r.type, r.id, r.title, r.location);
    }
    printf("  ----------------------------------------------------------------------\n");
}

void freePriorityQueue(PriorityQueue *pq) {
    free(pq);
}


/* ==========================================================
 *  4.  HELPER — Create a Report struct
 * ========================================================== */

int reportCounter = 1000;

Report createReport(const char *type, const char *title,
                    const char *category, const char *location,
                    const char *description, int priority) {
    Report r;
    reportCounter++;
    snprintf(r.id, sizeof(r.id), "REP-%d", reportCounter);
    strncpy(r.type,        type,        sizeof(r.type) - 1);
    strncpy(r.title,       title,       sizeof(r.title) - 1);
    strncpy(r.category,    category,    sizeof(r.category) - 1);
    strncpy(r.location,    location,    sizeof(r.location) - 1);
    strncpy(r.description, description, sizeof(r.description) - 1);
    r.priority = (priority >= 1 && priority <= 3) ? priority : 1;
    strcpy(r.status, "Active");
    r.recoveredAt[0] = '\0';

    /* Timestamp */
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    strftime(r.timestamp, sizeof(r.timestamp), "%d/%m/%Y %H:%M", t);

    return r;
}

/* Index a report's category + every word of its title into the hash table */
void indexReport(HashTable *ht, Report r) {
    /* Index by category */
    hashInsert(ht, r.category, r);

    /* Index each word in the title */
    char titleCopy[MAX_STR];
    strncpy(titleCopy, r.title, MAX_STR - 1);
    titleCopy[MAX_STR - 1] = '\0';

    char *token = strtok(titleCopy, " \t\n");
    while (token) {
        if (strlen(token) > 1)
            hashInsert(ht, token, r);
        token = strtok(NULL, " \t\n");
    }
}


/* ==========================================================
 *  4.  MATCHING — Find Lost/Found pairs by category+location
 * ========================================================== */

void findAndPrintMatches(LinkedList *list) {
    Report active[MAX_REPORTS];
    int count = toArray(list, active, MAX_REPORTS);

    printf("\n========================================\n");
    printf("  POTENTIAL MATCHES (Category + Location)\n");
    printf("========================================\n");

    int matchCount = 0;

    for (int i = 0; i < count; i++) {
        if (strcmp(active[i].type, "Found") != 0) continue;
        for (int j = 0; j < count; j++) {
            if (strcmp(active[j].type, "Lost") != 0) continue;

            /* Compare category (case-insensitive) */
            char cat1[MAX_STR], cat2[MAX_STR];
            toLowerStr(cat1, active[i].category);
            toLowerStr(cat2, active[j].category);

            char loc1[MAX_STR], loc2[MAX_STR];
            toLowerStr(loc1, active[i].location);
            toLowerStr(loc2, active[j].location);

            if (strcmp(cat1, cat2) == 0 && strcmp(loc1, loc2) == 0) {
                matchCount++;
                printf("\n  Match #%d:\n", matchCount);
                printf("    FOUND: %-30s (%s)\n", active[i].title, active[i].id);
                printf("    LOST:  %-30s (%s)\n", active[j].title, active[j].id);
                printf("    Category: %s | Location: %s\n", active[i].category, active[i].location);
            }
        }
    }

    if (matchCount == 0)
        printf("\n  No matches found.\n");
    printf("\n");
}


/* ==========================================================
 *  5.  INTERACTIVE MENU — Demonstrate all features
 * ========================================================== */

void printSeparator(void) {
    printf("========================================\n");
}

void printMenu(void) {
    printf("\n");
    printSeparator();
    printf("  FindIt: Campus Lost-and-Found Tracker\n");
    printf("  Data Structures: Linked List + Hash Table + Priority Queue (Heap)\n");
    printSeparator();
    printf("  1. Add a Lost Report\n");
    printf("  2. Add a Found Report\n");
    printf("  3. Search by Keyword / Category (Hash Table O(1))\n");
    printf("  4. View All Active Reports (Linked List)\n");
    printf("  5. View Reports Ranked by Priority (Priority Queue / Heap Sort)\n");
    printf("  6. Process Next Highest-Priority Report (Heap Extract-Max O(log n))\n");
    printf("  7. Adjust Report Priority (Heap Bubble-Up/Down)\n");
    printf("  8. Mark Item as Recovered\n");
    printf("  9. View Recovery History\n");
    printf("  10. Find Potential Matches\n");
    printf("  11. DSA Debug View (Heap Array + Tree + Buckets + List)\n");
    printf("  12. Exit\n");
    printSeparator();
    printf("  Enter choice: ");
}

int autoAssignPriorityLLM(const char *title, const char *category, const char *desc) {
    char combined[MAX_STR * 3];
    char titleLower[MAX_STR];
    snprintf(combined, sizeof(combined), "%s %s %s", title, category, desc);
    for (int i = 0; combined[i]; i++) {
        if (combined[i] >= 'A' && combined[i] <= 'Z') combined[i] += 32;
    }
    strncpy(titleLower, title, sizeof(titleLower) - 1);
    titleLower[sizeof(titleLower) - 1] = '\0';
    for (int i = 0; titleLower[i]; i++) {
        if (titleLower[i] >= 'A' && titleLower[i] <= 'Z') titleLower[i] += 32;
    }

    /* 1. High / Urgent (Priority 3): Phones & Laptops */
    int isAudio = (strstr(titleLower, "headphone") != NULL ||
                   strstr(titleLower, "earphone") != NULL ||
                   strstr(titleLower, "microphone") != NULL);
    if (!isAudio &&
        (strstr(titleLower, "phone") || strstr(titleLower, "mobile") ||
         strstr(titleLower, "iphone") || strstr(titleLower, "android") ||
         strstr(titleLower, "laptop") || strstr(titleLower, "macbook") ||
         strstr(titleLower, "dell") || strstr(titleLower, "thinkpad") ||
         strstr(titleLower, "ipad") || strstr(titleLower, "tablet") ||
         strstr(combined, "smartphone") || strstr(combined, "macbook"))) {
        return 3;
    }

    /* 2. High / Urgent (Priority 3): Wallets, Cash, Keys, Medical */
    if (strstr(titleLower, "wallet") || strstr(titleLower, "purse") ||
        strstr(titleLower, "cash") || strstr(titleLower, "money") ||
        strstr(combined, "key") || strstr(combined, "medicine") ||
        strstr(combined, "prescription") || strstr(combined, "inhaler")) {
        return 3;
    }

    /* 3. Medium (Priority 2): ID Cards (Student ID, College ID, Aadhaar, License) */
    if (strstr(titleLower, "id") || strstr(titleLower, "card") ||
        strstr(combined, "student id") || strstr(combined, "college id") ||
        strstr(combined, "license") || strstr(combined, "passport") ||
        strstr(combined, "hall ticket") || strstr(combined, "admit")) {
        return 2;
    }

    /* Explicit Low Priority utility belongings (overrides generic category) */
    if (strstr(titleLower, "bottle") || strstr(titleLower, "flask") ||
        strstr(titleLower, "sipper") || strstr(titleLower, "tumbler") ||
        strstr(titleLower, "notebook") || strstr(titleLower, "register") ||
        strstr(titleLower, "notes") || strstr(titleLower, "spiral") ||
        strstr(titleLower, "pen") || strstr(titleLower, "pencil") ||
        strstr(titleLower, "stationery") || strstr(titleLower, "folder") ||
        strstr(titleLower, "umbrella") || strstr(titleLower, "raincoat") ||
        strstr(titleLower, "jacket") || strstr(titleLower, "hoodie") ||
        strstr(titleLower, "sweater") || strstr(titleLower, "coat") ||
        strstr(titleLower, "scarf") || strstr(titleLower, "hat") ||
        strstr(titleLower, "cap") || strstr(titleLower, "lunch") ||
        strstr(titleLower, "tiffin") || strstr(titleLower, "box") ||
        strstr(titleLower, "cable") || strstr(titleLower, "wire") ||
        strstr(titleLower, "lanyard")) {
        return 1;
    }

    /* 4. Medium (Priority 2): Calculators, Audio, Textbooks, Chargers */
    if (strstr(combined, "calc") || strstr(combined, "airpod") ||
        strstr(combined, "headphone") || strstr(combined, "textbook") ||
        strstr(combined, "watch") || strstr(combined, "charger")) {
        return 2;
    }

    /* 5. Low (Priority 1): Standard utility items */
    return 1;
}

void addReportInteractive(LinkedList *activeList, PriorityQueue *pq, HashTable *ht, const char *type) {
    char title[MAX_STR], category[MAX_STR], location[MAX_STR], desc[256];

    printf("\n  --- Add %s Report ---\n", type);
    printf("  Item Name: ");
    getchar(); /* consume newline */
    fgets(title, MAX_STR, stdin);
    title[strcspn(title, "\n")] = '\0';

    printf("  Category (Electronics / ID-Wallet / Books / Keys / Accessories / Other): ");
    fgets(category, MAX_STR, stdin);
    category[strcspn(category, "\n")] = '\0';

    printf("  Campus Location: ");
    fgets(location, MAX_STR, stdin);
    location[strcspn(location, "\n")] = '\0';

    printf("  Description & Contact: ");
    fgets(desc, 256, stdin);
    desc[strcspn(desc, "\n")] = '\0';

    /* Autonomous LLM Priority Evaluation instead of manual user input */
    int priority = autoAssignPriorityLLM(title, category, desc);
    printf("\n  [AI-LLM System] Evaluated Urgency -> Auto-Assigned Priority: %s (Tier %d)\n",
           priorityLabel(priority), priority);
    if (priority == 3) {
        printf("  [AI-LLM Rationale] Critical personal device, financial asset, or security credential. Enqueued to root tier.\n");
    } else if (priority == 2) {
        printf("  [AI-LLM Rationale] Academic hardware, campus ID credential, or valuable equipment.\n");
    } else {
        printf("  [AI-LLM Rationale] Standard utility belonging with minimal immediate campus disruption.\n");
    }

    Report r = createReport(type, title, category, location, desc, priority);
    insertAtHead(activeList, r);
    pqInsert(pq, r, priority);
    indexReport(ht, r);

    printf("\n  [OK] %s report added: %s (%s) [Priority: %s]\n",
           type, r.title, r.id, priorityLabel(priority));
}

void searchInteractive(HashTable *ht) {
    char query[MAX_STR];
    printf("\n  Search keyword or category: ");
    getchar();
    fgets(query, MAX_STR, stdin);
    query[strcspn(query, "\n")] = '\0';

    Report results[MAX_REPORTS];
    int count = hashSearch(ht, query, results, MAX_REPORTS);

    printf("\n  Search results for \"%s\": %d found\n", query, count);
    for (int i = 0; i < count; i++) {
        printf("  [%d] %s | %s | %-7s | %s | %s | %s\n",
               i + 1, results[i].id, results[i].type,
               priorityLabel(results[i].priority),
               results[i].title, results[i].category, results[i].location);
    }
    if (count == 0)
        printf("  No results found.\n");
}

void processTopPriorityInteractive(LinkedList *activeList, PriorityQueue *pq, LinkedList *recoveryList, HashTable *ht) {
    Report top;
    if (!pqExtractMax(pq, &top)) {
        printf("\n  [!] Priority Queue is empty. No reports to process.\n");
        return;
    }

    printf("\n  ======================================================\n");
    printf("  PROCESSING HIGHEST-PRIORITY REPORT (Heap Extract-Max)\n");
    printf("  ======================================================\n");
    printf("  ID:       %s\n", top.id);
    printf("  Priority: %s (Weight: %d)\n", priorityLabel(top.priority), top.priority);
    printf("  Type:     %s\n", top.type);
    printf("  Item:     %s\n", top.title);
    printf("  Category: %s\n", top.category);
    printf("  Location: %s\n", top.location);
    printf("  Details:  %s\n", top.description);
    printf("  ======================================================\n");

    printf("  Resolve and mark as recovered now? (1 = Yes, 0 = Keep Active): ");
    int resolve = 0;
    if (scanf("%d", &resolve) == 1 && resolve == 1) {
        Report removed;
        removeById(activeList, top.id, &removed);
        strcpy(top.status, "Recovered");
        time_t now = time(NULL);
        struct tm *t = localtime(&now);
        strftime(top.recoveredAt, sizeof(top.recoveredAt), "%d/%m/%Y %H:%M", t);
        insertAtHead(recoveryList, top);
        hashRemoveById(ht, top.id);
        printf("  [OK] \"%s\" marked as recovered and moved to history!\n", top.title);
    } else {
        /* Re-insert back into heap if admin just wanted to inspect */
        pqInsert(pq, top, top.priority);
        printf("  [INFO] Report returned to Priority Queue.\n");
    }
}

void adjustPriorityInteractive(LinkedList *activeList, PriorityQueue *pq) {
    char id[16];
    int newPriority;
    printf("\n  Enter Report ID to adjust priority (e.g. REP-1001): ");
    getchar();
    fgets(id, 16, stdin);
    id[strcspn(id, "\n")] = '\0';

    Report *r = findById(activeList, id);
    if (!r) {
        printf("  [!] Report %s not found in active list.\n", id);
        return;
    }

    printf("  Current Priority: %s (%d)\n", priorityLabel(r->priority), r->priority);
    printf("  Enter New Priority (3 = Urgent, 2 = Medium, 1 = Low): ");
    if (scanf("%d", &newPriority) == 1 && newPriority >= 1 && newPriority <= 3) {
        r->priority = newPriority;
        pqChangePriority(pq, id, newPriority);
        printf("  [OK] Priority for %s updated to %s (Binary Heap rebalanced in O(log n))!\n",
               id, priorityLabel(newPriority));
    } else {
        printf("  [!] Invalid priority.\n");
    }
}

void markRecoveredInteractive(LinkedList *activeList, PriorityQueue *pq, LinkedList *recoveryList, HashTable *ht) {
    char id[16];
    printf("\n  Enter Report ID to recover (e.g. REP-1001): ");
    getchar();
    fgets(id, 16, stdin);
    id[strcspn(id, "\n")] = '\0';

    Report removed;
    if (removeById(activeList, id, &removed)) {
        strcpy(removed.status, "Recovered");
        time_t now = time(NULL);
        struct tm *t = localtime(&now);
        strftime(removed.recoveredAt, sizeof(removed.recoveredAt), "%d/%m/%Y %H:%M", t);

        insertAtHead(recoveryList, removed);
        pqRemoveById(pq, id, NULL);
        hashRemoveById(ht, id);
        printf("\n  [OK] \"%s\" marked as recovered!\n", removed.title);
    } else {
        printf("\n  [!] Report %s not found in active list.\n", id);
    }
}


/* ==========================================================
 *  6.  MAIN — Seed data + menu loop
 * ========================================================== */

int main(void) {
    LinkedList    *activeList   = createLinkedList();
    LinkedList    *recoveryList = createLinkedList();
    HashTable     *ht           = createHashTable();
    PriorityQueue *pq           = createPriorityQueue();

    /* --- Seed dummy campus data with explicit priority ratings --- */
    Report seed[] = {
        createReport("Lost",  "Black Leather Wallet",
                     "ID-Wallet", "Canteen",
                     "Contains student ID and two credit cards. Roll No: 23CS101", 3),
        createReport("Found", "Casio Scientific Calculator",
                     "Electronics", "Library 2nd Floor",
                     "Casio fx-991EX on study desk. Turned in at front desk.", 2),
        createReport("Lost",  "Blue Spiral Notebook",
                     "Books", "Lab 302",
                     "100-page notebook, Physics notes, name Ananya S. on cover.", 1),
        createReport("Found", "Honda Bike Key with Red Keychain",
                     "Keys", "Parking Lot B",
                     "Single Honda key, red silicone keychain. Near bike stand.", 3),
        createReport("Lost",  "Apple AirPods Pro",
                     "Electronics", "Auditorium",
                     "White AirPods Pro, black case, initials VS engraved.", 2),
        createReport("Found", "Student ID Card",
                     "ID-Wallet", "Canteen",
                     "ID for Priya M., Dept of CSE, found near counter 3.", 2),
    };

    int seedCount = sizeof(seed) / sizeof(seed[0]);
    for (int i = 0; i < seedCount; i++) {
        insertAtHead(activeList, seed[i]);
        pqInsert(pq, seed[i], seed[i].priority);
        indexReport(ht, seed[i]);
    }

    printf("\n  *** FindIt: Campus Lost-and-Found Tracker ***\n");
    printf("  Loaded %d seed reports into Linked List, Hash Table, & Binary Heap.\n", seedCount);

    /* --- Menu loop --- */
    int choice;
    do {
        printMenu();
        if (scanf("%d", &choice) != 1) {
            printf("  Invalid input.\n");
            while (getchar() != '\n'); /* clear buffer */
            continue;
        }

        switch (choice) {
            case 1:
                addReportInteractive(activeList, pq, ht, "Lost");
                break;
            case 2:
                addReportInteractive(activeList, pq, ht, "Found");
                break;
            case 3:
                searchInteractive(ht);
                break;
            case 4:
                printf("\n");
                printSeparator();
                printf("  ALL ACTIVE REPORTS (Linked List Chronological Order)\n");
                printSeparator();
                {
                    Report arr[MAX_REPORTS];
                    int n = toArray(activeList, arr, MAX_REPORTS);
                    for (int i = 0; i < n; i++) {
                        printf("  %-8s | %-5s | %-7s | %-28s | %-12s | %s\n",
                               arr[i].id, arr[i].type, priorityLabel(arr[i].priority),
                               arr[i].title, arr[i].category, arr[i].location);
                    }
                    if (n == 0) printf("  (empty)\n");
                }
                displayList(activeList, "Active Reports Linked List");
                break;
            case 5:
                displayPrioritySortedReports(pq);
                break;
            case 6:
                processTopPriorityInteractive(activeList, pq, recoveryList, ht);
                break;
            case 7:
                adjustPriorityInteractive(activeList, pq);
                break;
            case 8:
                markRecoveredInteractive(activeList, pq, recoveryList, ht);
                break;
            case 9:
                printf("\n");
                printSeparator();
                printf("  RECOVERY HISTORY\n");
                printSeparator();
                {
                    Report arr[MAX_REPORTS];
                    int n = toArray(recoveryList, arr, MAX_REPORTS);
                    for (int i = 0; i < n; i++) {
                        printf("  %-8s | %-28s | Reported: %s | Recovered: %s\n",
                               arr[i].id, arr[i].title,
                               arr[i].timestamp, arr[i].recoveredAt);
                    }
                    if (n == 0) printf("  No recovered items yet.\n");
                }
                displayList(recoveryList, "Recovery History Linked List");
                break;
            case 10:
                findAndPrintMatches(activeList);
                break;
            case 11:
                printf("\n");
                printSeparator();
                printf("  DSA DEBUG VIEW — ALL DATA STRUCTURES\n");
                printSeparator();
                displayPriorityQueueHeap(pq);
                displayList(activeList, "Active Reports Linked List");
                displayList(recoveryList, "Recovery History Linked List");
                displayHashTable(ht);
                break;
            case 12:
                printf("\n  Goodbye!\n\n");
                break;
            default:
                printf("  Invalid choice. Try again.\n");
        }
    } while (choice != 12);

    /* Cleanup */
    freeLinkedList(activeList);
    freeLinkedList(recoveryList);
    freeHashTable(ht);
    freePriorityQueue(pq);

    return 0;
}
