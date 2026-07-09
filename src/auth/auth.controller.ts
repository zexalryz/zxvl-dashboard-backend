import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../common/constants/role';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';
import { Public } from './public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register',
    description: 'Create a new user account. Requires a valid single-use invite code. Returns an access token (JWT) and a refresh token (UUID). The refresh token can be exchanged for a new pair via `/auth/refresh`.',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate with username and password. Returns a new access token (JWT) and refresh token. The refresh token can be used later at `/auth/refresh`.',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh tokens',
    description: 'Exchange a valid refresh token for a new access token + refresh token pair. **The old refresh token is revoked** (rotation). Returns 401 if the token is expired, already revoked, or not found.',
  })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Public()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout',
    description: 'Revoke the provided refresh token immediately. Subsequent attempts to use this token at `/auth/refresh` will return 401.',
  })
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto);
  }

  @Post('invite-codes')
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({
    summary: 'Generate invite codes',
    description: '🔒 **Admin or Moderator only.** Generate one or more single-use invite codes for user registration. Provide an optional `count` (1–10, default 1) to batch-create codes. The generated codes can be used at `/auth/register`.',
  })
  generateInviteCodes(@Body() dto: GenerateInviteDto) {
    return this.auth.generateInviteCodes(dto.count ?? 1);
  }
}
