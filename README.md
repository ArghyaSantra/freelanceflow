# FreelanceFlow

Contract signing and invoicing platform for freelancers and small teams.

## Stack

- **Frontend** — React + Vite + TypeScript + Tailwind
- **API** — Express + TypeScript + Prisma
- **Worker** — Node + BullMQ
- **Database** — PostgreSQL
- **Cache/Queue** — Redis (Upstash)
- **Storage** — AWS S3
- **Payments** — Razorpay

## Structure

\`\`\`
apps/
├── api/ → Express REST API
├── worker/ → Background job processor
└── web/ → React frontend
\`\`\`

## Environments

- **Production** → main branch
- **Staging** → dev branch
