import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { WorkflowRole, WorkflowRoleEnum } from "./workflow.constants";

@Injectable()
export class WorkflowScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取某岗位号在权限范围内的医院编码列表。
   */
  async getHospitalScope(role: WorkflowRole, actorCode: string) {
    if (!actorCode) return [];
    let condition: Record<string, any> = {};
    switch (role) {
      case WorkflowRoleEnum.MR:
        condition = { mrCode: actorCode };
        break;
      case WorkflowRoleEnum.DSM:
        condition = { dsmCode: actorCode };
        break;
      case WorkflowRoleEnum.RSM:
        condition = { rsmCode: actorCode };
        break;
      default:
        return [];
    }
    const rows = await this.prisma.hospitalAssignment.findMany({
      where: condition,
      select: { hospitalCode: true },
    });
    return rows.map((r) => r.hospitalCode);
  }

  /**
   * 根据岗位号（不传角色）获取其覆盖的医院编码合集（MR/DSM/RSM 均支持）
   */
  async getHospitalScopeByActor(actorCode: string) {
    if (!actorCode) return [];
    const rows = await this.prisma.hospitalAssignment.findMany({
      where: {
        OR: [
          { mrCode: actorCode },
          { dsmCode: actorCode },
          { rsmCode: actorCode },
        ],
      },
      select: { hospitalCode: true },
    });
    return Array.from(new Set(rows.map((r) => r.hospitalCode)));
  }

  /**
   * 简单的医院权限校验（存在权限列表且包含目标医院）。
   */
  async ensureHospitalInScope(actorCode: string, hospitalCode?: string) {
    if (!hospitalCode || !actorCode) return;
    const scope = await this.getHospitalScopeByActor(actorCode);
    if (scope.length && !scope.includes(String(hospitalCode))) {
      throw new Error(`医院 ${hospitalCode} 不在权限范围`);
    }
  }
}
