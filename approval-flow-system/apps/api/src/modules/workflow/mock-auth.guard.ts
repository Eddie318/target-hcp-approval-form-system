import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // 优先从 header，其次从 query/body 中的 email，尝试映射到 actorCode/actorRole
    const actorCode = req.headers["x-actor-code"] || null;
    const actorRole = req.headers["x-actor-role"] || null;
    req.user = {
      actorCode,
      actorRole,
      email: req.headers["x-user-email"] || null,
    };
    return true;
  }
}
