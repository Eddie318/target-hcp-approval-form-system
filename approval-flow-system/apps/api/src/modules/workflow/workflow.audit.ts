import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WorkflowAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(operation: string, payload: Record<string, any>) {
    try {
      await this.prisma.operationLog.create({
        data: {
          operation,
          workflowId: payload.workflowId ?? null,
          actorCode: payload.actorCode ?? null,
          detail: payload.data ?? {},
        },
      });
    } catch (e) {
      // 容错，不阻断主流程
      console.error("Audit log failed:", e);
    }
  }
}
