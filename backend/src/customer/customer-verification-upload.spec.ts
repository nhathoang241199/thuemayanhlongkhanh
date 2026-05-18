import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  getPublicApiUrl,
  getUploadDir,
  verificationUploadPublicUrl,
} from '../common/upload-config';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from './customer.service';

describe('CustomerService verification images', () => {
  let service: CustomerService;
  const customerId = 'cust-test-1';
  const prisma = {
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CustomerService);
    process.env.PUBLIC_API_URL = 'http://localhost:3000';
  });

  const mockFile = (overrides?: Partial<Express.Multer.File>) =>
    ({
      fieldname: 'file',
      originalname: 'cccd.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image'),
      ...overrides,
    }) as Express.Multer.File;

  it('addVerificationImage appends public URL', async () => {
    prisma.customer.findUnique.mockResolvedValue({
      id: customerId,
      verificationImageUrls: [],
    });
    prisma.customer.update.mockResolvedValue({
      id: customerId,
      verificationImageUrls: ['pending'],
    });

    const file = mockFile();
    await service.addVerificationImage(customerId, file);

    expect(prisma.customer.update).toHaveBeenCalled();
    const pushArg = prisma.customer.update.mock.calls[0][0].data
      .verificationImageUrls.push as string;
    expect(pushArg).toMatch(
      new RegExp(
        `^${getPublicApiUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/uploads/verification/${customerId}/.+\\.jpg$`,
      ),
    );

    const filename = decodeURIComponent(pushArg.split('/').pop()!);
    const diskPath = join(
      getUploadDir(),
      'verification',
      customerId,
      filename,
    );
    await unlink(diskPath).catch(() => undefined);
  });

  it('addVerificationImage rejects when at max images', async () => {
    prisma.customer.findUnique.mockResolvedValue({
      id: customerId,
      verificationImageUrls: Array(10).fill('http://example.com/a.jpg'),
    });

    await expect(
      service.addVerificationImage(customerId, mockFile()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('addVerificationImage throws when customer missing', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(
      service.addVerificationImage(customerId, mockFile()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removeVerificationImage filters URL and deletes local file', async () => {
    const filename = 'test-remove.jpg';
    const publicUrl = verificationUploadPublicUrl(customerId, filename);
    const diskPath = join(
      getUploadDir(),
      'verification',
      customerId,
      filename,
    );
    await writeFile(diskPath, Buffer.from('x'));

    prisma.customer.findUnique.mockResolvedValue({
      id: customerId,
      verificationImageUrls: [publicUrl, 'https://cdn.example.com/external.jpg'],
    });
    prisma.customer.update.mockImplementation(({ data }) => ({
      id: customerId,
      verificationImageUrls: data.verificationImageUrls,
    }));

    const result = await service.removeVerificationImage(
      customerId,
      publicUrl,
    );

    expect(result.verificationImageUrls).toEqual([
      'https://cdn.example.com/external.jpg',
    ]);
    await expect(unlink(diskPath)).rejects.toThrow();
  });

  it('removeVerificationImage does not unlink external URLs', async () => {
    const external = 'https://cdn.example.com/external.jpg';
    prisma.customer.findUnique.mockResolvedValue({
      id: customerId,
      verificationImageUrls: [external],
    });
    prisma.customer.update.mockResolvedValue({
      id: customerId,
      verificationImageUrls: [],
    });

    await service.removeVerificationImage(customerId, external);
    expect(prisma.customer.update).toHaveBeenCalled();
  });

  it('removeVerificationImage rejects URL not on customer', async () => {
    prisma.customer.findUnique.mockResolvedValue({
      id: customerId,
      verificationImageUrls: [],
    });

    await expect(
      service.removeVerificationImage(customerId, 'http://missing'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
