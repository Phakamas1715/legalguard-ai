# Tasks: Lawyer Professional Suite

## Phase 1 — MVP (สัปดาห์ที่ 1-3)

### Auth + Subscription
- [x] 1. เพิ่ม Supabase Auth login/register pages (Email + Google OAuth)
- [x] 2. สร้าง useAuth hook (user state, login, register, logout, tier)
- [x] 3. เพิ่ม "lawyer" role ใน access_policy_service.py พร้อม feature permissions
- [x] 4. สร้าง ProtectedRoute component ตรวจ auth + tier
- [x] 5. สร้าง Pricing page (Free/Pro/Team/Enterprise)
- [ ] 6. Integrate Stripe Checkout สำหรับ Pro/Team subscription
- [ ] 7. สร้าง Stripe webhook handler → update tier ใน Supabase
- [ ] 8. สร้าง usage tracking (search_count, analysis_count per day)
- [ ] 9. Rate limiting สำหรับ Free tier (10 searches/day, 3 briefs/month)

### Case Workspace
- [ ] 9. สร้าง lawyer_workspaces + workspace_items tables
- [ ] 10. สร้าง API endpoints: CRUD workspace + items
- [ ] 11. สร้าง Workspace UI — list, create, open, archive
- [ ] 12. Auto-save ผลลัพธ์ AI (search, analysis, prediction) เข้า workspace

### Document Upload
- [ ] 13. สร้าง upload endpoint — PDF/Word → S3 → extract text → analyze
- [ ] 14. สร้าง Upload UI component พร้อม drag-and-drop
- [ ] 15. Link uploaded documents กับ workspace

### Export
- [ ] 16. สร้าง PDF export สำหรับ Case Analysis result
- [ ] 17. สร้าง PDF export สำหรับ Case Brief
- [ ] 18. สร้าง PDF export สำหรับ Precedent Compare table
- [ ] 19. เพิ่ม AI-Generated watermark ในทุก export

## Phase 2 — Professional Features (สัปดาห์ที่ 4-8)

### Document Drafting
- [ ] 20. สร้าง template library (สัญญากู้ยืม, สัญญาเช่า, หนังสือทวงถาม, คำฟ้อง)
- [ ] 21. สร้าง AI-assisted document drafting endpoint
- [ ] 22. สร้าง Document Editor UI พร้อม AI suggestions
- [ ] 23. Export draft เป็น Word (.docx)

### Research History + Bookmarks
- [ ] 24. สร้าง search_history + bookmarks tables
- [ ] 25. สร้าง API endpoints สำหรับ history + bookmarks
- [ ] 26. สร้าง History page UI
- [ ] 27. สร้าง Bookmark panel ใน search results

### Client Management (Team tier)
- [ ] 28. สร้าง clients table + link กับ workspaces
- [ ] 29. สร้าง Client Management UI
- [ ] 30. สร้าง Case Timeline component

### Billing Tracker (Team tier)
- [ ] 31. สร้าง time_entries table
- [ ] 32. สร้าง Billing Tracker UI
- [ ] 33. สร้าง Invoice PDF generator
