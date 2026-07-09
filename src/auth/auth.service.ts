import { randomBytes } from 'crypto';
import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const { username, email, password, inviteCode } = dto;

    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: inviteCode },
    });
    if (!invite) throw new BadRequestException('Invalid invite code');
    if (invite.used) throw new BadRequestException('Invite code already used');

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      if (existing.username === username) throw new ConflictException('Username already taken');
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { username, email, password: hashed },
    });

    await this.prisma.inviteCode.update({
      where: { code: inviteCode },
      data: { used: true, usedBy: user.id, usedAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const { username, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refresh(dto: RefreshDto) {
    return this.tokens.rotateRefreshToken(dto.refreshToken);
  }

  async logout(dto: RefreshDto) {
    await this.tokens.revokeRefreshToken(dto.refreshToken);
    return { message: 'Logged out' };
  }

  async generateInviteCodes(count: number = 1): Promise<{ codes: string[] }> {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = `INVITE-${randomBytes(8).toString('hex').toUpperCase()}`;
      await this.prisma.inviteCode.create({ data: { code } });
      codes.push(code);
    }
    return { codes };
  }

  private async generateTokens(user: { id: string; username: string; role: string }) {
    const accessToken = this.tokens.generateAccessToken(user);
    const refreshToken = await this.tokens.generateRefreshToken(user.id);
    return { accessToken, refreshToken };
  }
}
