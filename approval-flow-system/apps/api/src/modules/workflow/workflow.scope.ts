import { PrismaService } from "../../prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { WorkflowRoleEnum } from "./workflow.constants";

@Injectable()
export class WorkflowScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取某岗位号在权限范围内的医院编码列表。
   */
  async getHospitalScope(role: WorkflowRoleEnum, actorCode: string) {
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
}
