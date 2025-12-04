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
  WorkflowRoleEnum,
  WorkflowStatusEnum,
  WorkflowType,
  WorkflowTypeEnum,
} from "./workflow.constants";
import { ActionWorkflowDto } from "./dto/action-workflow.dto";
import { canTransition } from "./workflow.state";
import { allowedActions } from "./workflow.permission";
import { PrismaService } from "../../prisma/prisma.service";
import { getDefaultSteps } from "./workflow.steps";
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
    // 配置型节点（BISO1/BISO2/RSD/CD）提前读取岗位号作为 assignee，若缺失则尝试用邮箱反查 UserMapping
    const configRoles: WorkflowRole[] = [
      WorkflowRoleEnum.BISO1,
      WorkflowRoleEnum.BISO2,
      WorkflowRoleEnum.RSD,
      WorkflowRoleEnum.CD,
    ] as WorkflowRole[];
    const approverConfigs = await this.prisma.approverConfig.findMany({
      where: {
        workflowType: dto.type as WorkflowType,
        role: { in: configRoles },
        enabled: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const approverMap: Record<string, string | undefined> = {};
    for (const c of approverConfigs) {
      if (approverMap[c.role]) continue;
      if (c.actorCode) {
        approverMap[c.role] = c.actorCode;
      } else if (c.email) {
        const mapping = await this.prisma.userMapping.findFirst({
          where: { email: c.email, actorRole: c.role as WorkflowRole },
        });
        if (mapping?.actorCode) {
          approverMap[c.role] = mapping.actorCode;
        }
      }
    }
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
              status: WorkflowStatusEnum.DRAFT,
              assignee: approverMap[s.role as string] || null,
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
      const getAssigneeForRole = async (
        workflowType: WorkflowType,
        role: WorkflowRole,
      ): Promise<string | null> => {
        if (
          role !== WorkflowRoleEnum.BISO1 &&
          role !== WorkflowRoleEnum.BISO2 &&
          role !== WorkflowRoleEnum.RSD &&
          role !== WorkflowRoleEnum.CD
        ) {
          return null;
        }
        const cfg = await tx.approverConfig.findFirst({
          where: { workflowType, role, enabled: true },
          orderBy: { createdAt: "desc" },
        });
        if (cfg?.actorCode) return cfg.actorCode;
        if (cfg?.email) {
          const mapping = await tx.userMapping.findFirst({
            where: { email: cfg.email, actorRole: role },
          });
          if (mapping?.actorCode) return mapping.actorCode;
        }
        return null;
      };

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
        steps.find((s) => s.status === WorkflowStatusEnum.IN_PROGRESS) || null;
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
            if (!nextStep.assignee) {
              const nextAssignee = await getAssigneeForRole(
                current.type,
                nextStep.role as WorkflowRole,
              );
              if (nextAssignee) {
                await tx.workflowStep.update({
                  where: { id: nextStep.id },
                  data: { assignee: nextAssignee },
                });
              }
            }
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
          // 退回直接打回到草稿：重置步骤，交回发起人
          if (steps.length) {
            await tx.workflowStep.updateMany({
              where: { workflowId: id },
              data: { status: WorkflowStatusEnum.DRAFT, assignee: null },
            });
          }
          nextStatus = WorkflowStatusEnum.DRAFT;
          break;
        }
        case WorkflowActionEnum.WITHDRAW: {
          if (steps.length) {
            await tx.workflowStep.updateMany({
              where: { workflowId: id },
              data: { status: WorkflowStatusEnum.DRAFT },
            });
          }
          // 撤回后回到草稿态，仅发起人可见，可再次提交或删除
          nextStatus = WorkflowStatusEnum.DRAFT;
          break;
        }
        case WorkflowActionEnum.SUBMIT: {
          if (current.type === WorkflowTypeEnum.NEW_TARGET_HOSPITAL) {
            const attachCount = await tx.attachment.count({
              where: { workflowId: id },
            });
            if (attachCount === 0) {
              throw new BadRequestException("提交前需上传凭证附件");
            }
          }
          const first = steps[0];
          if (first) {
            // 提交流程即视为提交人本节点已同意：若提交流程人即首节点角色，则直接跳到下一个节点
            const sameRoleAsFirst =
              dto.role && first.role && first.role === dto.role;
            if (sameRoleAsFirst) {
              await tx.workflowStep.update({
                where: { id: first.id },
                data: { status: WorkflowStatusEnum.APPROVED },
              });
              const nextOfFirst =
                steps.find((s) => s.sequence === first.sequence + 1) || null;
              if (nextOfFirst) {
                // 若下一节点是 RSM，补齐 assignee（基于提交人/首节点角色的直属上级）
                if (nextOfFirst.role === WorkflowRoleEnum.RSM) {
                  const managerSource = dto.actorCode || first.assignee || "";
                  if (managerSource) {
                    const rsm = await this.scopeService.getDirectManager(
                      WorkflowRoleEnum.DSM,
                      managerSource,
                    );
                    if (rsm) {
                      await tx.workflowStep.update({
                        where: { id: nextOfFirst.id },
                        data: { assignee: rsm },
                      });
                    }
                  }
                }
                if (
                  nextOfFirst.role === WorkflowRoleEnum.BISO1 ||
                  nextOfFirst.role === WorkflowRoleEnum.BISO2 ||
                  nextOfFirst.role === WorkflowRoleEnum.RSD ||
                  nextOfFirst.role === WorkflowRoleEnum.CD
                ) {
                  const cfgAssignee = await getAssigneeForRole(
                    current.type,
                    nextOfFirst.role as WorkflowRole,
                  );
                  if (cfgAssignee) {
                    await tx.workflowStep.update({
                      where: { id: nextOfFirst.id },
                      data: { assignee: cfgAssignee },
                    });
                  }
                }
                await tx.workflowStep.update({
                  where: { id: nextOfFirst.id },
                  data: { status: WorkflowStatusEnum.IN_PROGRESS },
                });
                nextStatus = WorkflowStatusEnum.IN_PROGRESS;
              } else {
                nextStatus = WorkflowStatusEnum.APPROVED;
              }
            } else {
              await tx.workflowStep.update({
                where: { id: first.id },
                data: { status: WorkflowStatusEnum.IN_PROGRESS },
              });
              if (
                first.role === WorkflowRoleEnum.BISO1 ||
                first.role === WorkflowRoleEnum.BISO2 ||
                first.role === WorkflowRoleEnum.RSD ||
                first.role === WorkflowRoleEnum.CD
              ) {
                const cfgAssignee = await getAssigneeForRole(
                  current.type,
                  first.role as WorkflowRole,
                );
                if (cfgAssignee) {
                  await tx.workflowStep.update({
                    where: { id: first.id },
                    data: { assignee: cfgAssignee },
                  });
                }
              }
              nextStatus = WorkflowStatusEnum.IN_PROGRESS;
            }
          } else {
            nextStatus = WorkflowStatusEnum.IN_PROGRESS;
          }
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
                  status: WorkflowStatusEnum.IN_PROGRESS,
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

  async remove(id: string, actorCode?: string) {
    const wf = await this.prisma.workflow.findUnique({
      where: { id },
      select: { submittedBy: true, status: true },
    });
    if (!wf) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }
    if (!actorCode || wf.submittedBy !== actorCode) {
      throw new BadRequestException("仅发起人可删除草稿/撤回流程");
    }
    if (wf.status !== WorkflowStatusEnum.DRAFT) {
      throw new BadRequestException("仅 DRAFT 状态支持删除");
    }
    await this.prisma.workflow.delete({ where: { id } });
    await this.audit.log("DELETE_WORKFLOW", {
      workflowId: id,
      actorCode,
      data: {},
    });
    return;
  }
}
