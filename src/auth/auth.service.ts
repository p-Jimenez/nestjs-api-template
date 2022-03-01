import { ConfigService } from '@nestjs/config';
import * as argon from 'argon2';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { User, TokenBlacklist } from '@prisma/client'

import { AuthDto, TokenDto } from './dto';
import { PrismaService } from './../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable({})
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService
    ) { }

    async login(auth: AuthDto): Promise<TokenDto> {
        // find user by email
        const user: User = await this.prisma.user.findUnique({
            where: {
                email: auth.email
            }
        });

        if (!user) {
            throw new ForbiddenException("Email or password is incorrect");
        }

        // check password
        const valid = await argon.verify(user.password, auth.password);

        if (!valid) {
            throw new ForbiddenException("Email or password is incorrect");
        }

        return {
            token: await this.signToken(user.id, user.email),
            refreshToken: await this.signRefreshToken(user.id, user.email),
        };
    }

    async logout(refresh: string) {
        const payload = await this.jwt.verifyAsync(refresh, {
            secret: this.config.get('JWT_SECRET'),
        });

        if (!payload) {
            throw new ForbiddenException("No refresh token");
        }

        try {
            const blacklisted: TokenBlacklist = await this.prisma.tokenBlacklist.create({
                data: {
                    token: refresh,
                    expiresAt: new Date(payload.exp * 1000)
                },
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                    throw new ForbiddenException("Refresh token already blacklisted");
                }
            }
            throw e;
        }
    }

    async signup(auth: AuthDto) {
        const hash = await argon.hash(auth.password);

        try {
            const user: User = await this.prisma.user.create({
                data: {
                    email: auth.email,
                    password: hash,
                },
            });

            return await this.login(auth);
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                    throw new ForbiddenException("Email already exists");
                }
            }
            throw e;
        }
    }

    async refresh(refresh: string): Promise<TokenDto> {

        // check if refresh token is blacklisted
        const blacklisted: TokenBlacklist = await this.prisma.tokenBlacklist.findUnique({
            where: {
                token: refresh
            }
        });

        if (blacklisted) {
            throw new ForbiddenException("Refresh token expired");
        }

        // get user id from refresh token
        const payload = await this.jwt.verifyAsync(refresh, {
            secret: this.config.get('JWT_SECRET'),
        });

        if (!payload) {
            throw new ForbiddenException("No refresh token");
        }

        // invalidate refresh token
        try {
            const blacklistedToken: TokenBlacklist = await this.prisma.tokenBlacklist.create({
                data: {
                    token: refresh,
                    expiresAt: new Date(payload.exp * 1000)
                },
            });
        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError) {
                if (e.code === "P2002") {
                    throw new ForbiddenException("Refresh token already blacklisted");
                }
            }
            throw e;
        }
            
        // get user by id
        const user: User = await this.prisma.user.findUnique({
            where: {
                id: payload.sub
            }
        });

        if (!user) {
            throw new ForbiddenException("No user found");
        }

        return {
            token: await this.signToken(user.id, user.email),
            refreshToken: await this.signRefreshToken(user.id, user.email),
        };
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async removeExpiredTokens() {

        await this.prisma.tokenBlacklist.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }

    private async signToken(userId: number, email: string): Promise<string> {
        const payload = {
            sub: userId,
            email
        };

        const token = await this.jwt.signAsync(payload, {
            expiresIn: this.config.get('ACCESS_TOKEN_VALIDITY'),
            secret: this.config.get('JWT_SECRET'),
        });
        return token;
    }

    private async signRefreshToken(userId: number, email: string): Promise<string> {
        const payload = {
            sub: userId,
            email
        };

        const token = await this.jwt.signAsync(payload, {
            expiresIn: this.config.get('REFRESH_TOKEN_VALIDITY'),
            secret: this.config.get('JWT_SECRET'),
        });

        return token;
    }

}
