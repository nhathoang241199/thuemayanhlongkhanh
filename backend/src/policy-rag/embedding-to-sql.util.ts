/** Format dense embedding for Postgres `vector` type (pgvector). */
export function embeddingToSql(vector: number[]): string {
  return `[${vector.map((value) => Number(value)).join(',')}]`;
}
