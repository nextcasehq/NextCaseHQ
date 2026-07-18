import {
  isObjectStorageConfigured,
  putObject,
  getObject,
  deleteObject,
  __resetObjectStorageConfigForTests,
} from '../object-storage';

const ORIGINAL_ENV = {
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
};

function restoreEnv(key: keyof typeof ORIGINAL_ENV) {
  const value = ORIGINAL_ENV[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  (Object.keys(ORIGINAL_ENV) as (keyof typeof ORIGINAL_ENV)[]).forEach(restoreEnv);
  __resetObjectStorageConfigForTests();
});

describe('object-storage — unconfigured', () => {
  test('isObjectStorageConfigured is false when S3_* env vars are unset', () => {
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    __resetObjectStorageConfigForTests();
    expect(isObjectStorageConfigured()).toBe(false);
  });

  test('putObject throws a clear error when unconfigured, rather than silently no-op-ing', async () => {
    delete process.env.S3_ENDPOINT;
    __resetObjectStorageConfigForTests();
    await expect(putObject('some/key', Buffer.from('x'), 'text/plain')).rejects.toThrow(
      'OBJECT_STORAGE_NOT_CONFIGURED'
    );
  });
});

describe('object-storage — configured against a real S3-compatible server (s3rver)', () => {
  const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

  beforeEach(() => {
    __resetObjectStorageConfigForTests();
  });

  test('isObjectStorageConfigured is true when S3_* env vars are set', () => {
    if (!hasS3()) return; // requires `pnpm test:start-s3rver` running, same as Redis/Postgres
    expect(isObjectStorageConfigured()).toBe(true);
  });

  test('put -> get -> delete round-trips real bytes through a real S3-compatible server', async () => {
    if (!hasS3()) return;
    const key = `object-storage-test/${Date.now()}/file.txt`;
    const body = Buffer.from('real object storage content, not a mock');

    const putResult = await putObject(key, body, 'text/plain');
    expect(putResult.etag).toBeTruthy();

    const getResult = await getObject(key);
    expect(getResult.buffer.toString()).toBe('real object storage content, not a mock');
    expect(getResult.contentType).toBe('text/plain');

    await deleteObject(key);
    await expect(getObject(key)).rejects.toThrow();
  });
});
