export const BOOKING_TERMS_SOURCE_ID = 'booking-terms';

export const POLICY_RAG_EMBEDDING_DIM = 1536;

export type PolicyChunkParsed = {
  section: string | null;
  content: string;
  chunkIndex: number;
};

export type PolicyChunkHit = {
  section: string | null;
  content: string;
  score: number;
};

export type PolicyChunkRow = {
  id: string;
  sourceId: string;
  section: string | null;
  chunkIndex: number;
  content: string;
  createdAt: Date;
};
