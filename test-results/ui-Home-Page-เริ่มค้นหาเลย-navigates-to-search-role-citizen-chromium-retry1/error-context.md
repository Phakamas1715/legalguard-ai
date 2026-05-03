# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui.spec.ts >> Home Page (/) >> 'เริ่มค้นหาเลย' navigates to /search?role=citizen
- Location: tests/ui.spec.ts:36:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('เริ่มค้นหาเลย')

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
              - img [ref=e19]
              - text: หน้าแรก
            - link "สืบค้นกฎหมาย" [ref=e22] [cursor=pointer]:
              - /url: /search
              - img [ref=e23]
              - text: สืบค้นกฎหมาย
            - button "สาระความรู้เมนู" [ref=e28] [cursor=pointer]:
              - img [ref=e29]
              - text: สาระความรู้
              - img [ref=e31]
          - button "เลือกบทบาทการใช้งาน" [ref=e36] [cursor=pointer]:
            - img [ref=e37]
            - text: ศูนย์รวม Dashboard
            - img [ref=e42]
        - generic [ref=e44]:
          - generic [ref=e45]:
            - link "บุ๊กมาร์ก" [ref=e46] [cursor=pointer]:
              - /url: /bookmarks
              - img [ref=e47]
            - link "ประวัติ" [ref=e49] [cursor=pointer]:
              - /url: /history
              - img [ref=e50]
          - generic:
            - generic:
              - img
            - generic:
              - generic: Trust & Privacy
              - generic: แสดงผลอย่างรับผิดชอบและตรวจสอบย้อนหลังได้
    - generic [ref=e78]:
      - generic [ref=e79]:
        - img [ref=e80]
        - generic [ref=e82]: โครงสร้างพื้นฐานกฎหมายอัจฉริยะระดับชาติ
      - heading "Smart LegalGuard AI" [level=1] [ref=e83]:
        - text: Smart
        - text: LegalGuard AI
      - paragraph [ref=e84]:
        - text: การพัฒนาโครงสร้างพื้นฐานด้านข้อมูลกฎหมายด้วยเทคโนโลยี AI ที่ผ่านการตรวจสอบได้
        - text: เพื่อสนับสนุนความโปร่งใสในกระบวนการยุติธรรมและอำนวยความสะดวกแก่ประชาชน
      - generic [ref=e85]:
        - button "สืบค้นกฎหมาย" [ref=e86] [cursor=pointer]:
          - img [ref=e88]
          - text: สืบค้นกฎหมาย
        - link "ดูระบบเจ้าหน้าที่" [ref=e91] [cursor=pointer]:
          - /url: "#roles"
          - text: ดูระบบเจ้าหน้าที่
          - img [ref=e92]
      - generic [ref=e94]:
        - generic [ref=e95]:
          - img [ref=e96]
          - text: ออกแบบสำหรับ deployment ในไทย
        - generic [ref=e99]:
          - img [ref=e100]
          - text: audit-ready และ privacy-aware
        - generic [ref=e103]:
          - img [ref=e104]
          - text: พัฒนาตามแนวทาง Responsible AI
    - generic [ref=e111]:
      - generic [ref=e112]:
        - img [ref=e114]
        - generic [ref=e118]: 176,543+
        - generic [ref=e119]: เป้าหมายฐานข้อมูลคำพิพากษา
        - generic [ref=e120]: เป้าหมาย Phase 2 — รอข้อมูลจากศาล 160,000+ คำพิพากษา
      - generic [ref=e121]:
        - img [ref=e123]
        - generic [ref=e126]: "208"
        - generic [ref=e127]: PDF ที่มีในระบบตอนนี้
        - generic [ref=e128]: ศาลยุติธรรม ~98 + ศาลปกครอง ~90 = ~208 PDFs
      - generic [ref=e129]:
        - img [ref=e131]
        - generic [ref=e136]: "10"
        - generic [ref=e137]: ชุดข้อมูล Hugging Face
        - generic [ref=e138]: 10 datasets จาก HuggingFace
      - generic [ref=e139]:
        - img [ref=e141]
        - generic [ref=e143]: "3"
        - generic [ref=e144]: Audit entries ที่บันทึกแล้ว
        - generic [ref=e145]: "Phase 1 — ข้อมูลที่มี: PDF แบบฟอร์ม + mock cases + HuggingFace datasets"
    - generic [ref=e149]:
      - paragraph [ref=e152]: Official Responsible AI Partners
      - generic [ref=e154]:
        - link "COJ" [ref=e155] [cursor=pointer]:
          - /url: https://www.coj.go.th
          - generic [ref=e156]:
            - img "COJ" [ref=e158]
            - generic [ref=e159]: COJ
            - generic [ref=e160]: ศาลยุติธรรม
        - link "TIJ" [ref=e161] [cursor=pointer]:
          - /url: https://www.tijthailand.org
          - generic [ref=e162]:
            - img "TIJ" [ref=e164]
            - generic [ref=e165]: TIJ
            - generic [ref=e166]: TIJ THAILAND
        - link "AWS" [ref=e167] [cursor=pointer]:
          - /url: https://aws.amazon.com
          - generic [ref=e168]:
            - img "AWS" [ref=e170]
            - generic [ref=e171]: AWS
            - generic [ref=e172]: AWS Partner
        - link "ETDA" [ref=e173] [cursor=pointer]:
          - /url: https://www.etda.or.th
          - generic [ref=e174]:
            - img "ETDA" [ref=e176]
            - generic [ref=e177]: ETDA
            - generic [ref=e178]: สพธอ. (ETDA)
        - link "AIGC" [ref=e179] [cursor=pointer]:
          - /url: https://aigc.etda.or.th
          - generic [ref=e180]:
            - img "AIGC" [ref=e182]
            - generic [ref=e183]: AIGC
            - generic [ref=e184]: AI Governance
    - generic [ref=e185]:
      - img "Institutional Backdrop" [ref=e187]
      - generic [ref=e189]:
        - generic [ref=e190]:
          - generic [ref=e191]:
            - img [ref=e192]
            - text: เลือกพื้นที่ปฏิบัติงานของคุณ
          - heading "ระบบตอบสนองตาม บทบาทของผู้ใช้งาน" [level=2] [ref=e197]:
            - text: ระบบตอบสนองตาม
            - text: บทบาทของผู้ใช้งาน
          - paragraph [ref=e198]: LegalGuard AI ปรับสถาปัตยกรรมและ Guardrails อัตโนมัติ เพื่อให้สอดคล้องกับจริยธรรมของแต่ละกลุ่มภารกิจงานยุติธรรม
        - generic [ref=e200]:
          - button "ภาคประชาชน ประชาชนทั่วไป / ผู้เสียหาย ค้นหาข้อมูลกฎหมายและขั้นตอนการดำเนินคดีด้วยภาษาชาวบ้านที่เข้าใจง่าย ค้นหาด้วยภาษาธรรมชาติ ระบบช่วยร่างคำฟ้อง บอทช่วยทางกฎหมาย เข้าสู่พื้นที่ปฏิบัติงาน" [ref=e202] [cursor=pointer]:
            - generic [ref=e204]:
              - img [ref=e207]
              - generic [ref=e212]:
                - generic [ref=e213]: ภาคประชาชน
                - heading "ประชาชนทั่วไป / ผู้เสียหาย" [level=3] [ref=e214]
              - paragraph [ref=e215]: ค้นหาข้อมูลกฎหมายและขั้นตอนการดำเนินคดีด้วยภาษาชาวบ้านที่เข้าใจง่าย
              - generic [ref=e216]:
                - generic [ref=e217]:
                  - img [ref=e219]
                  - text: ค้นหาด้วยภาษาธรรมชาติ
                - generic [ref=e221]:
                  - img [ref=e223]
                  - text: ระบบช่วยร่างคำฟ้อง
                - generic [ref=e225]:
                  - img [ref=e227]
                  - text: บอทช่วยทางกฎหมาย
              - generic [ref=e229]:
                - text: เข้าสู่พื้นที่ปฏิบัติงาน
                - img [ref=e230]
            - img [ref=e233]
          - button "ภาคธุรการศาล เจ้าหน้าที่ศาล / ข้าราชการธุรการ ระบบสนับสนุนงานธุรการศาล จัดการสำนวนคดี รับคำฟ้อง คัดกรองเอกสาร และติดตามสถานะคดี คัดกรองคำฟ้องด้วย AI จัดการสำนวนและติดตามคดี นำเข้าข้อมูลและตรวจสอบ Audit เข้าสู่พื้นที่ปฏิบัติงาน" [ref=e236] [cursor=pointer]:
            - generic [ref=e238]:
              - img [ref=e241]
              - generic [ref=e245]:
                - generic [ref=e246]: ภาคธุรการศาล
                - heading "เจ้าหน้าที่ศาล / ข้าราชการธุรการ" [level=3] [ref=e247]
              - paragraph [ref=e248]: ระบบสนับสนุนงานธุรการศาล จัดการสำนวนคดี รับคำฟ้อง คัดกรองเอกสาร และติดตามสถานะคดี
              - generic [ref=e249]:
                - generic [ref=e250]:
                  - img [ref=e252]
                  - text: คัดกรองคำฟ้องด้วย AI
                - generic [ref=e254]:
                  - img [ref=e256]
                  - text: จัดการสำนวนและติดตามคดี
                - generic [ref=e258]:
                  - img [ref=e260]
                  - text: นำเข้าข้อมูลและตรวจสอบ Audit
              - generic [ref=e262]:
                - text: เข้าสู่พื้นที่ปฏิบัติงาน
                - img [ref=e263]
            - img [ref=e266]
          - button "ระบบตุลาการ ผู้พิพากษา / ตุลาการศาลปกครอง เครื่องมือสนับสนุนการพิจารณาคดี ช่วยสืบค้นแนวคำพิพากษา วิเคราะห์ประเด็น และยกร่างคำพิพากษาเบื้องต้น สืบค้นแนวฎีกาและคำวินิจฉัย ช่วยยกร่างคำพิพากษา ตรวจสอบความเป็นธรรม (Fairness) เข้าสู่พื้นที่ปฏิบัติงาน" [ref=e269] [cursor=pointer]:
            - generic [ref=e271]:
              - img [ref=e274]
              - generic [ref=e278]:
                - generic [ref=e279]: ระบบตุลาการ
                - heading "ผู้พิพากษา / ตุลาการศาลปกครอง" [level=3] [ref=e280]
              - paragraph [ref=e281]: เครื่องมือสนับสนุนการพิจารณาคดี ช่วยสืบค้นแนวคำพิพากษา วิเคราะห์ประเด็น และยกร่างคำพิพากษาเบื้องต้น
              - generic [ref=e282]:
                - generic [ref=e283]:
                  - img [ref=e285]
                  - text: สืบค้นแนวฎีกาและคำวินิจฉัย
                - generic [ref=e287]:
                  - img [ref=e289]
                  - text: ช่วยยกร่างคำพิพากษา
                - generic [ref=e291]:
                  - img [ref=e293]
                  - text: ตรวจสอบความเป็นธรรม (Fairness)
              - generic [ref=e295]:
                - text: เข้าสู่พื้นที่ปฏิบัติงาน
                - img [ref=e296]
            - img [ref=e299]
          - button "ระบบ IT / แอดมิน ฝ่ายไอที / ผู้ดูแลระบบ ศูนย์ควบคุม monitoring, audit, benchmark, release readiness และ governance สำหรับ rollout ระบบ AI ในศาล มองเห็น metrics และ incident ตรวจ audit + PII + release guard คุม ingestion และ benchmark เข้าสู่พื้นที่ปฏิบัติงาน" [ref=e302] [cursor=pointer]:
            - generic [ref=e304]:
              - img [ref=e307]
              - generic [ref=e310]:
                - generic [ref=e311]: ระบบ IT / แอดมิน
                - heading "ฝ่ายไอที / ผู้ดูแลระบบ" [level=3] [ref=e312]
              - paragraph [ref=e313]: ศูนย์ควบคุม monitoring, audit, benchmark, release readiness และ governance สำหรับ rollout ระบบ AI ในศาล
              - generic [ref=e314]:
                - generic [ref=e315]:
                  - img [ref=e317]
                  - text: มองเห็น metrics และ incident
                - generic [ref=e319]:
                  - img [ref=e321]
                  - text: ตรวจ audit + PII + release guard
                - generic [ref=e323]:
                  - img [ref=e325]
                  - text: คุม ingestion และ benchmark
              - generic [ref=e327]:
                - text: เข้าสู่พื้นที่ปฏิบัติงาน
                - img [ref=e328]
            - img [ref=e331]
        - generic [ref=e333]:
          - generic [ref=e334]:
            - img [ref=e335]
            - text: ความเป็นส่วนตัวตามบทบาท
          - generic [ref=e339]:
            - img [ref=e340]
            - text: ปกป้องตัวตนด้วย privacy-by-design
          - generic [ref=e344]:
            - img [ref=e345]
            - text: ความปลอดภัยระดับโครงสร้างพื้นฐาน
    - generic [ref=e348]:
      - generic [ref=e349]:
        - generic [ref=e350]:
          - generic [ref=e351]:
            - img [ref=e352]
            - text: System Trust Layer
          - heading "ผู้ใช้งานทุกบทบาทอยู่ภายใต้โครงสร้างความปลอดภัยเดียวกัน" [level=3] [ref=e354]
          - paragraph [ref=e355]: ตั้งแต่ประชาชนจนถึงผู้พิพากษา ทุกคำขอจะผ่าน privacy, routing, retrieval, guardrails, multi-agent review และ audit chain ก่อนแสดงผล เพื่อให้ระบบตรวจสอบย้อนหลังและคุมความเสี่ยงได้จริง
          - paragraph [ref=e356]: ระบบคัดกรองความปลอดภัย 7 ชั้น (7-Layer Safety Pipeline) · โหมดสำรองสำหรับเดโม เมื่อ backend ไม่พร้อมตอบ runtime evidence
          - paragraph [ref=e357]: "แหล่งข้อมูล: ใช้ fallback สำหรับเดโม"
        - generic [ref=e358]:
          - generic [ref=e359]:
            - img [ref=e360]
            - text: Fallback View
          - generic [ref=e363]:
            - img [ref=e364]
            - text: Runtime Not Verified
      - generic [ref=e366]:
        - generic [ref=e367]:
          - generic [ref=e368]:
            - generic [ref=e369]: L2
            - generic [ref=e370]: ไม่มีข้อมูล
          - paragraph [ref=e371]: PII Sanitization
          - paragraph [ref=e372]: ปกปิดข้อมูลส่วนบุคคล
        - generic [ref=e373]:
          - generic [ref=e374]:
            - generic [ref=e375]: L0
            - generic [ref=e376]: ไม่มีข้อมูล
          - paragraph [ref=e377]: Intent Routing
          - paragraph [ref=e378]: วิเคราะห์เส้นทางการทำงาน
        - generic [ref=e379]:
          - generic [ref=e380]:
            - generic [ref=e381]: L1
            - generic [ref=e382]: ไม่มีข้อมูล
          - paragraph [ref=e383]: Hybrid Retrieval
          - paragraph [ref=e384]: ค้นข้อมูลกฎหมายหลายชั้น
        - generic [ref=e385]:
          - generic [ref=e386]:
            - generic [ref=e387]: L4
            - generic [ref=e388]: ไม่มีข้อมูล
          - paragraph [ref=e389]: Context Filter
          - paragraph [ref=e390]: คัดเฉพาะบริบทที่เกี่ยวข้อง
        - generic [ref=e391]:
          - generic [ref=e392]:
            - generic [ref=e393]: L5
            - generic [ref=e394]: ไม่มีข้อมูล
          - paragraph [ref=e395]: AI Guardrails
          - paragraph [ref=e396]: คุม governance และ compliance
        - generic [ref=e397]:
          - generic [ref=e398]:
            - generic [ref=e399]: L6
            - generic [ref=e400]: ไม่มีข้อมูล
          - paragraph [ref=e401]: Hallucination Audit
          - paragraph [ref=e402]: ตรวจทาน reasoning หลาย agent
        - generic [ref=e403]:
          - generic [ref=e404]:
            - generic [ref=e405]: audit
            - generic [ref=e406]: ไม่มีข้อมูล
          - paragraph [ref=e407]: Crypto Log
          - paragraph [ref=e408]: บันทึก hash chain ย้อนหลังได้
      - generic [ref=e409]:
        - link "ดู Trace Console" [ref=e410] [cursor=pointer]:
          - /url: /trace-console
          - text: ดู Trace Console
          - img [ref=e411]
        - link "ดู AI Control Tower" [ref=e413] [cursor=pointer]:
          - /url: /ai-control-tower
    - generic [ref=e415]:
      - generic [ref=e416]:
        - generic [ref=e417]:
          - generic [ref=e418]:
            - img [ref=e419]
            - text: KPI Blueprint
          - heading "ผลลัพธ์ที่ระบบควรถูกวัดจริง" [level=2] [ref=e421]
          - paragraph [ref=e422]: KPI ด้านล่างออกแบบให้เชื่อมตรงกับ pain point ของศาลและประชาชน เพื่อใช้เป็น baseline สำหรับ pilot, rollout และการประเมินผลเชิงนโยบาย
        - generic [ref=e423]:
          - paragraph [ref=e424]: มิติการวัดผล
          - paragraph [ref=e425]: ความเร็ว · ความแม่นยำ · ความเป็นธรรม · การเข้าถึง · ความเชื่อมั่น
      - generic [ref=e426]:
        - generic [ref=e427]:
          - generic [ref=e428]: 30-50%
          - generic [ref=e429]: ลดเวลายกร่าง/ตรวจร่าง
          - generic [ref=e430]: จาก drafting assistant และ review automation
        - generic [ref=e431]:
          - generic [ref=e432]: 10-25%
          - generic [ref=e433]: ลดคดีค้างสะสม
          - generic [ref=e434]: จาก bottleneck analytics และ allocation
        - generic [ref=e435]:
          - generic [ref=e436]: ">= 85%"
          - generic [ref=e437]: Top-5 Recall
          - generic [ref=e438]: สำหรับการค้นคืนคำพิพากษาที่เกี่ยวข้อง
        - generic [ref=e439]:
          - generic [ref=e440]: ">= 95%"
          - generic [ref=e441]: Citation Accuracy
          - generic [ref=e442]: อ้างอิงมาตราและคำพิพากษาได้แม่นยำ
        - generic [ref=e443]:
          - generic [ref=e444]: 0 leakage
          - generic [ref=e445]: PII Exposure
          - generic [ref=e446]: ผลลัพธ์ต้องไม่รั่วข้อมูลส่วนบุคคล
        - generic [ref=e447]:
          - generic [ref=e448]: < 1 day
          - generic [ref=e449]: เข้าถึงบริการประชาชน
          - generic [ref=e450]: ลดระยะเวลาจากวันหรือสัปดาห์ให้ทันทีขึ้น
    - generic [ref=e451]:
      - img "Infrastructure Background" [ref=e453]
      - generic [ref=e455]:
        - generic [ref=e456]:
          - generic [ref=e457]:
            - img [ref=e458]
            - text: พัฒนาภายใต้แนวทางความรับผิดชอบด้าน AI
          - heading "สถาปัตยกรรม ระดับรัฐเอกภาพ" [level=2] [ref=e460]
          - paragraph [ref=e461]: เทคโนโลยีที่ออกแบบให้ตรวจสอบย้อนหลังได้ เพื่อลดความเสี่ยงและยกระดับความโปร่งใสของกระบวนการยุติธรรม
        - generic [ref=e462]:
          - generic [ref=e463]:
            - img [ref=e465]
            - heading "ระบบสนับสนุนภาคประชาชน" [level=3] [ref=e470]
            - paragraph [ref=e471]: เครื่องมือช่วยสืบค้นข้อกฎหมายและระเบียบที่เกี่ยวข้อง พร้อมคำอธิบายเบื้องต้นเพื่อความเข้าใจที่ถูกต้อง (Citizen Support Features)
          - generic [ref=e472]:
            - img [ref=e474]
            - heading "ระบบสนับสนุนงานบริหารจัดการ" [level=3] [ref=e477]
            - paragraph [ref=e478]: สนับสนุนการบริหารจัดการเอกสารและคัดกรองข้อมูลเบื้องต้น เพื่อเพิ่มประสิทธิภาพการทำงานของเจ้าหน้าที่ (Administrative Support Stack)
          - generic [ref=e479]:
            - img [ref=e481]
            - heading "ระบบสนับสนุนงานตุลาการ" [level=3] [ref=e487]
            - paragraph [ref=e488]: เครื่องมือรวบรวมข้อกฎหมายและแนวทางคำพิพากษา เพื่อประกอบการพิจารณาและตรวจสอบความถูกต้องเชิงกฎหมาย (Judicial Support Stack)
    - generic [ref=e491]:
      - generic [ref=e492]:
        - img [ref=e493]
        - generic [ref=e495]: ค้นหาด้วยภาษาธรรมชาติ
      - generic [ref=e496]:
        - img [ref=e497]
        - generic [ref=e499]: อ้างอิงมาตราและเลขฎีกาจริง
      - generic [ref=e500]:
        - img [ref=e501]
        - generic [ref=e503]: ปกป้องข้อมูลตาม PDPA
      - generic [ref=e504]:
        - img [ref=e505]
        - generic [ref=e507]: ข้อมูลเก็บในประเทศไทย
      - generic [ref=e508]:
        - img [ref=e509]
        - generic [ref=e511]: ระบบป้องกัน AI หลอน
    - contentinfo [ref=e512]:
      - img "Institutional Background" [ref=e514]
      - generic [ref=e516]:
        - generic [ref=e517]:
          - generic [ref=e518]:
            - generic [ref=e519]:
              - img "LegalGuard Logo" [ref=e521]
              - generic [ref=e522]:
                - generic [ref=e523]: Smart LegalGuard AI
                - generic [ref=e524]: ETDA Responsible AI Innovation Hackathon 2026 — AI for Justice
            - paragraph [ref=e525]: ต้นแบบระบบสืบค้นข้อมูลกฎหมายไทยและ workflow ด้านความยุติธรรม ที่ออกแบบให้ตรวจสอบย้อนหลังได้และใช้งานอย่างรับผิดชอบ
            - generic [ref=e526]:
              - img [ref=e527]
              - generic [ref=e529]: Privacy-aware · audit-ready · demo-safe
          - generic [ref=e530]:
            - heading "บริการหลัก" [level=4] [ref=e531]:
              - img [ref=e532]
              - text: บริการหลัก
            - list [ref=e536]:
              - listitem [ref=e537]:
                - link "» สืบค้นกฎหมายภาคประชาชน" [ref=e538] [cursor=pointer]:
                  - /url: /search?role=citizen
              - listitem [ref=e539]:
                - link "» ศูนย์รวมความน่าเชื่อถือของระบบ" [ref=e540] [cursor=pointer]:
                  - /url: /trust-center
              - listitem [ref=e541]:
                - link "» ศูนย์รวมระบบหลังบ้าน" [ref=e542] [cursor=pointer]:
                  - /url: /back-office
              - listitem [ref=e543]:
                - link "» Clerk Copilot สำหรับธุรการศาล" [ref=e544] [cursor=pointer]:
                  - /url: /clerk-copilot
              - listitem [ref=e545]:
                - link "» Judge Workbench สำหรับตุลาการ" [ref=e546] [cursor=pointer]:
                  - /url: /judge-workbench
              - listitem [ref=e547]:
                - link "» AI Control Tower สำหรับฝ่าย IT" [ref=e548] [cursor=pointer]:
                  - /url: /ai-control-tower
              - listitem [ref=e549]:
                - link "» โซลูชันสำหรับนักกฎหมาย (Private Offering)" [ref=e550] [cursor=pointer]:
                  - /url: /private-offering
          - generic [ref=e551]:
            - heading "ลิงก์หน่วยงาน" [level=4] [ref=e552]:
              - img [ref=e553]
              - text: ลิงก์หน่วยงาน
            - list [ref=e557]:
              - listitem [ref=e558]:
                - link "ศาลยุติธรรม" [ref=e559] [cursor=pointer]:
                  - /url: https://www.coj.go.th
                  - text: ศาลยุติธรรม
                  - img [ref=e560]
              - listitem [ref=e564]:
                - link "ศาลปกครอง" [ref=e565] [cursor=pointer]:
                  - /url: https://www.admincourt.go.th
                  - text: ศาลปกครอง
                  - img [ref=e566]
              - listitem [ref=e570]:
                - link "ราชกิจจานุเบกษา" [ref=e571] [cursor=pointer]:
                  - /url: https://www.ratchakitcha.soc.go.th
                  - text: ราชกิจจานุเบกษา
                  - img [ref=e572]
              - listitem [ref=e576]:
                - link "ETDA (สพธอ.)" [ref=e577] [cursor=pointer]:
                  - /url: https://www.etda.or.th
                  - text: ETDA (สพธอ.)
                  - img [ref=e578]
          - generic [ref=e582]:
            - heading "ช่องทางการติดต่อ" [level=4] [ref=e583]:
              - img [ref=e584]
              - text: ช่องทางการติดต่อ
            - generic [ref=e588]:
              - paragraph [ref=e589]: หน้านี้เป็นต้นแบบสำหรับการสาธิตผลิตภัณฑ์
              - paragraph [ref=e590]: หากต้องการข้อมูลบริการศาลหรือการติดต่อจริง โปรดใช้ลิงก์หน่วยงานทางการในคอลัมน์ด้านซ้าย
        - generic [ref=e592]:
          - paragraph [ref=e593]: © 2569 Smart LegalGuard AI — ศูนย์รวมนวัตกรรม AI เพื่อความยุติธรรม
          - generic [ref=e594] [cursor=pointer]:
            - generic [ref=e595]: Designed & Developed by
            - generic [ref=e596]: Honest Predictor
            - img [ref=e597]
          - paragraph [ref=e601]: ETDA Responsible AI Innovation Hackathon 2026 | governance-first prototype สำหรับการสาธิตและประเมินเชิงสถาบัน
  - generic [ref=e602] [cursor=pointer]:
    - generic [ref=e603]:
      - paragraph [ref=e604]: สวัสดีครับ! 🙏
      - paragraph [ref=e605]: มีคำถามกฎหมายไหม? กดคุยได้เลย
    - img "น้องซื่อสัตย์" [ref=e606]
    - generic [ref=e607]: น้องซื่อสัตย์ AI
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
  33  |     expect(body).toMatch(/System Trust Layer|ผู้ใช้งานทุกบทบาทอยู่ภายใต้โครงสร้างความปลอดภัยเดียวกัน|Trace Console|AI Control Tower/);
  34  |   });
  35  | 
  36  |   test("'เริ่มค้นหาเลย' navigates to /search?role=citizen", async ({ page }) => {
  37  |     await goto(page, "/");
> 38  |     await page.getByText("เริ่มค้นหาเลย").click();
      |                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  134 |     expect(body).toBeTruthy();
  135 |     expect(body!.length).toBeGreaterThan(50);
  136 |   });
  137 | 
  138 |   test("shows 404 state for unknown id", async ({ page }) => {
```