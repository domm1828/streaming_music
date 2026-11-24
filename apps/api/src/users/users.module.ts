import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Role, RoleSchema } from './schemas/role.schema';
import { User, UserSchema } from './schemas/user.schema';
import { RolesService } from './roles.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  providers: [UsersService, RolesService],
  controllers: [UsersController],
  exports: [UsersService, RolesService],
})
export class UsersModule {}
