import { Prisma, WorkflowStatus } from "@prisma/client";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import {
  WorkflowActionEnum,
  WorkflowRole,
  WorkflowStatusEnum,
  WorkflowType,
} from "./workflow.constants";
import { ActionWorkflowDto } from "./dto/action-workflow.dto";
import { canTransition } from "./workflow.state";
import { allowedActions } from "./workflow.permission";
import { PrismaService } from "../../prisma/prisma.service";
import { getDefaultSteps } from "./workflow.steps";
import { WorkflowTypeEnum } from "./workflow.constants";
import { validatePayload } from "./workflow.validation";
import { WorkflowScopeService } from "./workflow.scope";

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: WorkflowScopeService,
  ) {}

  create(dto: CreateWorkflowDto) {
    validatePayload(dto.type as WorkflowTypeEnum, dto.payload);
    const steps = getDefaultSteps(dto.type as WorkflowTypeEnum, dto.payload);
    return this.prisma.workflow.create({
      data: {
        type: dto.type,
        status: WorkflowStatusEnum.DRAFT,
        title: dto.title ?? "",
        payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
        submittedBy: dto.submittedBy,
        steps: {
          create: steps.map((s) => ({
            sequence: s.sequence,
            role: s.role as any as WorkflowRole,
            status: WorkflowStatusEnum.PENDING,
          })),
        },
      },
      include: { steps: true },
    });
  }

  findOne(id: string) {
    return this.prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sequence: "asc" } },
        actions: true,
        files: true,
      },
    });
  }

  act(
    id: string,
    dto: ActionWorkflowDto & { type?: WorkflowType; role?: WorkflowRole },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.workflow.findUnique({
        where: { id },
        include: { steps: { orderBy: { sequence: "asc" } } },
      });
      if (!current) {
        throw new NotFoundException(`Workflow ${id} not found`);
      }

      if (dto.role && !dto.actorCode) {
        throw new BadRequestException("actorCode 不能为空");
      }

      if (!canTransition(current.status as WorkflowStatus, dto.action)) {
        throw new BadRequestException(
          `Action ${dto.action} not allowed from status ${current.status}`,
        );
      }

      const wfType = current.type;
      if (dto.role) {
        const allowed = allowedActions(
          wfType as WorkflowType,
          dto.role as WorkflowRole,
        );
        if (!allowed.includes(dto.action)) {
          throw new BadRequestException(
            `Role ${dto.role} cannot perform ${dto.action} on ${wfType}`,
          );
        }
      }

      // 当前步骤校验：审批动作必须匹配当前步骤角色
      const steps = current.steps ?? [];
      const currentStep =
        steps.find(
          (s) =>
            s.status === WorkflowStatusEnum.IN_PROGRESS ||
            s.status === WorkflowStatusEnum.PENDING,
        ) || null;
      if (
        [
          WorkflowActionEnum.APPROVE,
          WorkflowActionEnum.REJECT,
          WorkflowActionEnum.RETURN,
        ].includes(dto.action)
      ) {
        if (!currentStep) {
          throw new BadRequestException("没有可审批的步骤");
        }
        if (dto.role && dto.role !== currentStep.role) {
          throw new BadRequestException(
            `当前步骤角色为 ${currentStep.role}，不可使用 ${dto.role} 审批`,
          );
        }
      }

      // 取消目标医院：校验目标医院在审批人权限范围内
      if (
        current.type === WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL &&
        dto.actorCode &&
        dto.role
      ) {
        const scope = await this.scopeService.getHospitalScope(
          dto.role as WorkflowRole,
          dto.actorCode,
        );
        const distributions = current.payload?.["distributions"] as
          | { targetHospitalCode: string; percent: number }[]
          | undefined;
        if (distributions && scope.length) {
          const outOfScope = distributions.filter(
            (d) => !scope.includes(d.targetHospitalCode),
          );
          if (outOfScope.length) {
            throw new BadRequestException(
              `分配医院不在权限范围：${outOfScope
                .map((d) => d.targetHospitalCode)
                .join(", ")}`,
            );
          }
        }
      }

      // 针对 C&D 步骤的凭证校验（占位）：若当前步骤为 C&D 且执行 APPROVE，需有附件
      if (
        currentStep &&
        currentStep.role === "CD" &&
        dto.action === WorkflowActionEnum.APPROVE
      ) {
        const attachCount = await tx.attachment.count({
          where: { workflowId: id },
        });
        if (attachCount === 0) {
          throw new BadRequestException(
            "C&D 审批需上传凭证（当前未检测到附件）",
          );
        }
      }

      let nextStatus: WorkflowStatus = WorkflowStatusEnum.IN_PROGRESS;
      const nextStep = currentStep
        ? steps.find((s) => s.sequence === currentStep.sequence + 1) || null
        : null;

      switch (dto.action) {
        case WorkflowActionEnum.APPROVE: {
          if (currentStep) {
            await tx.workflowStep.update({
              where: { id: currentStep.id },
              data: { status: WorkflowStatusEnum.APPROVED },
            });
          }
          if (nextStep) {
            await tx.workflowStep.update({
              where: { id: nextStep.id },
              data: { status: WorkflowStatusEnum.IN_PROGRESS },
            });
            nextStatus = WorkflowStatusEnum.IN_PROGRESS;
          } else {
            nextStatus = WorkflowStatusEnum.APPROVED;
          }
          break;
        }
        case WorkflowActionEnum.REJECT: {
          if (currentStep) {
            await tx.workflowStep.update({
              where: { id: currentStep.id },
              data: { status: WorkflowStatusEnum.REJECTED },
            });
          }
          nextStatus = WorkflowStatusEnum.REJECTED;
          break;
        }
        case WorkflowActionEnum.RETURN: {
          if (currentStep) {
            await tx.workflowStep.update({
              where: { id: currentStep.id },
              data: { status: WorkflowStatusEnum.PENDING },
            });
          }
          nextStatus = WorkflowStatusEnum.PENDING;
          break;
        }
        case WorkflowActionEnum.WITHDRAW: {
          if (steps.length) {
            await tx.workflowStep.updateMany({
              where: { workflowId: id },
              data: { status: WorkflowStatusEnum.PENDING },
            });
          }
          nextStatus = WorkflowStatusEnum.WITHDRAWN;
          break;
        }
        case WorkflowActionEnum.SUBMIT: {
          const first = steps[0];
          if (first) {
            await tx.workflowStep.update({
              where: { id: first.id },
              data: { status: WorkflowStatusEnum.IN_PROGRESS },
            });
          }
          nextStatus = WorkflowStatusEnum.PENDING;
          break;
        }
        default: {
          nextStatus = WorkflowStatusEnum.IN_PROGRESS;
          break;
        }
      }

      const updated = await tx.workflow.update({
        where: { id },
        data: { status: nextStatus },
      });

      await tx.workflowAction.create({
        data: {
          workflowId: id,
          action: dto.action,
          actorCode: dto.actorCode,
          comment: dto.comment ?? "",
          payload: {},
        },
      });

      return updated;
    });
  }
}
