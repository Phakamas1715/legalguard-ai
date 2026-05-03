# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui.spec.ts >> Additional Dashboards >> IT dashboard shows observability gap closures
- Location: tests/ui.spec.ts:308:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /NitiBench Quick Benchmark|Responsible AI Snapshot|Data Classification & Access Matrix/
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
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - generic [ref=e6]:
        - link "LegalGuard AI Beta LegalGuard AI เทคโนโลยี AI เพื่อความยุติธรรมและการกำกับดูแลระดับชาติ" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e8]:
            - img "LegalGuard AI" [ref=e9]
            - generic [ref=e10]: Beta
          - generic [ref=e11]:
            - generic [ref=e12]: LegalGuard AI
            - generic [ref=e13]: เทคโนโลยี AI เพื่อความยุติธรรมและการกำกับดูแลระดับชาติ
        - generic [ref=e15]:
          - generic [ref=e16]:
            - link "หน้าแรก" [ref=e17] [cursor=pointer]:
              - /url: /
              - img [ref=e18]
              - text: หน้าแรก
            - link "สืบค้นกฎหมาย" [ref=e21] [cursor=pointer]:
              - /url: /search
              - img [ref=e22]
              - text: สืบค้นกฎหมาย
            - button "สาระความรู้เมนู" [ref=e27] [cursor=pointer]:
              - img [ref=e28]
              - text: สาระความรู้
              - img [ref=e30]
          - button "เลือกบทบาทการใช้งาน" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: ศูนย์รวม Dashboard
            - img [ref=e41]
        - generic [ref=e43]:
          - generic [ref=e44]:
            - link "บุ๊กมาร์ก" [ref=e45] [cursor=pointer]:
              - /url: /bookmarks
              - img [ref=e46]
            - link "ประวัติ" [ref=e48] [cursor=pointer]:
              - /url: /history
              - img [ref=e49]
          - generic:
            - generic:
              - img
            - generic:
              - generic: Trust & Privacy
              - generic: แสดงผลอย่างรับผิดชอบและตรวจสอบย้อนหลังได้
    - generic [ref=e52]:
      - img "IT Infrastructure" [ref=e54]
      - generic [ref=e57]:
        - img [ref=e59]
        - generic [ref=e62]:
          - generic [ref=e63]: System Administrator Console
          - heading "ระบบ IT / ผู้ดูแลระบบ" [level=1] [ref=e64]
          - paragraph [ref=e65]: ศูนย์ควบคุมโครงสร้างพื้นฐานเทคโนโลยีระดับชาติ ประสิทธิภาพ และความปลอดภัยระดับสูงสุด
    - generic [ref=e66]:
      - generic [ref=e69]:
        - generic [ref=e70]:
          - generic [ref=e71]:
            - img [ref=e72]
            - text: Control Tower Rollout
          - heading "AI Control Tower คือหน้าหลักใหม่สำหรับ monitoring และ governance" [level=2] [ref=e77]
          - paragraph [ref=e78]: หน้า IT เดิมยังเก็บเครื่องมือเชิงลึกไว้ครบ แต่ AI Control Tower ทำหน้าที่เป็น executive layer ที่พาทีม IT เห็น observability, release readiness และ operational risk ในภาพรวมเดียว
        - generic [ref=e79]:
          - link "เปิด AI Control Tower" [ref=e80] [cursor=pointer]:
            - /url: /ai-control-tower
            - generic [ref=e81]:
              - img [ref=e82]
              - text: เปิด AI Control Tower
            - img [ref=e85]
          - link "เปิด Back Office Hub" [ref=e87] [cursor=pointer]:
            - /url: /back-office
            - generic [ref=e88]:
              - img [ref=e89]
              - text: เปิด Back Office Hub
            - img [ref=e94]
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - img [ref=e100]
            - generic [ref=e102]:
              - heading "Live System Monitor" [level=3] [ref=e103]:
                - img [ref=e104]
                - text: Live System Monitor
              - generic [ref=e108]: SYSTEMS NOMINAL
            - generic [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]:
                  - img [ref=e112]
                  - text: CPU Load
                - generic [ref=e115]:
                  - text: "0"
                  - generic [ref=e116]: "%"
              - generic [ref=e117]:
                - generic [ref=e118]:
                  - img [ref=e119]
                  - text: Memory Usage
                - generic [ref=e123]:
                  - text: "4.2"
                  - generic [ref=e124]: GB / 16GB
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - img [ref=e127]
                  - text: Cache Hit Rate
                - generic [ref=e129]:
                  - text: "0.0"
                  - generic [ref=e130]: "%"
            - generic [ref=e131]: Waiting for secure connection...
          - generic [ref=e132]:
            - heading "Cloud Infrastructure (AWS EKS Cluster)" [level=3] [ref=e133]:
              - img [ref=e134]
              - text: Cloud Infrastructure (AWS EKS Cluster)
            - generic [ref=e139]:
              - generic [ref=e140]:
                - generic [ref=e143]:
                  - generic [ref=e144]: AWS EKS Cluster (ap-southeast-1)
                  - generic [ref=e145]: Active
                - generic [ref=e146]: 8ms
              - generic [ref=e147]:
                - generic [ref=e150]:
                  - generic [ref=e151]: Amazon RDS (Multi-AZ Master)
                  - generic [ref=e152]: Steady
                - generic [ref=e153]: 2ms
              - generic [ref=e154]:
                - generic [ref=e157]:
                  - generic [ref=e158]: Amazon S3 (Objects Service)
                  - generic [ref=e159]: Nominal
                - generic [ref=e160]: 45ms
              - generic [ref=e161]:
                - generic [ref=e164]:
                  - generic [ref=e165]: AWS WAF & CloudFront
                  - generic [ref=e166]: Protecting
                - generic [ref=e167]: 1ms
              - generic [ref=e168]:
                - generic [ref=e171]:
                  - generic [ref=e172]: Amazon Bedrock (LLM Gateway)
                  - generic [ref=e173]: Integrated
                - generic [ref=e174]: 242ms
        - generic [ref=e175]:
          - generic [ref=e176]:
            - heading "Trust Center & Governance" [level=2] [ref=e177]:
              - img [ref=e178]
              - text: Trust Center & Governance
            - generic [ref=e183]: ETDA Compliance Active
          - generic [ref=e184]:
            - img "High-Tech Pipeline Background" [ref=e186]
            - generic [ref=e188]:
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - heading "ระบบคัดกรองความปลอดภัย 7 ชั้น (7-Layer Safety Pipeline)" [level=3] [ref=e191]:
                    - img [ref=e192]
                    - text: ระบบคัดกรองความปลอดภัย 7 ชั้น (7-Layer Safety Pipeline)
                  - paragraph [ref=e194]: สถาปัตยกรรมป้องกันข้อมูลระดับชาติ ออกแบบโดย Honest Predictor Enterprise
                - generic [ref=e195]:
                  - img [ref=e196]
                  - generic [ref=e199]: Certified Security Layer
              - generic [ref=e202]:
                - button "STEP 01 PII Sanitization ดักจับและปกปิดข้อมูลส่วนตัว (PDPA) ทันที ดูองค์ประกอบ" [ref=e203] [cursor=pointer]:
                  - generic [ref=e204]:
                    - img [ref=e205]
                    - generic [ref=e207]: STEP 01
                  - heading "PII Sanitization" [level=4] [ref=e208]
                  - paragraph [ref=e209]: ดักจับและปกปิดข้อมูลส่วนตัว (PDPA) ทันที
                  - generic [ref=e210]: ดูองค์ประกอบ
                - button "STEP 02 Intent Routing วิเคราะห์เจตนาและส่งไปยัง AI Legal Agent ดูองค์ประกอบ" [ref=e211] [cursor=pointer]:
                  - generic [ref=e212]:
                    - img [ref=e213]
                    - generic [ref=e215]: STEP 02
                  - heading "Intent Routing" [level=4] [ref=e216]
                  - paragraph [ref=e217]: วิเคราะห์เจตนาและส่งไปยัง AI Legal Agent
                  - generic [ref=e218]: ดูองค์ประกอบ
                - button "STEP 03 Hybrid Retrieval สืบค้นกฎหมาย 160k+ ฉบับด้วย Vector & BM25 ดูองค์ประกอบ" [ref=e219] [cursor=pointer]:
                  - generic [ref=e220]:
                    - img [ref=e221]
                    - generic [ref=e225]: STEP 03
                  - heading "Hybrid Retrieval" [level=4] [ref=e226]
                  - paragraph [ref=e227]: สืบค้นกฎหมาย 160k+ ฉบับด้วย Vector & BM25
                  - generic [ref=e228]: ดูองค์ประกอบ
                - button "STEP 04 Context Filter คัดกรองเฉพาะเนื้อหาที่เกี่ยวข้องและถูกต้องแม่นยำ ดูองค์ประกอบ" [ref=e229] [cursor=pointer]:
                  - generic [ref=e230]:
                    - img [ref=e231]
                    - generic [ref=e235]: STEP 04
                  - heading "Context Filter" [level=4] [ref=e236]
                  - paragraph [ref=e237]: คัดกรองเฉพาะเนื้อหาที่เกี่ยวข้องและถูกต้องแม่นยำ
                  - generic [ref=e238]: ดูองค์ประกอบ
                - button "STEP 05 AI Guardrails AWS Bedrock ตรวจระเบียบวินัยและความลำเอียง ดูองค์ประกอบ" [ref=e239] [cursor=pointer]:
                  - generic [ref=e240]:
                    - img [ref=e241]
                    - generic [ref=e244]: STEP 05
                  - heading "AI Guardrails" [level=4] [ref=e245]
                  - paragraph [ref=e246]: AWS Bedrock ตรวจระเบียบวินัยและความลำเอียง
                  - generic [ref=e247]: ดูองค์ประกอบ
                - button "STEP 06 Halluc. Audit ตรวจสอบการมโน และระบุมาตราอ้างอิงจริง 100% ดูองค์ประกอบ" [ref=e248] [cursor=pointer]:
                  - generic [ref=e249]:
                    - img [ref=e250]
                    - generic [ref=e253]: STEP 06
                  - heading "Halluc. Audit" [level=4] [ref=e254]
                  - paragraph [ref=e255]: ตรวจสอบการมโน และระบุมาตราอ้างอิงจริง 100%
                  - generic [ref=e256]: ดูองค์ประกอบ
                - button "STEP 07 Crypto Log ประทับตรา Hash ลง Audit Log ป้องกันการแก้ไข ดูองค์ประกอบ" [ref=e257] [cursor=pointer]:
                  - generic [ref=e258]:
                    - img [ref=e259]
                    - generic [ref=e262]: STEP 07
                  - heading "Crypto Log" [level=4] [ref=e263]
                  - paragraph [ref=e264]: ประทับตรา Hash ลง Audit Log ป้องกันการแก้ไข
                  - generic [ref=e265]: ดูองค์ประกอบ
              - paragraph [ref=e267]: คลิกแต่ละชั้นเพื่อดู input, control, service และ output ของสถาปัตยกรรมจริง
            - generic [ref=e268]:
              - generic [ref=e271]: E2E Encryption Active
              - generic [ref=e273]:
                - img [ref=e274]
                - generic [ref=e276]: "System Integrity: 99.99%"
          - generic [ref=e277]:
            - generic [ref=e278]:
              - heading "Performance Metrics (เป้าหมาย)" [level=3] [ref=e279]:
                - img [ref=e280]
                - text: Performance Metrics (เป้าหมาย)
              - paragraph [ref=e282]: ค่าด้านล่างเป็นเป้าหมายจาก design doc — ค่าจริงจะวัดเมื่อ ingest ข้อมูลครบ
              - generic [ref=e283]:
                - generic [ref=e284]:
                  - generic [ref=e285]: Hit@3 Accuracy
                  - generic [ref=e286]: 93.7%
                - generic [ref=e287]:
                  - generic [ref=e288]: P95 Latency
                  - generic [ref=e289]: 689ms
                - generic [ref=e290]:
                  - generic [ref=e291]: Hallucination Rate
                  - generic [ref=e292]: < 1%
                - generic [ref=e293]:
                  - generic [ref=e294]: PII Recall
                  - generic [ref=e295]: 99.2%
                - generic [ref=e296]:
                  - generic [ref=e297]: CFS Fairness
                  - generic [ref=e298]: 93.5%
                - generic [ref=e299]:
                  - generic [ref=e300]: Honesty Score
                  - generic [ref=e301]: ≥ 0.85
                - generic [ref=e302]:
                  - generic [ref=e303]: Hybrid Search Ratio
                  - generic [ref=e304]: Semantic + Keyword Focus
                - generic [ref=e305]:
                  - generic [ref=e306]: Reranking Engine
                  - generic [ref=e307]: Advanced Safety Models
            - generic [ref=e308]:
              - heading "CFS Fairness Monitoring (เป้าหมาย)" [level=3] [ref=e309]:
                - img [ref=e310]
                - text: CFS Fairness Monitoring (เป้าหมาย)
              - paragraph [ref=e313]: ค่าจริงจะคำนวณจาก search results — ใช้ POST /dashboard/fairness
              - generic [ref=e314]:
                - generic [ref=e315]:
                  - generic [ref=e316]: 93.5%
                  - generic [ref=e317]: CFS
                - generic [ref=e318]:
                  - generic [ref=e319]: "0.85"
                  - generic [ref=e320]: H-Score
                - generic [ref=e321]:
                  - generic [ref=e322]: <1%
                  - generic [ref=e323]: Halluc.
              - generic [ref=e324]:
                - generic [ref=e325]:
                  - generic [ref=e326]: F_geo (ภูมิศาสตร์)
                  - generic [ref=e329]: 92%
                - generic [ref=e330]:
                  - generic [ref=e331]: F_court (ประเภทศาล)
                  - generic [ref=e334]: 88%
                - generic [ref=e335]:
                  - generic [ref=e336]: F_time (ช่วงเวลา)
                  - generic [ref=e339]: 95%
          - paragraph [ref=e341]:
            - img [ref=e342]
            - text: ส่วนนี้แสดงข้อมูลจาก
            - strong [ref=e345]: Trust Center
            - text: เพื่อยืนยันความโปร่งใส (Transparency) และความรับผิดชอบ (Accountability) ของระบบตามมาตรฐาน ETDA RAAIA 3.1
        - generic [ref=e346]:
          - generic [ref=e347]:
            - generic [ref=e348]:
              - img [ref=e349]
              - text: Strategic Performance Dimensions
            - heading "5 มิติที่ระบบนี้ถูกออกแบบมาเพื่อเปลี่ยนเกม" [level=2] [ref=e351]
            - paragraph [ref=e352]: "วิสัยทัศน์เบื้องหลังสถาปัตยกรรม: การนำ AI มาใช้ในกระบวนการยุติธรรมต้องวัดผลได้จริงในทุกมิติ"
          - generic [ref=e353]:
            - generic [ref=e354]:
              - img [ref=e356]
              - heading "Efficiency & Speed" [level=3] [ref=e359]
              - paragraph [ref=e360]: ลดเวลายกร่าง ตรวจร่าง และคัดกรองคำฟ้อง เพื่อลดคอขวดในกระบวนพิจารณา
              - generic [ref=e361]:
                - generic [ref=e362]: Drafting Assistant
                - generic [ref=e363]: Complaint Verification
                - generic [ref=e364]: Workflow Automation
              - generic [ref=e365]:
                - paragraph [ref=e366]: Impact KPI
                - paragraph [ref=e367]: ลดเวลายกร่าง 30-50%
            - generic [ref=e368]:
              - img [ref=e370]
              - heading "Consistency & Accuracy" [level=3] [ref=e373]
              - paragraph [ref=e374]: ยกระดับการค้นคืนคำพิพากษาและข้อกฎหมายให้สม่ำเสมอ เข้าใจบริบท และอ้างอิงได้จริง
              - generic [ref=e375]:
                - generic [ref=e376]: Semantic Search
                - generic [ref=e377]: Precedent Recommendation
                - generic [ref=e378]: Predictive Model
              - generic [ref=e379]:
                - paragraph [ref=e380]: Impact KPI
                - paragraph [ref=e381]: Citation Accuracy >= 95%
            - generic [ref=e382]:
              - img [ref=e384]
              - heading "Data-Driven Management" [level=3] [ref=e386]
              - paragraph [ref=e387]: มองเห็นสถานการณ์คดีแบบใกล้ real-time ระบุ bottleneck และช่วยจัดสรรสำนวนตามภาระงาน
              - generic [ref=e388]:
                - generic [ref=e389]: Executive Dashboard
                - generic [ref=e390]: Bottleneck Analytics
                - generic [ref=e391]: Workload Allocation
              - generic [ref=e392]:
                - paragraph [ref=e393]: Impact KPI
                - paragraph [ref=e394]: ลดคดีค้าง 10-25%
            - generic [ref=e395]:
              - img [ref=e397]
              - heading "Public Service & Accessibility" [level=3] [ref=e402]
              - paragraph [ref=e403]: ให้ประชาชนเข้าถึงบริการศาลได้จากที่บ้าน พร้อม AI ช่วยอธิบายสิทธิ ขั้นตอน และศาลที่เกี่ยวข้อง
              - generic [ref=e404]:
                - generic [ref=e405]: e-Filing
                - generic [ref=e406]: Citizen Chatbot
                - generic [ref=e407]: Court Lookup
              - generic [ref=e408]:
                - paragraph [ref=e409]: Impact KPI
                - paragraph [ref=e410]: เข้าถึงบริการภายในวันเดียว
            - generic [ref=e411]:
              - img [ref=e413]
              - heading "Transparency & Trust" [level=3] [ref=e415]
              - paragraph [ref=e416]: ทำให้ทุกการตัดสินใจของระบบตรวจสอบย้อนหลังได้ พร้อมปกปิดข้อมูลส่วนบุคคลอย่างเป็นระบบ
              - generic [ref=e417]:
                - generic [ref=e418]: Audit Log
                - generic [ref=e419]: PII Masking
                - generic [ref=e420]: Explainability
                - generic [ref=e421]: Access Control
              - generic [ref=e422]:
                - paragraph [ref=e423]: Impact KPI
                - paragraph [ref=e424]: Audit Coverage 100%
        - generic [ref=e425]:
          - heading "Infrastructure Persistence & AWS Cloud Management" [level=3] [ref=e426]:
            - img [ref=e427]
            - text: Infrastructure Persistence & AWS Cloud Management
          - generic [ref=e430]:
            - generic [ref=e431]:
              - generic [ref=e432]: "1"
              - generic [ref=e433]: AWS EKS (Kubernetes)
              - generic [ref=e434]: →
            - generic [ref=e435]:
              - generic [ref=e436]: "2"
              - generic [ref=e437]: Amazon RDS (PostgreSQL)
              - generic [ref=e438]: →
            - generic [ref=e439]:
              - generic [ref=e440]: "3"
              - generic [ref=e441]: Amazon S3 (Data Lake)
              - generic [ref=e442]: →
            - generic [ref=e443]:
              - generic [ref=e444]: "4"
              - generic [ref=e445]: Amazon Bedrock (LLM)
              - generic [ref=e446]: →
            - generic [ref=e447]:
              - generic [ref=e448]: "5"
              - generic [ref=e449]: AWS Lambda (Async PII)
          - paragraph [ref=e451]:
            - img [ref=e452]
            - text: "ระบบทำงานบน AWS Cloud (Region: ap-southeast-1) พร้อมระบบ High Availability และ Auto-Scaling เพื่อรองรับการใช้งานระดับประเทศ"
        - generic [ref=e455]:
          - generic [ref=e457]:
            - heading "IT Coverage Map" [level=3] [ref=e458]:
              - img [ref=e459]
              - text: IT Coverage Map
            - paragraph [ref=e463]: สรุปว่าหน้า /it มีอะไรอยู่แล้ว และส่วนที่เติมเพื่อปิด gap ด้าน observability, compliance, และ data management
          - generic [ref=e464]:
            - generic [ref=e465]:
              - heading "มีอยู่แล้วใน /it" [level=4] [ref=e466]
              - generic [ref=e467]:
                - paragraph [ref=e468]: • Live system monitor + simulated ops logs
                - paragraph [ref=e469]: • CAL-130 audit explorer พร้อม filter, export, saved sets
                - paragraph [ref=e470]: • Ingestion job explorer + retry chain + compare view
                - paragraph [ref=e471]: • PII masking sandbox สำหรับทดสอบ PDPA patterns
            - generic [ref=e472]:
              - heading "เพิ่มให้รอบนี้" [level=4] [ref=e473]
              - generic [ref=e474]:
                - paragraph [ref=e475]: • NitiBench quick benchmark ในหน้า IT
                - paragraph [ref=e476]: • Responsible AI / Release Guard snapshot
                - paragraph [ref=e477]: • System assets + Knowledge Graph stats
                - paragraph [ref=e478]: • Data classification matrix + role access visibility
        - generic [ref=e479]:
          - generic [ref=e480]:
            - generic [ref=e481]:
              - generic [ref=e482]:
                - heading "NitiBench Quick Benchmark" [level=3] [ref=e483]:
                  - img [ref=e484]
                  - text: NitiBench Quick Benchmark
                - paragraph [ref=e486]: ให้ IT กดรัน benchmark ย่อจากหน้าเดียวเพื่อดู Hit@K, MRR, citation accuracy และ latency
              - generic [ref=e487]:
                - button "รัน snapshot" [ref=e488] [cursor=pointer]:
                  - img [ref=e489]
                  - text: รัน snapshot
                - link "เปิดหน้าเต็ม" [ref=e494] [cursor=pointer]:
                  - /url: /benchmark
            - generic [ref=e495]: ยังไม่มี benchmark snapshot ในหน้านี้ กดรันเพื่อดึงผลลัพธ์ล่าสุดจาก backend
          - generic [ref=e496]:
            - generic [ref=e497]:
              - generic [ref=e498]:
                - heading "Responsible AI Snapshot" [level=3] [ref=e499]:
                  - img [ref=e500]
                  - text: Responsible AI Snapshot
                - paragraph [ref=e503]: รวม release guard, governance และ RAG quality ที่ IT ต้องใช้เวลาตรวจ production readiness
              - link "เปิดหน้า Responsible AI" [ref=e504] [cursor=pointer]:
                - /url: /responsible-ai
            - generic [ref=e505]:
              - generic [ref=e506]:
                - paragraph [ref=e507]: Release Guard
                - paragraph [ref=e508]: 15/15
                - paragraph [ref=e509]: passed
              - generic [ref=e510]:
                - paragraph [ref=e511]: Ethics Compliance
                - paragraph [ref=e512]: 100.0%
                - paragraph [ref=e513]: audit chain valid
              - generic [ref=e514]:
                - paragraph [ref=e515]: Source Attribution
                - paragraph [ref=e516]: 0.0%
                - paragraph [ref=e517]: avg confidence 0%
              - generic [ref=e518]:
                - paragraph [ref=e519]: Expert Review
                - paragraph [ref=e520]: 100.0%
                - paragraph [ref=e521]: circuit breaker 0 ครั้ง
            - generic [ref=e522]:
              - paragraph [ref=e523]: Recent Release Checks
              - generic [ref=e524]:
                - generic [ref=e525]:
                  - generic [ref=e526]:
                    - paragraph [ref=e527]: Backend verification toolchain available
                    - paragraph [ref=e528]: pytest module importable via python -m pytest
                  - generic [ref=e529]: pass
                - generic [ref=e530]:
                  - generic [ref=e531]:
                    - paragraph [ref=e532]: Frontend verification toolchain available
                    - paragraph [ref=e533]: node=/opt/homebrew/bin/node, npm=/opt/homebrew/bin/npm, bun=missing
                  - generic [ref=e534]: pass
                - generic [ref=e535]:
                  - generic [ref=e536]:
                    - paragraph [ref=e537]: Audit log hash chain valid
                    - paragraph [ref=e538]: CAL-130 hash chain intact
                  - generic [ref=e539]: pass
                - generic [ref=e540]:
                  - generic [ref=e541]:
                    - paragraph [ref=e542]: Persistent audit backend configured
                    - paragraph [ref=e543]: audit backend = SQLiteAuditRepository
                  - generic [ref=e544]: pass
        - generic [ref=e545]:
          - generic [ref=e546]:
            - heading "Data Plane Snapshot" [level=3] [ref=e547]:
              - img [ref=e548]
              - text: Data Plane Snapshot
            - paragraph [ref=e552]: สิ่งที่ IT ต้องเห็นเพื่อจัดการ data ingestion, corpus growth และความพร้อมของ asset ทั้งระบบ
            - generic [ref=e553]:
              - generic [ref=e554]:
                - paragraph [ref=e555]: PDF Corpus
                - paragraph [ref=e556]: "208"
              - generic [ref=e557]:
                - paragraph [ref=e558]: HF Datasets
                - paragraph [ref=e559]: "10"
              - generic [ref=e560]:
                - paragraph [ref=e561]: Audit Rows
                - paragraph [ref=e562]: "3"
              - generic [ref=e563]:
                - paragraph [ref=e564]: Tests
                - paragraph [ref=e565]: "449"
            - generic [ref=e566]:
              - paragraph [ref=e567]: Knowledge Graph Stats
              - generic [ref=e568]:
                - generic [ref=e569]:
                  - paragraph [ref=e570]: Nodes
                  - paragraph [ref=e571]: "0"
                - generic [ref=e572]:
                  - paragraph [ref=e573]: Edges
                  - paragraph [ref=e574]: "0"
              - paragraph [ref=e576]: ยังไม่มี node ใน knowledge graph ตอนนี้
              - paragraph [ref=e577]: storage persistent_json
          - generic [ref=e578]:
            - heading "PII Masking Monitor" [level=3] [ref=e579]:
              - img [ref=e580]
              - text: PII Masking Monitor
            - paragraph [ref=e582]: เปลี่ยนจาก sandbox ทดลอง เป็น runtime monitor สำหรับดู recall, leakage และจำนวน PII ที่ระบบปกปิดต่อเนื่อง
            - generic [ref=e583]:
              - generic [ref=e584]:
                - paragraph [ref=e585]: Precision
                - paragraph [ref=e586]: 100.0%
              - generic [ref=e587]:
                - paragraph [ref=e588]: Recall
                - paragraph [ref=e589]: 100.0%
              - generic [ref=e590]:
                - paragraph [ref=e591]: Leakage
                - paragraph [ref=e592]: 0.0%
              - generic [ref=e593]:
                - paragraph [ref=e594]: Masked Total
                - paragraph [ref=e595]: "0"
            - generic [ref=e596]:
              - generic [ref=e597]:
                - generic [ref=e598]:
                  - paragraph [ref=e599]: Live PII Leaks
                  - paragraph [ref=e600]: "0"
                  - paragraph [ref=e601]: PDPA compliant
                - generic [ref=e602]:
                  - paragraph [ref=e603]: PII Patterns
                  - paragraph [ref=e604]: "9"
                  - paragraph [ref=e605]: Thai legal masking rules
              - paragraph [ref=e606]: ค่า precision/recall มาจาก evaluation pipeline ส่วน live leak count มาจาก runtime metrics ช่วงล่าสุด
        - generic [ref=e607]:
          - generic [ref=e609]:
            - heading "Data Classification & Access Matrix" [level=3] [ref=e610]:
              - img [ref=e611]
              - text: Data Classification & Access Matrix
            - paragraph [ref=e614]: "มุมมองที่ IT ยังขาด: ข้อมูลแต่ละชั้นเป็นอะไร ใครเข้าถึงได้ และคุณภาพข้อมูลที่แต่ละ role มองเห็นตาม Lake Formation RBAC"
            - paragraph [ref=e615]: "source: backend unavailable"
          - table [ref=e617]:
            - rowgroup [ref=e618]:
              - row "Classification Detail" [ref=e619]:
                - columnheader "Classification" [ref=e620]
                - columnheader "Detail" [ref=e621]
            - rowgroup
        - generic [ref=e622]:
          - generic [ref=e623]:
            - generic [ref=e624]:
              - heading "Secure Auditing Log" [level=3] [ref=e625]:
                - img [ref=e626]
                - text: Secure Auditing Log
              - paragraph [ref=e629]: filter/search ตาม action, agent role, case type และคำค้นจาก query preview
            - generic [ref=e630]:
              - generic [ref=e631]: Cryptographic Verification | ✅ Valid
              - generic [ref=e632]: ทั้งหมด 3 รายการ
          - generic [ref=e633]:
            - combobox [ref=e634]:
              - option "ทุก action" [selected]
              - option "search"
              - option "chat"
              - option "judgment_draft"
              - option "complaint_verification"
              - option "stt"
            - textbox "agent_role" [ref=e635]
            - textbox "metadata.case_type" [ref=e636]
            - generic [ref=e637]:
              - textbox "ค้นหา query preview" [ref=e638]
              - button "ล้าง" [ref=e639] [cursor=pointer]
          - generic [ref=e640]:
            - paragraph [ref=e641]: หน้า 1 / 1
            - generic [ref=e642]:
              - combobox [ref=e643]:
                - option "export all filtered" [selected]
                - option "export current page"
              - button "export JSON" [ref=e644] [cursor=pointer]
              - button "export CSV" [ref=e645] [cursor=pointer]
          - generic [ref=e646]:
            - generic [ref=e647]:
              - button "เลือกทั้งหน้า" [ref=e648] [cursor=pointer]
              - button "ล้างที่เลือก" [disabled] [ref=e649]
            - generic [ref=e650]:
              - generic [ref=e651]: selected 0 rows
              - button "export selected JSON" [disabled] [ref=e652]
              - button "export selected CSV" [disabled] [ref=e653]
          - generic [ref=e654]:
            - generic [ref=e655]:
              - textbox "ตั้งชื่อ saved set หรือ pinned set" [ref=e656]
              - button "save named set" [disabled] [ref=e657]
              - button "pin selection" [disabled] [ref=e658]:
                - img [ref=e659]
                - text: pin selection
            - paragraph [ref=e661]: ยังไม่มี saved audit sets
          - table [ref=e663]:
            - rowgroup [ref=e664]:
              - row "เลือก เวลา Action Query Hash Detail" [ref=e665]:
                - columnheader "เลือก" [ref=e666]
                - columnheader "เวลา" [ref=e667]
                - columnheader "Action" [ref=e668]
                - columnheader "Query" [ref=e669]
                - columnheader "Hash" [ref=e670]
                - columnheader "Detail" [ref=e671]
            - rowgroup [ref=e672]:
              - row "7/4/2569 01:29:24 chat ฟ้องหน่วยงานรัฐได้ไหม? ff4747bf8c40… ดูรายละเอียด" [ref=e673]:
                - cell [ref=e674]:
                  - checkbox [ref=e675]
                - cell "7/4/2569 01:29:24" [ref=e676]
                - cell "chat" [ref=e677]
                - cell "ฟ้องหน่วยงานรัฐได้ไหม?" [ref=e678]
                - cell "ff4747bf8c40…" [ref=e679]
                - cell "ดูรายละเอียด" [ref=e680]:
                  - button "ดูรายละเอียด" [ref=e681] [cursor=pointer]
              - row "6/4/2569 23:55:47 chat ค่าธรรมเนียมศาล? dcbb76efbcca… ดูรายละเอียด" [ref=e682]:
                - cell [ref=e683]:
                  - checkbox [ref=e684]
                - cell "6/4/2569 23:55:47" [ref=e685]
                - cell "chat" [ref=e686]
                - cell "ค่าธรรมเนียมศาล?" [ref=e687]
                - cell "dcbb76efbcca…" [ref=e688]
                - cell "ดูรายละเอียด" [ref=e689]:
                  - button "ดูรายละเอียด" [ref=e690] [cursor=pointer]
              - row "6/4/2569 23:55:42 chat ถูกเลิกจ้างไม่เป็นธรรม c3d425c44e8c… ดูรายละเอียด" [ref=e691]:
                - cell [ref=e692]:
                  - checkbox [ref=e693]
                - cell "6/4/2569 23:55:42" [ref=e694]
                - cell "chat" [ref=e695]
                - cell "ถูกเลิกจ้างไม่เป็นธรรม" [ref=e696]
                - cell "c3d425c44e8c…" [ref=e697]
                - cell "ดูรายละเอียด" [ref=e698]:
                  - button "ดูรายละเอียด" [ref=e699] [cursor=pointer]
          - generic [ref=e700]:
            - paragraph [ref=e701]: แสดง 3 รายการในหน้านี้
            - generic [ref=e702]:
              - button "ก่อนหน้า" [disabled] [ref=e703]
              - button "ถัดไป" [disabled] [ref=e704]
        - generic [ref=e705]:
          - generic [ref=e706]:
            - generic [ref=e707]:
              - heading "Ingestion Job Explorer" [level=3] [ref=e708]:
                - img [ref=e709]
                - text: Ingestion Job Explorer
              - paragraph [ref=e713]: ดูสถานะราย job และ error log เต็มจาก backend
            - button "รีเฟรชข้อมูล" [ref=e714] [cursor=pointer]:
              - img [ref=e715]
              - text: รีเฟรชข้อมูล
          - generic [ref=e720]:
            - generic [ref=e721]:
              - generic [ref=e722]:
                - heading "Recent Jobs" [level=4] [ref=e723]
                - paragraph [ref=e724]: แสดง 3 จาก 3 jobs
                - generic [ref=e725]:
                  - combobox [ref=e726]:
                    - option "ทุก source" [selected]
                    - option "A1.1"
                    - option "A3.1"
                    - option "openlaw_thailand"
                  - combobox [ref=e727]:
                    - option "ทุกสถานะ" [selected]
                    - option "in_progress"
                    - option "completed"
                    - option "completed_with_errors"
                    - option "failed"
              - generic [ref=e728]:
                - button "demo-reg... completed A3.1 9/9 docs • 131 chunks job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors" [ref=e729] [cursor=pointer]:
                  - generic [ref=e730]:
                    - generic [ref=e731]: demo-reg...
                    - generic [ref=e732]: completed
                  - paragraph [ref=e733]: A3.1
                  - paragraph [ref=e734]: 9/9 docs • 131 chunks
                  - paragraph [ref=e735]: job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry
                  - paragraph [ref=e736]: retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors
                - button "demo-cou... completed A1.1 12/12 docs • 244 chunks job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors" [ref=e737] [cursor=pointer]:
                  - generic [ref=e738]:
                    - generic [ref=e739]: demo-cou...
                    - generic [ref=e740]: completed
                  - paragraph [ref=e741]: A1.1
                  - paragraph [ref=e742]: 12/12 docs • 244 chunks
                  - paragraph [ref=e743]: job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry
                  - paragraph [ref=e744]: retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors
                - button "demo-ope... completed openlaw_thailand 48/48 docs • 612 chunks job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors" [ref=e745] [cursor=pointer]:
                  - generic [ref=e746]:
                    - generic [ref=e747]: demo-ope...
                    - generic [ref=e748]: completed
                  - paragraph [ref=e749]: openlaw_thailand
                  - paragraph [ref=e750]: 48/48 docs • 612 chunks
                  - paragraph [ref=e751]: job นี้สำเร็จครบแล้ว จึงไม่จำเป็นต้อง retry
                  - paragraph [ref=e752]: retry failed items ใช้ได้เฉพาะ job ที่ completed_with_errors
            - generic [ref=e754]: กำลังโหลดรายละเอียด job...
        - generic [ref=e755]:
          - heading "Privacy Protection (PDPA) Test" [level=3] [ref=e756]:
            - img [ref=e757]
            - text: Privacy Protection (PDPA) Test
          - textbox "วางข้อความเพื่อทดสอบระบบเซ็นเซอร์ข้อมูลส่วนบุคคล..." [ref=e759]
          - button "ทดสอบ" [disabled] [ref=e760]:
            - img [ref=e761]
            - text: ทดสอบ
    - generic [ref=e766]:
      - paragraph [ref=e769]: Official Responsible AI Partners
      - generic [ref=e771]:
        - link "COJ" [ref=e772] [cursor=pointer]:
          - /url: https://www.coj.go.th
          - generic [ref=e773]:
            - img "COJ" [ref=e775]
            - generic [ref=e776]: COJ
            - generic [ref=e777]: ศาลยุติธรรม
        - link "TIJ" [ref=e778] [cursor=pointer]:
          - /url: https://www.tijthailand.org
          - generic [ref=e779]:
            - img "TIJ" [ref=e781]
            - generic [ref=e782]: TIJ
            - generic [ref=e783]: TIJ THAILAND
        - link "AWS" [ref=e784] [cursor=pointer]:
          - /url: https://aws.amazon.com
          - generic [ref=e785]:
            - img "AWS" [ref=e787]
            - generic [ref=e788]: AWS
            - generic [ref=e789]: AWS Partner
        - link "ETDA" [ref=e790] [cursor=pointer]:
          - /url: https://www.etda.or.th
          - generic [ref=e791]:
            - img "ETDA" [ref=e793]
            - generic [ref=e794]: ETDA
            - generic [ref=e795]: สพธอ. (ETDA)
        - link "AIGC" [ref=e796] [cursor=pointer]:
          - /url: https://aigc.etda.or.th
          - generic [ref=e797]:
            - img "AIGC" [ref=e799]
            - generic [ref=e800]: AIGC
            - generic [ref=e801]: AI Governance
    - contentinfo [ref=e802]:
      - img "Institutional Background" [ref=e804]
      - generic [ref=e806]:
        - generic [ref=e807]:
          - generic [ref=e808]:
            - generic [ref=e809]:
              - img "LegalGuard Logo" [ref=e811]
              - generic [ref=e812]:
                - generic [ref=e813]: Smart LegalGuard AI
                - generic [ref=e814]: ETDA Responsible AI Innovation Hackathon 2026 — AI for Justice
            - paragraph [ref=e815]: ต้นแบบระบบสืบค้นข้อมูลกฎหมายไทยและ workflow ด้านความยุติธรรม ที่ออกแบบให้ตรวจสอบย้อนหลังได้และใช้งานอย่างรับผิดชอบ
            - generic [ref=e816]:
              - img [ref=e817]
              - generic [ref=e819]: Privacy-aware · audit-ready · demo-safe
          - generic [ref=e820]:
            - heading "บริการหลัก" [level=4] [ref=e821]:
              - img [ref=e822]
              - text: บริการหลัก
            - list [ref=e826]:
              - listitem [ref=e827]:
                - link "» สืบค้นกฎหมายภาคประชาชน" [ref=e828] [cursor=pointer]:
                  - /url: /search?role=citizen
              - listitem [ref=e829]:
                - link "» ศูนย์รวมความน่าเชื่อถือของระบบ" [ref=e830] [cursor=pointer]:
                  - /url: /trust-center
              - listitem [ref=e831]:
                - link "» ศูนย์รวมระบบหลังบ้าน" [ref=e832] [cursor=pointer]:
                  - /url: /back-office
              - listitem [ref=e833]:
                - link "» Clerk Copilot สำหรับธุรการศาล" [ref=e834] [cursor=pointer]:
                  - /url: /clerk-copilot
              - listitem [ref=e835]:
                - link "» Judge Workbench สำหรับตุลาการ" [ref=e836] [cursor=pointer]:
                  - /url: /judge-workbench
              - listitem [ref=e837]:
                - link "» AI Control Tower สำหรับฝ่าย IT" [ref=e838] [cursor=pointer]:
                  - /url: /ai-control-tower
              - listitem [ref=e839]:
                - link "» โซลูชันสำหรับนักกฎหมาย (Private Offering)" [ref=e840] [cursor=pointer]:
                  - /url: /private-offering
          - generic [ref=e841]:
            - heading "ลิงก์หน่วยงาน" [level=4] [ref=e842]:
              - img [ref=e843]
              - text: ลิงก์หน่วยงาน
            - list [ref=e847]:
              - listitem [ref=e848]:
                - link "ศาลยุติธรรม" [ref=e849] [cursor=pointer]:
                  - /url: https://www.coj.go.th
                  - text: ศาลยุติธรรม
                  - img [ref=e850]
              - listitem [ref=e854]:
                - link "ศาลปกครอง" [ref=e855] [cursor=pointer]:
                  - /url: https://www.admincourt.go.th
                  - text: ศาลปกครอง
                  - img [ref=e856]
              - listitem [ref=e860]:
                - link "ราชกิจจานุเบกษา" [ref=e861] [cursor=pointer]:
                  - /url: https://www.ratchakitcha.soc.go.th
                  - text: ราชกิจจานุเบกษา
                  - img [ref=e862]
              - listitem [ref=e866]:
                - link "ETDA (สพธอ.)" [ref=e867] [cursor=pointer]:
                  - /url: https://www.etda.or.th
                  - text: ETDA (สพธอ.)
                  - img [ref=e868]
          - generic [ref=e872]:
            - heading "ช่องทางการติดต่อ" [level=4] [ref=e873]:
              - img [ref=e874]
              - text: ช่องทางการติดต่อ
            - generic [ref=e878]:
              - paragraph [ref=e879]: หน้านี้เป็นต้นแบบสำหรับการสาธิตผลิตภัณฑ์
              - paragraph [ref=e880]: หากต้องการข้อมูลบริการศาลหรือการติดต่อจริง โปรดใช้ลิงก์หน่วยงานทางการในคอลัมน์ด้านซ้าย
        - generic [ref=e882]:
          - paragraph [ref=e883]: © 2569 Smart LegalGuard AI — ศูนย์รวมนวัตกรรม AI เพื่อความยุติธรรม
          - generic [ref=e884] [cursor=pointer]:
            - generic [ref=e885]: Designed & Developed by
            - generic [ref=e886]: Honest Predictor
            - img [ref=e887]
          - paragraph [ref=e891]: ETDA Responsible AI Innovation Hackathon 2026 | governance-first prototype สำหรับการสาธิตและประเมินเชิงสถาบัน
  - generic [ref=e892] [cursor=pointer]:
    - generic [ref=e893]:
      - paragraph [ref=e894]: สวัสดีครับ! 🙏
      - paragraph [ref=e895]: มีคำถามกฎหมายไหม? กดคุยได้เลย
    - img "น้องซื่อสัตย์" [ref=e896]
    - generic [ref=e897]: น้องซื่อสัตย์ AI
