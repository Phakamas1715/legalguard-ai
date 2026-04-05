import fs from 'fs';
import { maskPII } from '../src/lib/piiMasking.ts';
import { LegalQueryPlanner } from '../src/lib/legalAdapters.ts';

/**
 * ⚖️ LegalGuard AI: Data Ingestion Script (TS-Node compatible)
 */

async function ingestData(filePath: string) {
  console.log(`\n🚀 Starting Ingestion for: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File ${filePath} not found.`);
      return;
    }

    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const cases = Array.isArray(rawData) ? rawData : [rawData];

    console.log(`📂 Found ${cases.length} entries. Processing...\n`);

    for (const entry of cases) {
      const textToProcess = entry.fullText || entry.content || "";
      
      const maskedResult = maskPII(textToProcess);
      const plan = LegalQueryPlanner.plan(textToProcess);
      
      console.log(`✅ Case: ${entry.caseNo || "Unknown"}`);
      console.log(`   - PII Detected: ${maskedResult.piiCount} (Protected)`);
      console.log(`   - Storage: ${plan.strategy}`);
      console.log('--------------------------------------------------');
    }

    console.log('\n🎉 Ingestion Complete via LegalGuard Pipeline.\n');
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ Ingestion Failed:', err.message);
    } else {
      console.error('❌ Ingestion Failed:', err);
    }
  }
}

const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));
if (fileArg) {
  ingestData(fileArg.split('=')[1]);
} else {
  console.log('Usage: npm run ingest -- --file=data/your_file.json');
}
