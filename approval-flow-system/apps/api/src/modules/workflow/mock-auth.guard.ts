import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // 将 header 中的 actor 信息注入 req.user，便于统一读取
    req.user = {
      actorCode: req.headers["x-actor-code"] || null,
      actorRole: req.headers["x-actor-role"] || null,
    };
    return true;
  }
}
