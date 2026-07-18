import { toVectorLiteral } from '../vector-format';

describe('toVectorLiteral', () => {
  test('formats a numeric vector as pgvector text input', () => {
    expect(toVectorLiteral([1, 2.5, -3])).toBe('[1,2.5,-3]');
  });

  test('formats an empty vector', () => {
    expect(toVectorLiteral([])).toBe('[]');
  });
});
