import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WorkflowAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(operation: string, payload: Record<string, any>) {
    try {
      await this.prisma.workflowAction.create({
        data: {
          workflowId: payload.workflowId ?? "AUDIT",
          action: "APPROVE" as any, // 占位，避免额外表；若后续单独表，再迁移
          actorCode: payload.actorCode ?? null,
          comment: `[AUDIT:${operation}] ${payload.comment ?? ""}`,
          payload: payload.data ?? {},
        },
      });
    } catch (e) {
      // 容错，不阻断主流程
      console.error("Audit log failed:", e);
    }
  }
}
