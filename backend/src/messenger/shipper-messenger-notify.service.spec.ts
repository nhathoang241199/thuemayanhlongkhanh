import { ShipperMessengerNotifyService } from './shipper-messenger-notify.service';

describe('ShipperMessengerNotifyService', () => {
  const prisma = {
    shipper: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const graph = {
    sendProactiveText: jest.fn(),
  };
  const service = new ShipperMessengerNotifyService(
    prisma as never,
    graph as never,
  );

  const originalToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'test-token';
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    } else {
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN = originalToken;
    }
  });

  it('does not expose a new-ship-order Messenger broadcast', () => {
    expect(service).not.toHaveProperty('notifyShipOrderCreated');
    expect(prisma.shipper.findMany).not.toHaveBeenCalled();
  });

  it('still sends return-request Messenger to the assigned shipper', async () => {
    prisma.shipper.findFirst.mockResolvedValue({
      name: 'Shipper Test',
      messengerPsid: 'psid-1',
    });
    graph.sendProactiveText.mockResolvedValue(undefined);

    await service.notifyReturnRequest({
      shipperId: 'shipper-1',
      customerName: 'Khách A',
      customerPhone: '0900000000',
      address: '12 Địa chỉ, Long Khánh',
    });

    expect(graph.sendProactiveText).toHaveBeenCalledWith(
      'psid-1',
      'Khách A - 0900000000 đang yêu cầu trả máy tại: 12 Địa chỉ, Long Khánh',
    );
    expect(prisma.shipper.findMany).not.toHaveBeenCalled();
  });
});
