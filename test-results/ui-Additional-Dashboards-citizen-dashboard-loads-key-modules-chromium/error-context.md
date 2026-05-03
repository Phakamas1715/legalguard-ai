# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui.spec.ts >> Additional Dashboards >> citizen dashboard loads key modules
- Location: tests/ui.spec.ts:284:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /ยินดีต้อนรับ|ผู้ช่วยทางกฎหมายอัจฉริยะ|ค้นหาศาล|พยากรณ์ผลคดี/
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
  187 |     expect(body).toMatch(/ยังไม่มี|ไม่พบ|empty|ประวัติ/i);
  188 |   });
  189 | });
  190 | 
  191 | // ══════════════════════════════════════════════════════════════════════════════
  192 | // 6. GOVERNMENT DASHBOARD
  193 | // ══════════════════════════════════════════════════════════════════════════════
  194 | 
  195 | test.describe("Government Dashboard (/government)", () => {
  196 |   test("loads dashboard heading", async ({ page }) => {
  197 |     await goto(page, "/government");
  198 |     const body = await page.textContent("body");
  199 |     expect(body).toMatch(/รัฐ|ราชการ|Dashboard|เจ้าหน้าที่|Clerk Copilot/i);
  200 |   });
  201 | 
  202 |   test("shows overview tab by default", async ({ page }) => {
  203 |     await goto(page, "/government");
  204 |     const body = await page.textContent("body");
  205 |     expect(body).toMatch(/ภาพรวม|Overview|สถิติ/i);
  206 |   });
  207 | 
  208 |   test("PII Masking tab is clickable", async ({ page }) => {
  209 |     await goto(page, "/government");
  210 |     const piiTab = page.getByText(/PII|ข้อมูลส่วนตัว|ปกปิด/i).first();
  211 |     if (await piiTab.isVisible()) {
  212 |       await piiTab.click();
  213 |       const body = await page.textContent("body");
  214 |       expect(body).toMatch(/PII|ปกปิด|mask/i);
  215 |     }
  216 |   });
  217 | 
  218 |   test("audit tab shows chain status", async ({ page }) => {
  219 |     await goto(page, "/government");
  220 |     const auditTab = page.getByText(/Audit|บันทึก|ตรวจสอบ/i).first();
  221 |     if (await auditTab.isVisible()) {
  222 |       await auditTab.click();
  223 |       const body = await page.textContent("body");
  224 |       expect(body).toMatch(/Audit|CAL-130|SHA/i);
  225 |     }
  226 |   });
  227 | 
  228 |   test("PII input accepts Thai text and masks it", async ({ page }) => {
  229 |     await goto(page, "/government");
  230 |     // Navigate to PII tab
  231 |     const piiTab = page.getByText(/PII|ข้อมูลส่วนตัว|ปกปิด/i).first();
  232 |     if (await piiTab.isVisible()) {
  233 |       await piiTab.click();
  234 |       const textarea = page.locator("textarea").first();
  235 |       if (await textarea.isVisible()) {
  236 |         await textarea.fill("นาย สมชาย ใจดี โทร 081-234-5678");
  237 |         const btn = page.locator("button:has-text('ตรวจสอบ'), button:has-text('Mask'), button:has-text('ปกปิด')").first();
  238 |         if (await btn.isVisible()) {
  239 |           await btn.click();
  240 |           await page.waitForTimeout(500);
  241 |           const body = await page.textContent("body");
  242 |           expect(body).toMatch(/ปกปิด|masked|ถูกปกปิด/i);
  243 |         }
  244 |       }
  245 |     }
  246 |   });
  247 | });
  248 | 
  249 | // ══════════════════════════════════════════════════════════════════════════════
  250 | // 7. ADDITIONAL DASHBOARDS
  251 | // ══════════════════════════════════════════════════════════════════════════════
  252 | 
  253 | test.describe("Additional Dashboards", () => {
  254 |   test("back office hub loads suite overview", async ({ page }) => {
  255 |     await goto(page, "/back-office");
  256 |     const body = await page.textContent("body");
  257 |     expect(body).toMatch(/One Platform, Three Back-Office Dashboards|Clerk Copilot|Judge Workbench|AI Control Tower|Demo Path พร้อมใช้/);
  258 |   });
  259 | 
  260 |   test("clerk copilot dashboard loads", async ({ page }) => {
  261 |     await goto(page, "/clerk-copilot");
  262 |     const body = await page.textContent("body");
  263 |     expect(body).toMatch(/Clerk Copilot|ธุรการศาลแบบ end-to-end|Workflow Coverage/);
  264 |   });
  265 | 
  266 |   test("judge workbench dashboard loads", async ({ page }) => {
  267 |     await goto(page, "/judge-workbench");
  268 |     const body = await page.textContent("body");
  269 |     expect(body).toMatch(/Judge Workbench|เครื่องมือช่วยผู้พิพากษา|Judicial Support Modules/);
  270 |   });
  271 | 
  272 |   test("AI control tower dashboard loads", async ({ page }) => {
  273 |     await goto(page, "/ai-control-tower");
  274 |     const body = await page.textContent("body");
  275 |     expect(body).toMatch(/AI Control Tower|ศูนย์ควบคุม AI หลังบ้าน|Observability Snapshot|Demo Flow|Runtime Readiness Evidence|Trace Console/);
  276 |   });
  277 | 
  278 |   test("trace console loads runtime L0-L6 debug view", async ({ page }) => {
  279 |     await goto(page, "/trace-console");
  280 |     const body = await page.textContent("body");
  281 |     expect(body).toMatch(/Trace Console|L0-L6 Runtime Trace|Feynman Multi-Agent Engine|L6 Agent Breakdown/);
  282 |   });
  283 | 
  284 |   test("citizen dashboard loads key modules", async ({ page }) => {
  285 |     await goto(page, "/citizen");
  286 |     const body = await page.textContent("body");
> 287 |     expect(body).toMatch(/ยินดีต้อนรับ|ผู้ช่วยทางกฎหมายอัจฉริยะ|ค้นหาศาล|พยากรณ์ผลคดี/);
      |                  ^ Error: expect(received).toMatch(expected)
  288 |   });
  289 | 
  290 |   test("lawyer dashboard route is hidden from public app", async ({ page }) => {
  291 |     await goto(page, "/lawyer");
  292 |     const body = await page.textContent("body");
  293 |     expect(body).toMatch(/Oops! Page not found|404|ไม่พบ/i);
  294 |   });
  295 | 
  296 |   test("judge dashboard loads key controls", async ({ page }) => {
  297 |     await goto(page, "/judge");
  298 |     const body = await page.textContent("body");
  299 |     expect(body).toMatch(/แดชบอร์ดตุลาการ|ร่างคำพิพากษา|ตรวจสอบความเป็นธรรม|Judge Workbench|Judicial Trust Layer/);
  300 |   });
  301 | 
  302 |   test("IT dashboard loads architecture section", async ({ page }) => {
  303 |     await goto(page, "/it");
  304 |     const body = await page.textContent("body");
  305 |     expect(body).toMatch(/ระบบคัดกรองความปลอดภัย 7 ชั้น|Security Layer|Bedrock|Audit|AI Control Tower/);
  306 |   });
  307 | 
  308 |   test("IT dashboard shows observability gap closures", async ({ page }) => {
  309 |     await goto(page, "/it");
  310 |     const body = await page.textContent("body");
  311 |     expect(body).toMatch(/NitiBench Quick Benchmark|Responsible AI Snapshot|Data Classification & Access Matrix/);
  312 |   });
  313 | });
  314 | 
  315 | // ══════════════════════════════════════════════════════════════════════════════
  316 | // 8. MODULE PAGES
  317 | // ══════════════════════════════════════════════════════════════════════════════
  318 | 
  319 | test.describe("Module Pages", () => {
  320 |   test("predict page loads", async ({ page }) => {
  321 |     await goto(page, "/predict");
  322 |     const body = await page.textContent("body");
  323 |     expect(body).toMatch(/พยากรณ์ผลคดี|ผลพยากรณ์อัจฉริยะ|ข้อมูลเบื้องต้นเท่านั้น/);
  324 |   });
  325 | 
  326 |   test("glossary page loads", async ({ page }) => {
  327 |     await goto(page, "/glossary");
  328 |     const body = await page.textContent("body");
  329 |     expect(body).toMatch(/พจนานุกรมศัพท์กฎหมาย|ศัพท์กฎหมาย|ฎีกาสำคัญ/);
  330 |   });
  331 | 
  332 |   test("prompts page loads", async ({ page }) => {
  333 |     await goto(page, "/prompts");
  334 |     const body = await page.textContent("body");
  335 |     expect(body).toMatch(/คลังคำสั่ง AI มาตรฐานตุลาการ|Prompt Templates|วิธีใช้งาน/);
  336 |   });
  337 | 
  338 |   test("graph page loads", async ({ page }) => {
  339 |     await goto(page, "/graph");
  340 |     const body = await page.textContent("body");
  341 |     expect(body).toMatch(/Knowledge Graph|สร้าง Knowledge Graph|สถิติ Knowledge Graph/);
  342 |   });
  343 | 
  344 |   test("courts page loads", async ({ page }) => {
  345 |     await goto(page, "/courts");
  346 |     const body = await page.textContent("body");
  347 |     expect(body).toMatch(/ค้นหาศาล|รายชื่อศาลทั้งหมด|ศาลใกล้ฉัน/);
  348 |   });
  349 | 
  350 |   test("responsible ai page loads", async ({ page }) => {
  351 |     await goto(page, "/responsible-ai");
  352 |     const body = await page.textContent("body");
  353 |     expect(body).toMatch(/Responsible AI Dashboard|Risk Tier|Release Guard|TLAGF/);
  354 |   });
  355 | 
  356 |   test("system demo page loads", async ({ page }) => {
  357 |     await goto(page, "/demo");
  358 |     const body = await page.textContent("body");
  359 |     expect(body).toMatch(/LegalGuard AI Simulator|Real-time System Simulator|System Flow Visualizer/);
  360 |   });
  361 | 
  362 |   test("analyze case page loads", async ({ page }) => {
  363 |     await goto(page, "/analyze");
  364 |     const body = await page.textContent("body");
  365 |     expect(body).toMatch(/วิเคราะห์สำนวนคดี|ใส่สำนวนคดี|คำแนะนำ/);
  366 |   });
  367 | });
  368 | 
  369 | // ══════════════════════════════════════════════════════════════════════════════
  370 | // 9. COMPLAINT FORM PAGE
  371 | // ══════════════════════════════════════════════════════════════════════════════
  372 | 
  373 | test.describe("Complaint Form (/complaint-form)", () => {
  374 |   test("loads form page", async ({ page }) => {
  375 |     await goto(page, "/complaint-form");
  376 |     const body = await page.textContent("body");
  377 |     expect(body).toMatch(/คำฟ้อง|ร้องเรียน|Complaint|ยื่น/i);
  378 |   });
  379 | 
  380 |   test("form has required input fields", async ({ page }) => {
  381 |     await goto(page, "/complaint-form");
  382 |     // Should have at least one input
  383 |     const inputs = page.locator("input, textarea, select");
  384 |     const count = await inputs.count();
  385 |     expect(count).toBeGreaterThan(0);
  386 |   });
  387 | 
```