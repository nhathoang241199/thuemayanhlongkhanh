import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyRagAskService } from './policy-rag-ask.service';
import { PolicyRagController } from './policy-rag.controller';
import { PolicyRagEmbeddingService } from './policy-rag-embedding.service';
import { PolicyRagIndexService } from './policy-rag-index.service';
import { PolicyRagRetrieveService } from './policy-rag-retrieve.service';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyRagController],
  providers: [
    PolicyRagEmbeddingService,
    PolicyRagIndexService,
    PolicyRagRetrieveService,
    PolicyRagAskService,
  ],
  exports: [
    PolicyRagIndexService,
    PolicyRagRetrieveService,
    PolicyRagAskService,
  ],
})
export class PolicyRagModule {}
