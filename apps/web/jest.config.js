/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // `jose` ships ESM-only (no CJS build), which Jest's CommonJS module
  // system can't load by default. Transform it with ts-jest (already a
  // dependency — TypeScript's compiler handles plain ESM->CJS syntax fine)
  // instead of pulling in a separate Babel toolchain for one package.
  // pnpm nests packages as node_modules/.pnpm/<pkg>@<version>/node_modules/
  // <pkg>, so the pattern targets that specific segment rather than a plain
  // "node_modules/jose/" substring, which a flat-node_modules pattern would
  // never actually match under pnpm.
  transformIgnorePatterns: ['node_modules/\\.pnpm/(?!(jose)@)'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
    'node_modules/\\.pnpm/jose@.+\\.js$': ['ts-jest', { isolatedModules: true }],
  },
};
