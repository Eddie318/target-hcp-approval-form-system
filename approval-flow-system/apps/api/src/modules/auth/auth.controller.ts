import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 模拟登录：根据 email 查询 UserMapping/ApproverConfig，返回 actorCode/actorRole
   */
  @Get("mock-login")
  async mockLogin(@Query("email") email?: string) {
    if (!email) {
      return {
        email: null,
        actorCode: null,
        actorRole: null,
        source: "no-email",
      };
    }
    const mapping = await this.prisma.userMapping.findFirst({
      where: { email, enabled: true },
    });
    if (mapping) {
      const hierarchy = await this.prisma.userHierarchy.findFirst({
        where: { actorCode: mapping.actorCode },
      });
      const dsm =
        hierarchy?.dsmCode &&
        (await this.prisma.userMapping.findFirst({
          where: { actorCode: hierarchy.dsmCode },
        }));
      const rsm =
        hierarchy?.rsmCode &&
        (await this.prisma.userMapping.findFirst({
          where: { actorCode: hierarchy.rsmCode },
        }));
      return {
        email,
        actorCode: mapping.actorCode,
        actorRole: mapping.actorRole,
        name: mapping.name,
        hierarchy: {
          dsmCode: hierarchy?.dsmCode ?? null,
          dsmName: typeof dsm === "object" ? dsm?.name ?? null : null,
          rsmCode: hierarchy?.rsmCode ?? null,
          rsmName: typeof rsm === "object" ? rsm?.name ?? null : null,
        },
        source: "userMapping",
        cacheControl: "no-store",
      };
    }
    const approver = await this.prisma.approverConfig.findFirst({
      where: { email, enabled: true },
    });
    if (approver) {
      return {
        email,
        actorCode: approver.actorCode ?? approver.email,
        actorRole: approver.role,
        name: approver.name,
        source: "approverConfig",
        cacheControl: "no-store",
      };
    }
    return {
      email,
      actorCode: null,
      actorRole: null,
      source: "not-found",
      cacheControl: "no-store",
    };
  }
}
