import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { db } from './client.js';
import {
  events,
  orders,
  organizationMembers,
  organizations,
  subscriptions,
  users,
  type LineItem,
  type OrderStatusValue,
} from './schema.js';

const url =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saas_starter';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  const el = arr[Math.floor(rng() * arr.length)];
  if (el === undefined) {
    throw new Error('pick from empty array');
  }
  return el;
}

const statusWeights: { status: OrderStatusValue; weight: number }[] = [
  { status: 'paid', weight: 60 },
  { status: 'pending', weight: 25 },
  { status: 'refunded', weight: 10 },
  { status: 'failed', weight: 5 },
];

function pickStatus(rng: () => number): OrderStatusValue {
  const r = rng() * 100;
  let acc = 0;
  for (const s of statusWeights) {
    acc += s.weight;
    if (r < acc) {
      return s.status;
    }
  }
  return 'paid';
}

const prices = [999, 1999, 2999, 4999, 9999, 14999, 24999, 39999];
const firstNames = [
  'Aisha',
  'Omar',
  'Layla',
  'Yusuf',
  'Noor',
  'Karim',
  'Maya',
  'Zain',
  'Leila',
  'Tariq',
  'Amira',
  'Hassan',
  'Sara',
  'Bilal',
] as const;
const lastNames = [
  'Khan',
  'Ahmed',
  'Hassan',
  'Rahman',
  'Ali',
  'Siddiqui',
  'Malik',
  'Farouk',
  'Aziz',
  'Nasser',
] as const;
const productNames = ['Alpha', 'Beta', 'Gamma', 'Delta'] as const;
const eventTypes = [
  'order.created',
  'order.status_changed',
  'order.paid',
  'user.invited',
  'user.removed',
  'settings.updated',
  'subscription.updated',
  'api.access',
] as const;

const dayMs = 24 * 60 * 60 * 1000;
const seedPassword = 'Password123!';

async function main() {
  const pool = new Pool({ connectionString: url });
  const client = db(pool);

  try {
    console.log(`Connecting to ${url}`);

    await client.execute(sql`
      TRUNCATE TABLE subscriptions, events, orders, sessions, organization_members, users, organizations
      RESTART IDENTITY CASCADE
    `);

    const orgDefs = [
      { name: 'Acme Inc', slug: 'acme', emailDomain: 'acme.test', orderCount: 120 },
      { name: 'Globex Corp', slug: 'globex', emailDomain: 'globex.test', orderCount: 80 },
    ];

    const insertedOrgs = await client
      .insert(organizations)
      .values(orgDefs.map((o) => ({ name: o.name, slug: o.slug })))
      .returning();

    const rng = mulberry32(0xc0ffee);

    const orgUsers: { org: (typeof insertedOrgs)[number]; users: (typeof users.$inferSelect)[] }[] =
      [];
    for (const org of insertedOrgs) {
      const def = orgDefs.find((d) => d.slug === org.slug);
      if (!def) {
        throw new Error(`no org def for ${org.slug}`);
      }
      const roles = ['owner', 'admin', 'member1', 'member2'];
      const rows = await Promise.all(
        roles.map(async (role) => ({
          email: `${role}@${def.emailDomain}`,
          name: `${def.name} ${role}`,
          passwordHash: await bcrypt.hash(seedPassword, 12),
        })),
      );
      const created = await client.insert(users).values(rows).returning();
      orgUsers.push({ org, users: created });
    }

    for (const { org, users: members } of orgUsers) {
      await client.insert(organizationMembers).values([
        { organizationId: org.id, userId: members[0]?.id ?? '', role: 'owner' },
        { organizationId: org.id, userId: members[1]?.id ?? '', role: 'admin' },
        { organizationId: org.id, userId: members[2]?.id ?? '', role: 'member' },
        { organizationId: org.id, userId: members[3]?.id ?? '', role: 'member' },
      ]);
    }

    const now = Date.now();
    const orderRows: typeof orders.$inferInsert[] = [];

    for (const { org, users: members } of orgUsers) {
      const def = orgDefs.find((d) => d.slug === org.slug);
      if (!def) {
        throw new Error(`no org def for ${org.slug}`);
      }
      for (let i = 0; i < def.orderCount; i++) {
        const daysAgo = Math.floor(rng() * 90);
        const createdAt = new Date(now - daysAgo * dayMs - Math.floor(rng() * dayMs));
        const amountCents = pick(rng, prices);
        const quantity = 1 + Math.floor(rng() * 3);
        const unitPriceCents = Math.round(amountCents / quantity);
        const firstName = pick(rng, firstNames);
        const lastName = pick(rng, lastNames);
        const creator = pick(rng, members);
        const lineItems: LineItem[] = [
          {
            sku: `SKU-${1000 + Math.floor(rng() * 9000)}`,
            name: `Product ${pick(rng, productNames)}`,
            quantity,
            unitPriceCents,
          },
        ];
        orderRows.push({
          tenantId: org.id,
          createdBy: creator.id,
          customerName: `${firstName} ${lastName}`,
          customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          amountCents,
          currency: 'USD',
          status: pickStatus(rng),
          lineItems,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
    await client.insert(orders).values(orderRows);

    const eventRows: typeof events.$inferInsert[] = [];
    for (let i = 0; i < 50; i++) {
      const { org } = orgUsers[i % orgUsers.length] ?? { org: undefined };
      if (!org) {
        continue;
      }
      const daysAgo = Math.floor(rng() * 45);
      eventRows.push({
        tenantId: org.id,
        type: pick(rng, eventTypes),
        payload: { source: 'seed', sequence: i },
        createdAt: new Date(now - daysAgo * dayMs - Math.floor(rng() * dayMs)),
      });
    }
    await client.insert(events).values(eventRows);

    const [freeOrg, proOrg] = orgUsers.map(({ org }) => org);
    if (!freeOrg || !proOrg) {
      throw new Error('missing orgs for subscriptions');
    }
    await client.insert(subscriptions).values([
      {
        tenantId: freeOrg.id,
        plan: 'free',
        status: 'trialing',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
      {
        tenantId: proOrg.id,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_seed_pro',
        stripeSubscriptionId: 'sub_seed_pro',
        currentPeriodEnd: new Date(now + 30 * dayMs),
      },
    ]);

    console.log('Seeded database:');
    console.log(`  organizations: ${insertedOrgs.length}`);
    console.log(`  users: ${orgUsers.reduce((n, o) => n + o.users.length, 0)}`);
    console.log(`  memberships: ${orgUsers.length * 4}`);
    console.log(`  orders: ${orderRows.length}`);
    console.log(`  events: ${eventRows.length}`);
    console.log('  subscriptions: 2');
    console.log('');
    console.log('Demo logins (password: ' + seedPassword + '):');
    for (const { org, users: members } of orgUsers) {
      for (const u of members) {
        console.log(`  ${u.email.padEnd(24)}  ${org.name}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
