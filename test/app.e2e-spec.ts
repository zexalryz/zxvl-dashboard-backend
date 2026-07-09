import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { ResponseInterceptor } from '../src/common/response.interceptor';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

const TEST_DB = join(__dirname, '..', 'test.db');

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${TEST_DB}`;
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRATION = '1h';

    execSync(`DATABASE_URL="file:${TEST_DB}" npx prisma db push --force-reset --accept-data-loss 2>&1`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
    });
    execSync(`DATABASE_URL="file:${TEST_DB}" npx ts-node prisma/seed.ts 2>&1`, {
      cwd: join(__dirname, '..'),
      stdio: 'pipe',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    if (existsSync(`${TEST_DB}-journal`)) unlinkSync(`${TEST_DB}-journal`);
  });

  const validUser = {
    username: 'alice',
    email: 'alice@test.com',
    password: 'Str0ng!Pass',
    inviteCode: 'INVITE-2024-001',
  };

  // ─── Register ────────────────────────────────────────────

  it('POST /api/auth/register — returns access + refresh tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(validUser)
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.refreshToken).toBeDefined();
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('POST /api/auth/register — rejects duplicate username', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...validUser, email: 'other@test.com', inviteCode: 'INVITE-2024-002' })
      .expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/username already taken/i);
  });

  it('POST /api/auth/register — rejects duplicate email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...validUser, username: 'bob', inviteCode: 'INVITE-2024-003' })
      .expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/email already registered/i);
  });

  it('POST /api/auth/register — rejects invalid invite code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'charlie', email: 'charlie@test.com', password: 'Str0ng!Pass', inviteCode: 'FAKE-CODE' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/invalid invite code/i);
  });

  it('POST /api/auth/register — rejects used invite code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'dave', email: 'dave@test.com', password: 'Str0ng!Pass', inviteCode: 'INVITE-2024-001' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/already used/i);
  });

  it('POST /api/auth/register — validates fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'not-an-email', password: 'weak', inviteCode: '' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('Bad Request');
  });

  // ─── Login ───────────────────────────────────────────────

  it('POST /api/auth/login — authenticates and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: validUser.username, password: validUser.password })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('POST /api/auth/login — rejects wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: validUser.username, password: 'WrongPass1' })
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/invalid credentials/i);
  });

  it('POST /api/auth/login — rejects nonexistent user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'Str0ng!Pass' })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  // ─── Profile ─────────────────────────────────────────────

  let token: string;
  let refreshToken: string;

  it('GET /api/user/profile — returns user profile with role', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: validUser.username, password: validUser.password });
    token = loginRes.body.data.accessToken;
    refreshToken = loginRes.body.data.refreshToken;

    const res = await request(app.getHttpServer())
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(validUser.username);
    expect(res.body.data.email).toBe(validUser.email);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.role).toBe('USER');
  });

  it('GET /api/user/profile — rejects missing token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/user/profile')
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/user/profile — rejects invalid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/user/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  // ─── Refresh Token ───────────────────────────────────────

  it('POST /api/auth/refresh — returns new token pair and revokes old one', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);

    // Save newest tokens
    token = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/refresh — rejects revoked token', async () => {
    // Remember token that will be revoked by the next refresh
    const willBeRevoked = refreshToken;

    // Refresh to trigger rotation (revokes willBeRevoked)
    const goodRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: willBeRevoked })
      .expect(201);
    expect(goodRes.body.success).toBe(true);

    // Now try using the revoked token — should fail
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: willBeRevoked })
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/invalid|revoked/i);

    // Update tokens for next tests
    token = goodRes.body.data.accessToken;
    refreshToken = goodRes.body.data.refreshToken;
  });

  // ─── Logout ──────────────────────────────────────────────

  it('POST /api/auth/logout — revokes refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/logged out/i);

    // Attempt to use the revoked token
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    expect(refreshRes.body.error.message).toMatch(/invalid|revoked/i);
  });

  // ─── Role-Based Access ──────────────────────────────────

  let adminToken: string;

  it('POST /api/auth/login — seeded admin can login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234' })
      .expect(201);
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;
  });

  it('GET /api/user — lists all users for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Should include all seeded users + alice
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    const names = res.body.data.map((u: any) => u.username);
    expect(names).toContain('admin');
    expect(names).toContain('mod');
    expect(names).toContain('donor');
    expect(names).toContain('alice');
  });

  it('PATCH /api/user/:id/role — admin can update user role', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${adminToken}`);
    const alice = listRes.body.data.find((u: any) => u.username === 'alice');
    expect(alice).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/user/${alice.id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'DONATOR' })
      .expect(200);
    expect(res.body.data.role).toBe('DONATOR');
  });

  it('GET /api/user — rejects non-admin (MODERATOR)', async () => {
    const modLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'mod', password: 'Mod1234' })
      .expect(201);
    const modToken = modLogin.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${modToken}`)
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/user/:id/role — rejects non-admin (DONATOR)', async () => {
    const donorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'donor', password: 'Donor1234' })
      .expect(201);
    const donorToken = donorLogin.body.data.accessToken;

    const listRes = await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${adminToken}`);
    const mod = listRes.body.data.find((u: any) => u.username === 'mod');
    expect(mod).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/api/user/${mod.id}/role`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ role: 'USER' })
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  // ─── Invite Code Generation ──────────────────────────────

  it('POST /api/auth/invite-codes — admin generates 1 invite code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    expect(res.body.success).toBe(true);
    const { codes } = res.body.data;
    expect(Array.isArray(codes)).toBe(true);
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatch(/^INVITE-/);
  });

  it('POST /api/auth/invite-codes — admin generates batch (3 codes)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 3 })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.codes).toHaveLength(3);
    res.body.data.codes.forEach((c: string) => expect(c).toMatch(/^INVITE-/));
  });

  it('POST /api/auth/invite-codes — moderator can generate', async () => {
    const modLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'mod', password: 'Mod1234' })
      .expect(201);
    const modToken = modLogin.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${modToken}`)
      .send({})
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.codes).toHaveLength(1);
  });

  it('POST /api/auth/invite-codes — user (DONATOR) receives 403', async () => {
    const donorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'donor', password: 'Donor1234' })
      .expect(201);
    const donorToken = donorLogin.body.data.accessToken;

    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({})
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/invite-codes — rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .send({})
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/invite-codes — generated code can be used to register', async () => {
    const genRes = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1 })
      .expect(201);
    const newCode = genRes.body.data.codes[0];

    const regRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'invite_test_user',
        email: 'invite-test@test.com',
        password: 'Str0ng!Pass',
        inviteCode: newCode,
      })
      .expect(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/invite-codes — rejects count 0', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 0 })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/invite-codes — rejects count > 10', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/invite-codes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 11 })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  // ─── Token Security ─────────────────────────────────────

  it('POST /api/auth/refresh — rejects expired refresh token', async () => {
    const user = await prisma.user.findFirst({ where: { username: 'alice' } });
    expect(user).toBeDefined();

    await prisma.refreshToken.create({
      data: {
        token: 'expired-test-token-for-e2e',
        userId: user!.id,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-test-token-for-e2e' })
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/invalid|expired/i);
  });

  it('GET /api/user/profile — rejects JWT with non-existent user (tampered)', async () => {
    const jwtService = app.get(JwtService);
    const fakeToken = jwtService.sign({ sub: 'nonexistent-user-id', username: 'fake', role: 'ADMIN' });

    const res = await request(app.getHttpServer())
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${fakeToken}`)
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/user not found/i);
  });

  // ─── Error Response Contract ────────────────────────────

  it('error responses include success, error.code, error.message, timestamp', async () => {
    // 401 — missing token
    const r1 = await request(app.getHttpServer()).get('/api/user/profile').expect(401);
    expect(r1.body).toMatchObject({ success: false, error: { code: expect.any(String), message: expect.any(String) } });
    expect(typeof r1.body.timestamp).toBe('string');

    // 400 — validation
    const r2 = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'ab', email: 'x', password: '', inviteCode: '' })
      .expect(400);
    expect(r2.body).toMatchObject({ success: false, error: { code: expect.any(String), message: expect.any(String) } });
    expect(typeof r2.body.timestamp).toBe('string');

    // 403 — forbidden (DONATOR trying admin endpoint)
    const donorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'donor', password: 'Donor1234' })
      .expect(201);
    const r3 = await request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${donorLogin.body.data.accessToken}`)
      .expect(403);
    expect(r3.body).toMatchObject({ success: false, error: { code: expect.any(String), message: expect.any(String) } });
    expect(typeof r3.body.timestamp).toBe('string');
  });
});
