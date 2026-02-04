import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('owner', 'admin', 'manager')
  async list(@Req() req: any, @Query() query: UserQueryDto) {
    return this.users.listUsers(req.user.tenantId, query.search);
  }

  @Post()
  @Roles('owner', 'admin')
  async create(@Req() req: any, @Body() dto: CreateUserDto) {
    return this.users.createUser(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateUser(req.user.tenantId, req.user.sub, id, dto);
  }
}
