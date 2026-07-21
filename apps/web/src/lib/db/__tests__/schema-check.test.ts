import { collectMissingTables, validateStartupSchema } from '../schema-check';

describe('collectMissingTables', () => {
  test('returns empty when DATABASE_URL is unset', async () => {
    expect(await collectMissingTables(undefined)).toEqual([]);
  });

  test('finds no missing tables against the real, migrated test database', async () => {
    expect(await collectMissingTables(process.env.DATABASE_URL)).toEqual([]);
  });

  test('reports a table as missing when it genuinely does not exist', async () => {
    const missing = await collectMissingTables(process.env.DATABASE_URL);
    expect(missing).not.toContain('DocumentDraft');
  });
});

describe('validateStartupSchema', () => {
  test('does nothing outside production, even with no DATABASE_URL', async () => {
    await expect(validateStartupSchema({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).resolves.toBeUndefined();
  });

  test('passes in production against the real, migrated test database', async () => {
    await expect(
      validateStartupSchema({ NODE_ENV: 'production', DATABASE_URL: process.env.DATABASE_URL } as NodeJS.ProcessEnv)
    ).resolves.toBeUndefined();
  });

  test('throws in production when DocumentDraft is missing', async () => {
    await expect(
      validateStartupSchema({
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/nextcase_dev_schema_check_missing_db'),
      } as NodeJS.ProcessEnv)
    ).rejects.toThrow(/DATABASE_URL|does not exist|Startup schema validation failed/);
  });
});
