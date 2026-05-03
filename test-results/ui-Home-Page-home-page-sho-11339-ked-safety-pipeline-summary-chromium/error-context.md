# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui.spec.ts >> Home Page (/) >> home page shows backend-backed safety pipeline summary
- Location: tests/ui.spec.ts:30:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /System Trust Layer|ผู้ใช้งานทุกบทบาทอยู่ภายใต้โครงสร้างความปลอดภัยเดียวกัน|Trace Console|AI Control Tower/
Received string:  "
    กำลังโหลดหน้าระบบ...····
"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e4]: กำลังโหลดหน้าระบบ...
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  4   | 
  5   | // ─── helpers ───────────────────────────────────────────────────────────────
  6   | 
  7   | async function goto(page: Page, path: string) {
  8   |   await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  9   | }
  10  | 
  11  | // ══════════════════════════════════════════════════════════════════════════════
  12  | // 1. HOME PAGE
  13  | // ══════════════════════════════════════════════════════════════════════════════
  14  | 
  15  | test.describe("Home Page (/)", () => {
  16  |   test("loads and shows hero heading", async ({ page }) => {
  17  |     await goto(page, "/");
  18  |     await expect(page.locator("h1")).toContainText("LegalGuard");
  19  |   });
  20  | 
  21  |   test("shows role cards including the IT control tower", async ({ page }) => {
  22  |     await goto(page, "/");
  23  |     await page.locator("#roles").scrollIntoViewIfNeeded();
  24  |     const roleButtons = page.locator("#roles button, #roles [role=button]");
  25  |     await expect(roleButtons.first()).toBeVisible();
  26  |     const body = await page.textContent("body");
  27  |     expect(body).toMatch(/ฝ่ายไอที \/ ผู้ดูแลระบบ|ระบบ IT \/ แอดมิน|AI Control Tower/);
  28  |   });
  29  | 
  30  |   test("home page shows backend-backed safety pipeline summary", async ({ page }) => {
  31  |     await goto(page, "/");
  32  |     const body = await page.textContent("body");
> 33  |     expect(body).toMatch(/System Trust Layer|ผู้ใช้งานทุกบทบาทอยู่ภายใต้โครงสร้างความปลอดภัยเดียวกัน|Trace Console|AI Control Tower/);
      |                  ^ Error: expect(received).toMatch(expected)
  34  |   });
  35  | 
  36  |   test("'เริ่มค้นหาเลย' navigates to /search?role=citizen", async ({ page }) => {
  37  |     await goto(page, "/");
  38  |     await page.getByText("เริ่มค้นหาเลย").click();
  39  |     await expect(page).toHaveURL(/\/search\?role=citizen/);
  40  |   });
  41  | 
  42  |   test("navbar is visible", async ({ page }) => {
  43  |     await goto(page, "/");
  44  |     await expect(page.locator("nav")).toBeVisible();
  45  |   });
  46  | 
  47  |   test("StatsBar is visible on homepage", async ({ page }) => {
  48  |     await goto(page, "/");
  49  |     // StatsBar shows corpus/latency stats
  50  |     const body = await page.textContent("body");
  51  |     expect(body).toMatch(/160,000\+|OpenLaw Thailand Dataset|PDPA 100%/);
  52  |   });
  53  | 
  54  |   test("footer is visible", async ({ page }) => {
  55  |     await goto(page, "/");
  56  |     await page.locator("footer").scrollIntoViewIfNeeded();
  57  |     await expect(page.locator("footer")).toBeVisible();
  58  |   });
  59  | });
  60  | 
  61  | // ══════════════════════════════════════════════════════════════════════════════
  62  | // 2. SEARCH PAGE
  63  | // ══════════════════════════════════════════════════════════════════════════════
  64  | 
  65  | test.describe("Search Page (/search)", () => {
  66  |   test("loads with citizen role label", async ({ page }) => {
  67  |     await goto(page, "/search?role=citizen");
  68  |     await expect(page.getByRole("heading", { name: "สืบค้นข้อมูลกฎหมาย" })).toBeVisible();
  69  |     await expect(page.getByText("ประชาชนทั่วไป")).toBeVisible();
  70  |   });
  71  | 
  72  |   test("shows empty state before search", async ({ page }) => {
  73  |     await goto(page, "/search?role=citizen");
  74  |     await expect(page.getByText("เริ่มต้นสืบค้น")).toBeVisible();
  75  |   });
  76  | 
  77  |   test("search box accepts Thai text", async ({ page }) => {
  78  |     await goto(page, "/search?role=citizen");
  79  |     const input = page.locator("input[type=search], input[placeholder*='ค้นหา'], input[placeholder*='พิมพ์']").first();
  80  |     await input.fill("ฉ้อโกง");
  81  |     await expect(input).toHaveValue("ฉ้อโกง");
  82  |   });
  83  | 
  84  |   test("search returns results for ฉ้อโกง", async ({ page }) => {
  85  |     await goto(page, "/search?role=citizen");
  86  |     const input = page.locator("input").first();
  87  |     await input.fill("ฉ้อโกง");
  88  |     await input.press("Enter");
  89  |     // Wait for loading to finish
  90  |     await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
  91  |     const body = await page.textContent("body");
  92  |     expect(body).toMatch(/ฉ้อโกง|คำพิพากษา|ผลลัพธ์/);
  93  |   });
  94  | 
  95  |   test("sort dropdown is visible after search", async ({ page }) => {
  96  |     await goto(page, "/search?role=citizen");
  97  |     const input = page.locator("input").first();
  98  |     await input.fill("ลักทรัพย์");
  99  |     await input.press("Enter");
  100 |     await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
  101 |     await expect(page.locator("select").last()).toBeVisible();
  102 |   });
  103 | 
  104 |   test("role=government shows government label", async ({ page }) => {
  105 |     await goto(page, "/search?role=government");
  106 |     await expect(page.getByText("เจ้าหน้าที่รัฐ")).toBeVisible();
  107 |   });
  108 | 
  109 |   test("role=lawyer shows lawyer label", async ({ page }) => {
  110 |     await goto(page, "/search?role=lawyer");
  111 |     await expect(page.getByText("ทนายความ / นักกฎหมาย").first()).toBeVisible();
  112 |   });
  113 | 
  114 |   test("CFS score appears after search", async ({ page }) => {
  115 |     await goto(page, "/search?role=citizen");
  116 |     const input = page.locator("input").first();
  117 |     await input.fill("คดียาเสพติด");
  118 |     await input.press("Enter");
  119 |     await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
  120 |     const body = await page.textContent("body");
  121 |     expect(body).toMatch(/CFS|ยุติธรรม/);
  122 |   });
  123 | });
  124 | 
  125 | // ══════════════════════════════════════════════════════════════════════════════
  126 | // 3. JUDGMENT DETAIL PAGE
  127 | // ══════════════════════════════════════════════════════════════════════════════
  128 | 
  129 | test.describe("Judgment Detail Page (/judgment/:id)", () => {
  130 |   test("loads a known judgment (jdg-001)", async ({ page }) => {
  131 |     await goto(page, "/judgment/jdg-001");
  132 |     const body = await page.textContent("body");
  133 |     // Should show either judgment content or "not found"
```