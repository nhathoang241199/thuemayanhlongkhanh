import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error('Missing Facebook env');

  const draft = await prisma.fanpagePostDraft.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  if (!draft) throw new Error('No pending draft');

  const params = new URLSearchParams({
    message: draft.message,
    access_token: token,
    published: 'false',
  });
  if (draft.link) params.set('link', draft.link);

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/feed?${params}`,
    { method: 'POST' },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(json));
  }

  const row = await prisma.fanpagePostDraft.update({
    where: { id: draft.id },
    data: {
      status: 'published',
      publishPublic: false,
      facebookPostId: json.id,
      publishedAt: new Date(),
    },
  });

  console.log(
    JSON.stringify(
      {
        id: row.id,
        facebookPostId: row.facebookPostId,
        publishPublic: row.publishPublic,
        note: 'Private trên Meta — chỉ admin thấy',
      },
      null,
      2,
    ),
  );

  await prisma.fanpagePostDraft.updateMany({
    where: {
      status: 'published',
      facebookPostId: '948669851657698_122136540633183707',
    },
    data: {
      status: 'rejected',
      rejectNote: 'Đã xóa bài công khai (Meta không cho chuyển về private)',
      facebookPostId: null,
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
