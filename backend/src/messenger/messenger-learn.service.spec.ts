import { MessengerLearnService } from './messenger-learn.service';

describe('MessengerLearnService', () => {
  const prisma = {
    messengerConversation: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    messengerMessage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    messengerLearnExample: {
      create: jest.fn(),
    },
  };

  const service = new MessengerLearnService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('collectUnpairedUserMessage joins user turns since last shop reply', async () => {
    prisma.messengerMessage.findFirst.mockResolvedValue({
      createdAt: new Date('2026-09-04T10:00:00Z'),
    });
    prisma.messengerMessage.findMany.mockResolvedValue([
      { content: 'A oi' },
      { content: 'Mai 6-7g a book giao e dc k' },
    ]);

    const result = await service.collectUnpairedUserMessage('conv-1');

    expect(result).toBe('A oi\n---\nMai 6-7g a book giao e dc k');
    expect(prisma.messengerMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conv-1',
          role: 'user',
        }),
      }),
    );
  });

  it('recordOwnerReply creates learn example when user message exists', async () => {
    prisma.messengerConversation.upsert.mockResolvedValue({ id: 'conv-1' });
    prisma.messengerMessage.create.mockResolvedValue({});
    prisma.messengerConversation.update.mockResolvedValue({});
    prisma.messengerMessage.findFirst.mockResolvedValue(null);
    prisma.messengerMessage.findMany.mockResolvedValue([
      { content: 'Mai 6-7g a book giao e dc k' },
    ]);
    prisma.messengerLearnExample.create.mockResolvedValue({});

    await service.recordOwnerReply('psid-1', 'Em giao sáng 6-7h được nha');

    expect(prisma.messengerLearnExample.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conv-1',
        userMessage: 'Mai 6-7g a book giao e dc k',
        ownerReply: 'Em giao sáng 6-7h được nha',
        status: 'pending',
      },
    });
  });
});
