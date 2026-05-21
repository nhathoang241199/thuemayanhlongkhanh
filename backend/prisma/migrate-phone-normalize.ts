/**
 * Chuẩn hóa Customer.phone về dạng 0xxxxxxxxx; gộp khách trùng sau chuẩn hóa.
 * Chạy: npx tsx prisma/migrate-phone-normalize.ts
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { normalizePhone } from '../src/common/normalize-phone';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bookings: true } } },
  });

  const byNormalized = new Map<string, typeof customers>();
  for (const c of customers) {
    const key = normalizePhone(c.phone);
    const list = byNormalized.get(key) ?? [];
    list.push(c);
    byNormalized.set(key, list);
  }

  let updated = 0;
  let merged = 0;
  let deleted = 0;

  for (const [targetPhone, group] of byNormalized) {
    if (group.length === 1) {
      const c = group[0];
      if (c.phone !== targetPhone) {
        await prisma.customer.update({
          where: { id: c.id },
          data: { phone: targetPhone },
        });
        updated += 1;
        console.log(`Updated ${c.id}: ${c.phone} → ${targetPhone}`);
      }
      continue;
    }

    group.sort(
      (a, b) =>
        (a.phone.startsWith('0') ? 0 : 1) -
          (b.phone.startsWith('0') ? 0 : 1) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const canonical = group[0];
    if (canonical.phone !== targetPhone) {
      await prisma.customer.update({
        where: { id: canonical.id },
        data: { phone: targetPhone },
      });
      updated += 1;
      console.log(
        `Updated canonical ${canonical.id}: ${canonical.phone} → ${targetPhone}`,
      );
    }

    for (let i = 1; i < group.length; i++) {
      const dup = group[i];
      const moved = await prisma.booking.updateMany({
        where: { customerId: dup.id },
        data: { customerId: canonical.id },
      });
      await prisma.customer.delete({ where: { id: dup.id } });
      merged += 1;
      deleted += 1;
      console.log(
        `Merged ${dup.id} (${dup.phone}) → ${canonical.id}; bookings moved: ${moved.count}`,
      );
    }
  }

  console.log(
    `Done. updated=${updated} mergedGroups=${merged} deleted=${deleted}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
