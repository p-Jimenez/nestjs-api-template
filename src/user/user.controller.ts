import { Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';

import { GetUser } from './../auth/decorator/get-user.decorator';
import { JwtGuard } from './../auth/guard/jwt.guard';

@Controller('users')
export class UserController {

    @Get('me')
    @UseGuards(JwtGuard)
    getAuthUser(@GetUser() user: User) {
        
        return user;
    }
        
}
