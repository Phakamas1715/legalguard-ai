# AWS Deployment Checklist

ใช้เอกสารนี้ก่อนนำ LegalGuard AI ขึ้นระบบ AWS จริง โดยอ้างอิงจาก [deploy.sh](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/deploy.sh), [env.production](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/env.production) และ [Dockerfile](/Users/megamac/Downloads/legalguard-ai-main/backend/Dockerfile)

## 1. Access และบัญชี

- มี AWS account สำหรับ production หรือ sandbox ที่อนุมัติแล้ว
- มี IAM user/role สำหรับ `aws`, `ecr`, `eks`, `rds`, `elasticache`, `secretsmanager`, `kms`, `bedrock`
- ยืนยัน region ที่ใช้คือ `ap-southeast-1`
- ยืนยันว่า Bedrock model access ถูกเปิดแล้วสำหรับโมเดลที่ระบบใช้

## 2. Core Infrastructure

- สร้าง ECR repository: `legalguard-ai-backend`
- สร้าง EKS cluster: `legalguard-cluster`
- สร้าง namespace: `legalguard`
- สร้าง Aurora PostgreSQL หรือ PostgreSQL ที่รองรับงาน metadata/runtime
- สร้าง Redis/ElastiCache สำหรับ cache และ session runtime
- สร้าง Qdrant service หรือกำหนดทางเลือกเป็น pgvector ให้ชัดก่อน deploy
- จัดเตรียม persistent volume สำหรับ `BM25_INDEX_PATH`
- จัดเตรียม S3 bucket สำหรับเอกสารต้นฉบับ, export, logs, และ datasets

## 3. Secrets และ Configuration

- คัดลอกค่าตั้งต้นจาก [env.production](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/env.production)
- กำหนด `DATABASE_URL` จริง
- กำหนด `REDIS_URL` จริง
- กำหนด `QDRANT_URL` และ `QDRANT_API_KEY` จริง
- กำหนด `AWS_REGION`
- กำหนด `CORS_ORIGINS` ให้ตรงโดเมน production
- กำหนด `BEDROCK_GUARDRAIL_ID` ถ้าใช้ guardrails จริง
- ยืนยันว่าไม่มีการใช้ placeholder เช่น `CHANGE_ME`, `xxx`, `your-guardrail-id`
- เก็บ secrets ใน AWS Secrets Manager หรือ Kubernetes Secret แทนการ hardcode
- ถ้าใช้ Kubernetes Secret โดยตรง ให้เริ่มจาก [legalguard-secrets.env.template](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/legalguard-secrets.env.template)

## 4. Data Plane และ Ingestion

- สร้าง manifest ล่าสุดด้วย:

```bash
python3 scripts/batch_ingest_data.py
```

- ตรวจไฟล์ [ingestion_manifest.json](/Users/megamac/Downloads/legalguard-ai-main/data/ingestion_manifest.json)
- ตรวจรายการ `manual_review` ก่อน ingest จริง
- ยืนยันว่า PDF corpus ที่จะ ingest ผ่านการคัดสิทธิ์การใช้งานและ PDPA แล้ว
- ยืนยันว่า structured JSON ที่จะ ingest ไม่มี PII ที่ห้ามจัดเก็บ
- เตรียม volume/path สำหรับ BM25 index และตรวจ write permission

## 5. Build และ Push Image

- login AWS CLI ได้
- login Docker ได้
- build image backend ได้จาก [Dockerfile](/Users/megamac/Downloads/legalguard-ai-main/backend/Dockerfile)
- push image เข้า ECR ได้

คำสั่งหลัก:

```bash
cd backend/aws
./deploy.sh build
```

## 6. Deploy Application

- อัปเดต kubeconfig สำหรับ EKS
- ตรวจ secret manifests ใน `backend/aws/k8s/`
- apply deployment, service, HPA, และ geocoder deployment
- ตรวจ rollout status จน complete

คำสั่งหลัก:

```bash
cd backend/aws
./deploy.sh deploy
```

ถ้าจะสร้าง secret จาก env template ก่อน deploy:

```bash
kubectl create secret generic legalguard-secrets \
  --from-env-file=backend/aws/k8s/legalguard-secrets.env.template \
  -n legalguard \
  --dry-run=client -o yaml > backend/aws/k8s/secrets.generated.yaml
kubectl apply -f backend/aws/k8s/secrets.generated.yaml
```

## 7. Post-Deploy Validation

- `/health` ตอบปกติ
- `/api/v1/dashboard/live` ตอบได้
- `/api/v1/dashboard/safety-pipeline` ตอบได้
- `/api/v1/responsible-ai/release-guard` ตอบได้
- `/api/v1/ingest/recent` ตอบได้
- frontend ชี้ `API_BASE` ไป backend production แล้ว
- CORS ไม่ block production frontend
- auth/role access เปิดใช้งานจริง ไม่ใช้ dev mode
- audit log เขียนได้
- BM25 และ Qdrant พร้อมค้นจริง

## 8. Batch Ingestion หลัง Deploy

- สร้าง manifest:

```bash
python3 scripts/batch_ingest_data.py
```

- รัน ingest สำหรับไฟล์ที่ระบบรองรับ:

```bash
python3 scripts/batch_ingest_data.py --execute --batch-size 50
```

- ตรวจผลใน [jobs.db](/Users/megamac/Downloads/legalguard-ai-main/data/jobs.db) หรือผ่าน `/api/v1/ingest/recent`

## 9. Security Sign-off

- เปิด auth production จริง
- เปิด role-based access จริง
- ตรวจ KMS / encryption at rest / encryption in transit
- จำกัด public access ของ DB, Redis, และ Qdrant
- ตั้ง monitoring และ alerting ให้ EKS, API, ingestion jobs, และ Bedrock usage
- ตรวจ WAF / rate limit / security headers

## 10. Go-Live Decision

- build ผ่าน
- deploy ผ่าน
- health checks ผ่าน
- ingestion sample ผ่าน
- search / chat / dashboard ผ่าน
- release guard ผ่านตามเกณฑ์
- ได้ sign-off จากทีมระบบ, ทีมข้อมูล, และผู้รับผิดชอบด้าน PDPA
