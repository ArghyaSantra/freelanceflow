import dotenv from "dotenv";

dotenv.config();
import { Worker, Queue } from "bullmq";
import { redisConnection } from "./lib/redis";
import { embedSignature } from "./jobs/embedSignature";
import {
  sendSigningRequestEmail,
  sendDocumentSignedEmail,
  sendInvoiceEmail,
} from "./jobs/sendEmail";

console.log("🔧 FreelanceFlow Worker starting...");

// ── Queues ────────────────────────────────────────────────
export const signatureQueue = new Queue("embed-signature", redisConnection);
export const emailQueue = new Queue("send-email", redisConnection);

// ── Workers ───────────────────────────────────────────────

// Embed signature worker
new Worker(
  "embed-signature",
  async (job) => {
    console.log(`Processing embed-signature job ${job.id}`);
    await embedSignature(job.data);
  },
  {
    ...redisConnection,
    concurrency: 5,
  },
);

// Email worker
new Worker(
  "send-email",
  async (job) => {
    console.log(`Processing send-email job: ${job.name}`);

    switch (job.name) {
      case "signing-request":
        await sendSigningRequestEmail(
          job.data.to,
          job.data.signingLink,
          job.data.documentTitle,
          job.data.workspaceName,
        );
        break;

      case "document-signed":
        await sendDocumentSignedEmail(
          job.data.to,
          job.data.signerName,
          job.data.documentTitle,
        );
        break;

      case "invoice":
        await sendInvoiceEmail(
          job.data.to,
          job.data.invoiceNumber,
          job.data.total,
          job.data.dueDate,
          job.data.paymentLink,
          job.data.workspaceName,
        );
        break;

      default:
        console.warn(`Unknown email job: ${job.name}`);
    }
  },
  {
    ...redisConnection,
    concurrency: 10,
  },
);

console.log("✓ Workers running — listening for jobs");
console.log("  → embed-signature queue");
console.log("  → send-email queue");

// graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  process.exit(0);
});
