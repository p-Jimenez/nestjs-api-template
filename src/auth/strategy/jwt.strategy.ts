import { PrismaService } from './../../prisma/prisma.service';
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { validate } from "class-validator";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get("JWT_SECRET"),
        });
    }

    // check if token expired
    async validate(payload: {
        sub: number,
        email: string,
    }) {

        const user = await this.prisma.user.findUnique({
            where: {
                id: payload.sub,
            },
        });

        delete user.password;

        return user;
    }
}