```

# Test source

```ts
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
  287 |     expect(body).toMatch(/ยินดีต้อนรับ|ผู้ช่วยทางกฎหมายอัจฉริยะ|ค้นหาศาล|พยากรณ์ผลคดี/);
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
> 311 |     expect(body).toMatch(/NitiBench Quick Benchmark|Responsible AI Snapshot|Data Classification & Access Matrix/);
      |                  ^ Error: expect(received).toMatch(expected)
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
  388 |   test("validation shows error when submitting empty form", async ({ page }) => {
  389 |     await goto(page, "/complaint-form");
  390 |     const submitBtn = page.locator("button[type=submit], button:has-text('ส่ง'), button:has-text('วิเคราะห์'), button:has-text('ยืนยัน')").first();
  391 |     if (await submitBtn.isVisible()) {
  392 |       await submitBtn.click();
  393 |       await page.waitForTimeout(500);
  394 |       const body = await page.textContent("body");
  395 |       expect(body).toMatch(/กรุณา|ระบุ|required|error/i);
  396 |     }
  397 |   });
  398 | 
  399 |   test("step 1 form accepts plaintiff and defendant input", async ({ page }) => {
  400 |     await goto(page, "/complaint-form");
  401 |     const inputs = page.locator("input[placeholder*='โจทก์'], input[placeholder*='ผู้ฟ้อง'], input[id*='plaintiff']").first();
  402 |     if (await inputs.isVisible()) {
  403 |       await inputs.fill("นาย สมชาย ใจดี");
  404 |       await expect(inputs).toHaveValue("นาย สมชาย ใจดี");
  405 |     }
  406 |   });
  407 | });
  408 | 
  409 | // ══════════════════════════════════════════════════════════════════════════════
  410 | // 10. 404 NOT FOUND
  411 | // ══════════════════════════════════════════════════════════════════════════════
```