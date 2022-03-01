
import { Body, Controller, Headers, HttpCode, HttpStatus, Post, ForbiddenException, Get } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthDto, TokenDto } from './dto';

@Controller('auth')
export class AuthController {
    constructor(private authservice: AuthService) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    login(@Body() auth: AuthDto): Promise<TokenDto> {

        return this.authservice.login(auth);
    }

    @Get('logout')
    logout(@Headers('refresh') refresh: string) {

        if (!refresh) {
            throw new ForbiddenException("No refresh token");
        }

        return this.authservice.logout(refresh);
    }

    @Post('signup')
    signup(@Body() auth: AuthDto): Promise<TokenDto> {

        return this.authservice.signup(auth);
    }

    @Post('refresh')
    refresh(@Headers('refresh') refresh: string): Promise<TokenDto> {

        if (!refresh) {
            throw new ForbiddenException("No refresh token");
        }


        return this.authservice.refresh(refresh);
    }

}
