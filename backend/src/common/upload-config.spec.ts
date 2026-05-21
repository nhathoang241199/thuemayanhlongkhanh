import {
  getPublicApiUrl,
  parseVerificationUploadPath,
  verificationUploadPublicUrl,
} from './upload-config';

describe('upload-config', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('getPublicApiUrl prefers PUBLIC_API_URL', () => {
    process.env.PUBLIC_API_URL = 'https://thuemayanhlongkhanh.com';
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'production';
    expect(getPublicApiUrl()).toBe('https://thuemayanhlongkhanh.com');
  });

  it('getPublicApiUrl falls back to FRONTEND_URL in production', () => {
    delete process.env.PUBLIC_API_URL;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://thuemayanhlongkhanh.com';
    expect(getPublicApiUrl()).toBe('https://thuemayanhlongkhanh.com');
  });

  it('getPublicApiUrl uses localhost in development', () => {
    delete process.env.PUBLIC_API_URL;
    delete process.env.FRONTEND_URL;
    process.env.NODE_ENV = 'development';
    process.env.PORT = '3000';
    expect(getPublicApiUrl()).toBe('http://localhost:3000');
  });

  it('parseVerificationUploadPath accepts localhost host', () => {
    const parsed = parseVerificationUploadPath(
      'http://localhost:3000/api/uploads/verification/cust-1/abc.jpg',
    );
    expect(parsed).toEqual({ customerId: 'cust-1', filename: 'abc.jpg' });
  });

  it('verificationUploadPublicUrl uses configured base', () => {
    process.env.PUBLIC_API_URL = 'https://thuemayanhlongkhanh.com';
    expect(verificationUploadPublicUrl('cust-1', 'x.jpg')).toBe(
      'https://thuemayanhlongkhanh.com/api/uploads/verification/cust-1/x.jpg',
    );
  });
});
