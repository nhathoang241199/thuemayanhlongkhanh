import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const bookUrl =
    (process.env.FRONTEND_URL || 'https://thuemayanhlongkhanh.com').replace(
      /\/$/,
      '',
    ) + '/book';

  const message = [
    'Giảm 10% tiền thuê máy ảnh!',
    '',
    'Áp dụng: 05/09/2026 – 12/09/2026',
    'Khu vực Long Khánh',
    '',
    `Đặt lịch online: ${bookUrl}`,
  ].join('\n');

  const row = await prisma.fanpagePostDraft.create({
    data: {
      message,
      link: bookUrl,
      publishPublic: false,
      source: 'hermes',
      promotionNote: 'Bài mẫu test duyệt — chưa đăng công khai',
      status: 'pending',
    },
  });

  console.log(
    JSON.stringify(
      {
        id: row.id,
        status: row.status,
        publishPublic: row.publishPublic,
        message,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
