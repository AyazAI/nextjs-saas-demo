import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SAMPLE_ORG_NAME, SAMPLE_ORG_SLUG } from "../src/domain/demo";
import { hashPassword } from "../src/server/password";

const prisma = new PrismaClient();

function date(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed");
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = [];
  for (const account of DEMO_ACCOUNTS) {
    users.push(
      await prisma.user.upsert({
        where: { email: account.email },
        update: { name: account.name, passwordHash },
        create: { name: account.name, email: account.email, passwordHash },
      }),
    );
  }
  const [owner, admin, member] = users;
  if (!owner || !admin || !member) throw new Error("Seed accounts were not created");

  const organization = await prisma.organization.upsert({
    where: { slug: SAMPLE_ORG_SLUG },
    update: {
      name: SAMPLE_ORG_NAME,
      plan: "FREE",
      subscriptionStatus: "NONE",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
    create: { name: SAMPLE_ORG_NAME, slug: SAMPLE_ORG_SLUG },
  });

  for (const entry of [
    { userId: owner.id, role: "OWNER" as const },
    { userId: admin.id, role: "ADMIN" as const },
    { userId: member.id, role: "MEMBER" as const },
  ]) {
    await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: entry.userId } },
      update: { role: entry.role },
      create: { organizationId: organization.id, userId: entry.userId, role: entry.role },
    });
  }

  await prisma.membership.deleteMany({
    where: { organizationId: organization.id, userId: { notIn: users.map((user) => user.id) } },
  });
  await prisma.invoice.deleteMany({ where: { organizationId: organization.id } });
  await prisma.task.deleteMany({ where: { organizationId: organization.id } });
  await prisma.client.deleteMany({ where: { organizationId: organization.id } });
  await prisma.activity.deleteMany({ where: { organizationId: organization.id } });
  await prisma.billingEvent.deleteMany({ where: { organizationId: organization.id } });

  const clientInputs = [
    {
      name: "Northwind Atelier",
      email: "studio@northwind.example",
      company: "Northwind Atelier",
    },
    {
      name: "Paper Lantern Co.",
      email: "hello@paperlantern.example",
      company: "Paper Lantern Co.",
    },
    { name: "Kite & Cable", email: "ops@kiteandcable.example", company: "Kite & Cable" },
  ];
  const clients = [];
  for (const input of clientInputs) {
    clients.push(
      await prisma.client.create({
        data: { organizationId: organization.id, ...input },
      }),
    );
  }
  const [northwind, lantern, kite] = clients;
  if (!northwind || !lantern || !kite) throw new Error("Seed clients were not created");

  const taskInputs = [
    {
      title: "Draft the November newsletter",
      description: "Fictional sample task for the seeded workspace.",
      status: "IN_PROGRESS" as const,
      clientId: northwind.id,
      assigneeId: member.id,
      dueOn: date("2026-11-20"),
    },
    {
      title: "Reconcile the Paper Lantern invoice",
      description: "Fictional sample task. Paper Lantern Co. is not a customer.",
      status: "TODO" as const,
      clientId: lantern.id,
      assigneeId: admin.id,
      dueOn: date("2026-11-18"),
    },
    {
      title: "File the closed Kite & Cable brief",
      description: "Fictional sample task, already done.",
      status: "DONE" as const,
      clientId: kite.id,
      assigneeId: owner.id,
      dueOn: date("2026-11-02"),
    },
  ];
  for (const input of taskInputs) {
    await prisma.task.create({ data: { organizationId: organization.id, ...input } });
  }

  const invoiceInputs = [
    {
      number: "SAMPLE-1001",
      clientId: lantern.id,
      status: "SENT" as const,
      issuedOn: date("2026-11-01"),
      dueOn: date("2026-11-15"),
      line: { description: "Brand workshop", quantity: 1, unitAmountCents: 180000 },
    },
    {
      number: "SAMPLE-1002",
      clientId: northwind.id,
      status: "PAID" as const,
      issuedOn: date("2026-10-12"),
      dueOn: date("2026-10-26"),
      line: { description: "Site edits", quantity: 3, unitAmountCents: 45000 },
    },
  ];
  for (const input of invoiceInputs) {
    await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        clientId: input.clientId,
        number: input.number,
        status: input.status,
        issuedOn: input.issuedOn,
        dueOn: input.dueOn,
        lines: { create: [{ position: 1, ...input.line }] },
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      {
        organizationId: organization.id,
        actorId: owner.id,
        action: "seed",
        summary: "Seeded the fictional Sample Studio workspace.",
      },
      {
        organizationId: organization.id,
        actorId: owner.id,
        action: "seed",
        summary: "Added fictional clients Northwind Atelier, Paper Lantern Co., and Kite & Cable.",
      },
    ],
  });

  console.log("Seeded Sample Studio. Accounts use the password documented in the README.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
