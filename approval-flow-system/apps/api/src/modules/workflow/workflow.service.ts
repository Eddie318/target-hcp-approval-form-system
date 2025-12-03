import { Prisma, WorkflowStatus } from "@prisma/client";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import {
  WorkflowAction,
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
import { ListWorkflowQueryDto } from "./dto/list-workflow.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { WorkflowAuditService } from "./workflow.audit";

function extractHospitalCode(payload: any): string | undefined {
  if (!payload) return undefined;
  return (
    (payload as any).hospitalCode ||
    (payload as any).hospital_code ||
    (payload as any).hospital_code ||
    undefined
  );
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: WorkflowScopeService,
    private readonly audit: WorkflowAuditService,
  ) {}

  async create(dto: CreateWorkflowDto) {
    validatePayload(dto.type as any, dto.payload);
    const steps = getDefaultSteps(dto.type as any, dto.payload);
    const payloadHospital = extractHospitalCode(dto.payload);
    if (dto.submittedBy && payloadHospital) {
      await this.scopeService
        .ensureHospitalInScope(dto.submittedBy, payloadHospital)
        .catch(() => {
          throw new BadRequestException("提交人无权操作该医院");
        });
    }
    // 取消目标医院：提交人需具备分配医院的权限
    if (
      dto.type === WorkflowTypeEnum.CANCEL_TARGET_HOSPITAL &&
      dto.submittedBy
    ) {
      const scope = await this.scopeService.getHospitalScopeByActor(
        dto.submittedBy,
      );
      const distributions = dto.payload?.["distributions"] as
        | { targetHospitalCode: string }[]
        | undefined;
      if (!scope.length) {
        throw new BadRequestException("提交人无权分配任何医院");
      }
      if (distributions?.length) {
        const outOfScope = distributions.filter(
          (d) => !scope.includes(d.targetHospitalCode),
        );
        if (outOfScope.length) {
          throw new BadRequestException(
            `提交人无权分配医院：${outOfScope
              .map((d) => d.targetHospitalCode)
              .join(", ")}`,
          );
        }
      }
    }
    return this.prisma.workflow
      .create({
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
      })
      .then(async (wf) => {
        await this.audit.log("CREATE_WORKFLOW", {
          workflowId: wf.id,
          actorCode: dto.submittedBy ?? null,
          data: dto,
        });
        return wf;
      });
  }

  findOne(id: string, actorCode?: string) {
    return this.prisma.workflow
      .findFirstOrThrow({
        where: { id },
        include: {
          steps: { orderBy: { sequence: "asc" } },
          actions: { orderBy: { createdAt: "asc" } },
          files: true,
        },
      })
      .then((wf) => {
        if (actorCode) {
          if (
            wf.status === WorkflowStatusEnum.DRAFT &&
            wf.submittedBy &&
            wf.submittedBy !== actorCode
          ) {
            throw new BadRequestException("草稿仅发起人可见");
          }
          const currentStep =
            wf.steps.find((s) => s.status === WorkflowStatusEnum.IN_PROGRESS) ||
            wf.steps.find((s) => s.status === WorkflowStatusEnum.PENDING) ||
            null;
          const allowed =
            wf.submittedBy === actorCode ||
            (currentStep?.assignee && currentStep.assignee === actorCode);
          if (!allowed && wf.status !== WorkflowStatusEnum.DRAFT) {
            throw new BadRequestException("无权限查看该流程");
          }
        }
        return wf;
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
        const allowed = allowedActions(wfType as WorkflowType, dto.role);
        if (!allowed.includes(dto.action)) {
          throw new BadRequestException(
            `Role ${dto.role} cannot perform ${dto.action} on ${wfType}`,
          );
        }
      }

      // 只有发起人可提交/撤回
      if (
        (dto.action === WorkflowActionEnum.SUBMIT ||
          dto.action === WorkflowActionEnum.WITHDRAW) &&
        current.submittedBy &&
        dto.actorCode &&
        current.submittedBy !== dto.actorCode
      ) {
        throw new BadRequestException("仅发起人可提交/撤回该流程");
      }

      // 提交时设置首节点 assignee（MR->DSM，DSM->RSM，RSM->BISO1 不指定）
      if (dto.action === WorkflowActionEnum.SUBMIT) {
        const firstStep = current.steps[0];
        if (firstStep) {
          let assignee: string | null = null;
          if (dto.role === WorkflowRoleEnum.MR) {
            assignee = await this.scopeService.getDirectManager(
              WorkflowRoleEnum.MR,
              dto.actorCode || "",
            );
          } else if (dto.role === WorkflowRoleEnum.DSM) {
            assignee = await this.scopeService.getDirectManager(
              WorkflowRoleEnum.DSM,
              dto.actorCode || "",
            );
          } else if (dto.role === WorkflowRoleEnum.RSM) {
            assignee = null;
          }
          if (assignee) {
            await tx.workflowStep.update({
              where: { id: firstStep.id },
              data: { assignee },
            });
          }
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
      const approvalActions: WorkflowAction[] = [
        WorkflowActionEnum.APPROVE,
        WorkflowActionEnum.REJECT,
        WorkflowActionEnum.RETURN,
      ];
      if (approvalActions.includes(dto.action)) {
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

      await this.audit.log("APPLY_ACTION", {
        workflowId: id,
        actorCode: dto.actorCode ?? null,
        data: { action: dto.action, role: dto.role },
      });

      return updated;
    });
  }

  list(query: ListWorkflowQueryDto) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.actorCode) {
      where.OR = [
        { submittedBy: query.actorCode },
        {
          AND: [
            { status: { not: WorkflowStatusEnum.DRAFT } },
            {
              steps: {
                some: {
                  status: {
                    in: [
                      WorkflowStatusEnum.IN_PROGRESS,
                      WorkflowStatusEnum.PENDING,
                    ],
                  },
                  assignee: query.actorCode,
                },
              },
            },
          ],
        },
      ];
    }
    return this.prisma.workflow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { sequence: "asc" } },
      },
    });
  }

  exportAll(params?: {
    actorCode?: string;
    role?: WorkflowRole;
    filters?: {
      type?: WorkflowType;
      status?: WorkflowStatus;
      createdFrom?: string;
      createdTo?: string;
    };
  }) {
    // 权限已在 controller 判定；此处返回全量字段，后续可加筛选/脱敏
    const where: any = {};
    if (params?.filters?.type) where.type = params.filters.type;
    if (params?.filters?.status) where.status = params.filters.status;
    if (params?.filters?.createdFrom || params?.filters?.createdTo) {
      where.createdAt = {};
      if (params.filters.createdFrom) {
        where.createdAt.gte = new Date(params.filters.createdFrom);
      }
      if (params.filters.createdTo) {
        where.createdAt.lte = new Date(params.filters.createdTo);
      }
    }
    return this.prisma.workflow
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          steps: { orderBy: { sequence: "asc" } },
          actions: { orderBy: { createdAt: "asc" } },
          files: true,
        },
      })
      .then(async (rows) => {
        await this.audit.log("EXPORT_WORKFLOW", {
          workflowId: "EXPORT",
          actorCode: params?.actorCode ?? null,
          data: { role: params?.role ?? null, count: rows.length },
        });
        return rows;
      });
  }

  addAttachment(id: string, dto: CreateAttachmentDto) {
    return this.prisma.attachment.create({
      data: {
        workflowId: id,
        stepId: dto.stepId,
        filename: dto.filename,
        url: dto.url,
        mimeType: dto.mimeType,
      },
    });
  }
}
