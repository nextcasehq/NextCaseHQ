/**
 * pgvector accepts its own text input format ('[v1,v2,...]', cast via
 * ::vector) directly through the plain `pg` driver — no extra npm
 * dependency (e.g. the `pgvector` package) is needed just to send a
 * parameter.
 */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
