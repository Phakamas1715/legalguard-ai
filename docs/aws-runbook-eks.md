# AWS Runbook: Local to EKS

คู่มือนี้ใช้สำหรับนำ LegalGuard AI จากเครื่อง local ไปขึ้น EKS แบบทีละขั้น โดยอ้างอิงจาก [deploy.sh](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/deploy.sh), [env.production](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/env.production) และ [batch_ingest_data.py](/Users/megamac/Downloads/legalguard-ai-main/scripts/batch_ingest_data.py)

## 0. สมมติฐาน

- ใช้ region `ap-southeast-1`
- มี EKS cluster ชื่อ `legalguard-cluster`
- มี ECR repo ชื่อ `legalguard-ai-backend`
- มี namespace `legalguard`
- มี Aurora / Redis / Qdrant พร้อมใช้งานแล้ว

## 1. เตรียมเครื่อง local

ตรวจเครื่องมือ:

```bash
aws --version
kubectl version --client
docker --version
python3 --version
npm --version
```

login AWS:

```bash
aws configure
aws sts get-caller-identity
```

## 2. เตรียม environment backend

```bash
cd /Users/megamac/Downloads/legalguard-ai-main/backend
cp aws/env.production .env
```

แก้ค่าใน `.env` ให้ครบอย่างน้อย:
- `DATABASE_URL`
- `REDIS_URL`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `AWS_REGION`
- `CORS_ORIGINS`
- `BEDROCK_GUARDRAIL_ID`

## 3. ตรวจ build local ก่อน

Frontend:

```bash
cd /Users/megamac/Downloads/legalguard-ai-main
npm run build
```

Backend tests ที่สำคัญ:

```bash
cd /Users/megamac/Downloads/legalguard-ai-main
python3 -m pytest backend/tests/test_dashboard_live.py backend/tests/test_responsible_ai.py backend/tests/test_access_policy_service.py
```

## 4. สร้าง ingestion manifest ก่อนขึ้นจริง

```bash
cd /Users/megamac/Downloads/legalguard-ai-main
python3 scripts/batch_ingest_data.py
```

ตรวจผลที่:
- [ingestion_manifest.json](/Users/megamac/Downloads/legalguard-ai-main/data/ingestion_manifest.json)

จุดที่ต้องเช็ก:
- `ingest` คือไฟล์ที่พร้อมเข้า pipeline
- `manual_review` คือไฟล์ที่ยังต้องตรวจ/แปลงก่อน
- `skip` คือไฟล์ระบบหรือ artifact ภายใน

## 5. Build และ push image ขึ้น ECR

```bash
cd /Users/megamac/Downloads/legalguard-ai-main/backend/aws
./deploy.sh build
```

สิ่งที่ script นี้ทำ:
- build Docker image จาก [Dockerfile](/Users/megamac/Downloads/legalguard-ai-main/backend/Dockerfile)
- tag image ด้วย git SHA และ `latest`
- login ECR
- push image เข้า ECR

## 6. เชื่อม kubectl กับ EKS

```bash
aws eks update-kubeconfig --name legalguard-cluster --region ap-southeast-1
kubectl config current-context
kubectl get nodes
```

## 7. ตรวจและ apply secrets / manifests

ตรวจไฟล์:
- [secrets.yaml](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/secrets.yaml)
- [legalguard-secrets.env.template](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/legalguard-secrets.env.template)
- [deployment.yaml](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/deployment.yaml)
- [service.yaml](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/service.yaml)
- [hpa.yaml](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/hpa.yaml)
- [geocoder-deployment.yaml](/Users/megamac/Downloads/legalguard-ai-main/backend/aws/k8s/geocoder-deployment.yaml)

ถ้าจะสร้าง secret จาก env template:

```bash
kubectl create secret generic legalguard-secrets \
  --from-env-file=backend/aws/k8s/legalguard-secrets.env.template \
  -n legalguard \
  --dry-run=client -o yaml > backend/aws/k8s/secrets.generated.yaml
kubectl apply -f backend/aws/k8s/secrets.generated.yaml
```

จากนั้น deploy:

```bash
cd /Users/megamac/Downloads/legalguard-ai-main/backend/aws
./deploy.sh deploy
```

หรือถ้าจะทำทีละคำสั่ง:

```bash
kubectl create namespace legalguard --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f backend/aws/k8s/secrets.yaml
kubectl apply -f backend/aws/k8s/deployment.yaml
kubectl apply -f backend/aws/k8s/service.yaml
kubectl apply -f backend/aws/k8s/hpa.yaml
kubectl apply -f backend/aws/k8s/geocoder-deployment.yaml
```

## 8. ตรวจ rollout

```bash
kubectl rollout status deployment/legalguard-backend -n legalguard --timeout=300s
kubectl rollout status deployment/legalguard-geocoder -n legalguard --timeout=600s
kubectl get pods -n legalguard
kubectl get svc -n legalguard
```

## 9. ตรวจ health หลัง deploy

ถ้ามี LoadBalancer / Ingress แล้ว ให้ทดสอบ:

```bash
curl http://<backend-host>/health
curl http://<backend-host>/api/v1/dashboard/live
curl http://<backend-host>/api/v1/dashboard/safety-pipeline
curl http://<backend-host>/api/v1/responsible-ai/release-guard
curl http://<backend-host>/api/v1/ingest/recent?limit=5
```

## 10. Batch ingest หลัง backend พร้อม

Smoke run เฉพาะ JSON ก่อน:

```bash
cd /Users/megamac/Downloads/legalguard-ai-main
python3 scripts/batch_ingest_data.py --execute --pipelines structured_judgment_json
```

Smoke run PDF แบบจำกัดไฟล์ต่อกลุ่ม:

```bash
python3 scripts/batch_ingest_data.py --execute --pipelines pdf_rag_pipeline --max-files-per-group 3 --batch-size 10
```

รันเต็มสำหรับไฟล์ที่ manifest อนุญาต:

```bash
python3 scripts/batch_ingest_data.py --execute --batch-size 50
```

## 11. ตรวจ ingestion result

ดูจาก API:

```bash
curl http://<backend-host>/api/v1/ingest/recent?limit=20
```

หรือถ้ารันในเครื่องเดียวกับ repo:

```bash
sqlite3 /Users/megamac/Downloads/legalguard-ai-main/data/jobs.db "select job_id, data from jobs order by rowid desc limit 5;"
```

## 12. Frontend production

ตั้งค่า frontend ให้ชี้ backend production:
- ปรับ `VITE_API_BASE_URL` หรือ runtime config ให้ตรง host จริง

จากนั้น build:

```bash
cd /Users/megamac/Downloads/legalguard-ai-main
npm run build
```

แล้วค่อย deploy static assets ไปยัง hosting ที่ใช้จริง

## 13. Sign-off ก่อน go-live

- auth production เปิดแล้ว
- role-based access เปิดแล้ว
- CORS ตรงโดเมนจริง
- secrets ไม่เป็น placeholder
- BM25/Qdrant พร้อมค้นจริง
- audit log เขียนได้
- release guard ผ่าน
- ingestion smoke run ผ่านอย่างน้อย 1 รอบ
