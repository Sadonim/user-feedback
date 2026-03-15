// DEV ONLY — Change credentials before any non-local deployment
import { PrismaClient, FeedbackType, TicketStatus, Priority } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding database...');

  // Admin accounts
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';
  const managerPassword = process.env.SEED_MANAGER_PASSWORD ?? 'manager1234';

  const adminHash = await hash(adminPassword, BCRYPT_ROUNDS);
  const managerHash = await hash(managerPassword, BCRYPT_ROUNDS);

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.adminUser.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      username: 'manager',
      passwordHash: managerHash,
      role: 'MANAGER',
    },
  });

  console.log(`✅ Admin users: ${admin.email}, ${manager.email}`);

  // Sample feedback tickets
  const samples: {
    type: FeedbackType;
    status: TicketStatus;
    title: string;
    description: string;
    nickname: string;
    email?: string;
    priority?: Priority;
  }[] = [
    {
      type: 'BUG',
      status: 'OPEN',
      title: 'Submit button not responding on mobile',
      description: 'When I tap the submit button on iPhone 14, nothing happens. Tried refreshing but same issue.',
      nickname: 'alice',
      email: 'alice@example.com',
      priority: 'HIGH',
    },
    {
      type: 'FEATURE',
      status: 'IN_PROGRESS',
      title: 'Add dark mode support',
      description: 'Would love to have a dark mode option. My eyes hurt at night.',
      nickname: 'bob',
      priority: 'MEDIUM',
    },
    {
      type: 'BUG',
      status: 'RESOLVED',
      title: 'Tracking ID not found after submission',
      description: 'I submitted feedback and got a tracking ID, but when I tried to track it, it says not found.',
      nickname: 'carol',
      email: 'carol@example.com',
    },
    {
      type: 'GENERAL',
      status: 'OPEN',
      title: 'Question about data retention policy',
      description: 'How long do you keep submitted feedback? Is there a way to delete my submission?',
      nickname: 'dave',
      email: 'dave@example.com',
    },
    {
      type: 'FEATURE',
      status: 'OPEN',
      title: 'Export feedback to CSV',
      description: 'It would be helpful to export all feedback data to CSV for analysis.',
      nickname: 'eve',
      priority: 'LOW',
    },
    {
      type: 'BUG',
      status: 'CLOSED',
      title: 'Form validation shows wrong error message',
      description: 'When I leave the title empty, it shows "description is required" instead of "title is required".',
      nickname: 'frank',
    },
    {
      type: 'FEATURE',
      status: 'OPEN',
      title: 'Email notifications for status changes',
      description: 'Please notify me by email when the status of my ticket changes.',
      nickname: 'grace',
      email: 'grace@example.com',
      priority: 'MEDIUM',
    },
  ];

  for (const sample of samples) {
    const { nanoid } = await import('nanoid');
    const trackingId = `FB-${nanoid(8)}`;

    const feedback = await prisma.feedback.create({
      data: {
        type: sample.type,
        status: sample.status,
        title: sample.title,
        description: sample.description,
        nickname: sample.nickname,
        email: sample.email ?? null,
        priority: sample.priority ?? null,
        trackingId,
      },
    });

    // Create initial OPEN status history entry
    await prisma.statusHistory.create({
      data: {
        feedbackId: feedback.id,
        fromStatus: null,
        toStatus: 'OPEN',
        changedById: null,
        note: 'Ticket submitted',
      },
    });

    // Add additional history for non-OPEN tickets
    if (sample.status === 'IN_PROGRESS') {
      await prisma.statusHistory.create({
        data: {
          feedbackId: feedback.id,
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          changedById: admin.id,
          note: 'Looking into this',
        },
      });
    } else if (sample.status === 'RESOLVED') {
      await prisma.statusHistory.create({
        data: {
          feedbackId: feedback.id,
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          changedById: admin.id,
          note: null,
        },
      });
      await prisma.statusHistory.create({
        data: {
          feedbackId: feedback.id,
          fromStatus: 'IN_PROGRESS',
          toStatus: 'RESOLVED',
          changedById: admin.id,
          note: 'Fixed in latest deploy',
        },
      });
    } else if (sample.status === 'CLOSED') {
      await prisma.statusHistory.create({
        data: {
          feedbackId: feedback.id,
          fromStatus: 'OPEN',
          toStatus: 'CLOSED',
          changedById: admin.id,
          note: 'Duplicate report, already fixed',
        },
      });
    }
  }

  console.log(`✅ Created ${samples.length} sample tickets`);
  console.log('🎉 Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
