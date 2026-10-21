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
 *  3.  HELPER — Create a Report struct
 * ========================================================== */

int reportCounter = 1000;

Report createReport(const char *type, const char *title,
                    const char *category, const char *location,
                    const char *description) {
    Report r;
    reportCounter++;
    snprintf(r.id, sizeof(r.id), "REP-%d", reportCounter);
    strncpy(r.type,        type,        sizeof(r.type) - 1);
    strncpy(r.title,       title,       sizeof(r.title) - 1);
    strncpy(r.category,    category,    sizeof(r.category) - 1);
    strncpy(r.location,    location,    sizeof(r.location) - 1);
    strncpy(r.description, description, sizeof(r.description) - 1);
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
    printf("  Data Structures: Linked List + Hash Table\n");
    printSeparator();
    printf("  1. Add a Lost Report\n");
    printf("  2. Add a Found Report\n");
    printf("  3. Search by Keyword / Category\n");
    printf("  4. View All Active Reports\n");
    printf("  5. Mark Item as Recovered\n");
    printf("  6. View Recovery History\n");
    printf("  7. Find Potential Matches\n");
    printf("  8. DSA Debug View\n");
    printf("  9. Exit\n");
    printSeparator();
    printf("  Enter choice: ");
}

void addReportInteractive(LinkedList *activeList, HashTable *ht, const char *type) {
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

    Report r = createReport(type, title, category, location, desc);
    insertAtHead(activeList, r);
    indexReport(ht, r);

    printf("\n  [OK] %s report added: %s (%s)\n", type, r.title, r.id);
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
        printf("  [%d] %s | %s | %s | %s | %s\n",
               i + 1, results[i].id, results[i].type,
               results[i].title, results[i].category, results[i].location);
    }
    if (count == 0)
        printf("  No results found.\n");
}

void markRecoveredInteractive(LinkedList *activeList, LinkedList *recoveryList, HashTable *ht) {
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
    LinkedList *activeList   = createLinkedList();
    LinkedList *recoveryList = createLinkedList();
    HashTable  *ht           = createHashTable();

    /* --- Seed dummy campus data --- */
    Report seed[] = {
        createReport("Lost",  "Black Leather Wallet",
                     "ID-Wallet", "Canteen",
                     "Contains student ID and two credit cards. Roll No: 23CS101"),
        createReport("Found", "Casio Scientific Calculator",
                     "Electronics", "Library 2nd Floor",
                     "Casio fx-991EX on study desk. Turned in at front desk."),
        createReport("Lost",  "Blue Spiral Notebook",
                     "Books", "Lab 302",
                     "100-page notebook, Physics notes, name Ananya S. on cover."),
        createReport("Found", "Honda Bike Key with Red Keychain",
                     "Keys", "Parking Lot B",
                     "Single Honda key, red silicone keychain. Near bike stand."),
        createReport("Lost",  "Apple AirPods Pro",
                     "Electronics", "Auditorium",
                     "White AirPods Pro, black case, initials VS engraved."),
        createReport("Found", "Student ID Card",
                     "ID-Wallet", "Canteen",
                     "ID for Priya M., Dept of CSE, found near counter 3."),
    };

    int seedCount = sizeof(seed) / sizeof(seed[0]);
    for (int i = 0; i < seedCount; i++) {
        insertAtHead(activeList, seed[i]);
        indexReport(ht, seed[i]);
    }

    printf("\n  *** FindIt: Campus Lost-and-Found Tracker ***\n");
    printf("  Loaded %d seed reports.\n", seedCount);

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
                addReportInteractive(activeList, ht, "Lost");
                break;
            case 2:
                addReportInteractive(activeList, ht, "Found");
                break;
            case 3:
                searchInteractive(ht);
                break;
            case 4:
                printf("\n");
                printSeparator();
                printf("  ALL ACTIVE REPORTS\n");
                printSeparator();
                {
                    Report arr[MAX_REPORTS];
                    int n = toArray(activeList, arr, MAX_REPORTS);
                    for (int i = 0; i < n; i++) {
                        printf("  %-8s | %-6s | %-28s | %-12s | %s\n",
                               arr[i].id, arr[i].type, arr[i].title,
                               arr[i].category, arr[i].location);
                    }
                    if (n == 0) printf("  (empty)\n");
                }
                displayList(activeList, "Active Reports Linked List");
                break;
            case 5:
                markRecoveredInteractive(activeList, recoveryList, ht);
                break;
            case 6:
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
            case 7:
                findAndPrintMatches(activeList);
                break;
            case 8:
                printf("\n");
                printSeparator();
                printf("  DSA DEBUG VIEW\n");
                printSeparator();
                displayList(activeList, "Active Reports Linked List");
                displayList(recoveryList, "Recovery History Linked List");
                displayHashTable(ht);
                break;
            case 9:
                printf("\n  Goodbye!\n\n");
                break;
            default:
                printf("  Invalid choice. Try again.\n");
        }
    } while (choice != 9);

    /* Cleanup */
    freeLinkedList(activeList);
    freeLinkedList(recoveryList);
    freeHashTable(ht);

    return 0;
}
