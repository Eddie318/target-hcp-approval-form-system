import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Headers,
  ForbiddenException,
  Res,
} from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { WorkflowService } from "./workflow.service";
import { ActionWorkflowDto } from "./dto/action-workflow.dto";
import { ListWorkflowQueryDto } from "./dto/list-workflow.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { WorkflowRole, WorkflowRoleEnum } from "./workflow.constants";
import {
  ExportFormatEnum,
  ExportWorkflowQueryDto,
} from "./dto/export-workflow.dto";
import { Response } from "express";

@ApiTags("workflows")
@Controller("workflows")
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  private resolveRole(headerRole?: string): WorkflowRole | undefined {
    if (!headerRole) return undefined;
    return (Object.values(WorkflowRoleEnum) as WorkflowRole[]).includes(
      headerRole as WorkflowRole,
    )
      ? (headerRole as WorkflowRole)
      : undefined;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateWorkflowDto,
    @Headers("x-actor-code") actorCode?: string,
    @Headers("x-actor-role") actorRole?: string,
  ) {
    const role = this.resolveRole(actorRole);
    // 优先使用 body 里的 submittedBy，若缺失则兜底使用 header
    const mergedDto = {
      ...dto,
      submittedBy: dto.submittedBy ?? actorCode,
      role,
    };
    return this.workflowService.create(mergedDto as any);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Query("actorCode") actorCode?: string,
    @Headers("x-actor-code") headerActor?: string,
  ) {
    const code = actorCode ?? headerActor;
    return this.workflowService.findOne(id, code);
  }

  @Post(":id/actions")
  @ApiBody({ type: ActionWorkflowDto })
  act(
    @Param("id") id: string,
    @Body() dto: ActionWorkflowDto,
    @Headers("x-actor-code") actorCode?: string,
    @Headers("x-actor-role") actorRole?: string,
  ) {
    const role = dto.role ?? this.resolveRole(actorRole);
    const merged = {
      ...dto,
      actorCode: dto.actorCode ?? actorCode,
      role,
    };
    return this.workflowService.act(id, merged as any);
  }

  @Get()
  list(
    @Query() query: ListWorkflowQueryDto,
    @Headers("x-actor-code") actorCode?: string,
  ) {
    const merged = { ...query, actorCode: query.actorCode ?? actorCode };
    return this.workflowService.list(merged);
  }

  @Get("export")
  async exportAll(
    @Headers("x-actor-role") actorRole?: string,
    @Headers("x-actor-code") actorCode?: string,
    @Query() query?: ExportWorkflowQueryDto,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const role = this.resolveRole(actorRole);
    const exportRoles = [
      WorkflowRoleEnum.BISO1,
      WorkflowRoleEnum.BISO2,
    ] as WorkflowRole[];
    if (!role || !exportRoles.includes(role as WorkflowRole)) {
      throw new ForbiddenException("仅 BISO1/BISO2 可导出");
    }
    const workflows = await this.workflowService.exportAll({
      actorCode,
      role,
    });
    const format = query?.format ?? ExportFormatEnum.CSV;
    if (format === ExportFormatEnum.JSON) {
      return workflows;
    }
    // 默认导出为 CSV
    const header = [
      "id",
      "type",
      "status",
      "title",
      "submittedBy",
      "createdAt",
      "updatedAt",
      "payload",
      "steps",
      "actions",
      "attachments",
    ];
    const lines = workflows.map((wf) => {
      const safe = (v: any) =>
        typeof v === "string"
          ? `"${v.replace(/"/g, '""')}"`
          : `"${JSON.stringify(v || "").replace(/"/g, '""')}"`;
      return [
        safe(wf.id),
        safe(wf.type),
        safe(wf.status),
        safe(wf.title ?? ""),
        safe(wf.submittedBy ?? ""),
        safe(wf.createdAt?.toISOString?.() ?? wf.createdAt),
        safe(wf.updatedAt?.toISOString?.() ?? wf.updatedAt),
        safe(wf.payload ?? {}),
        safe(wf.steps ?? []),
        safe(wf.actions ?? []),
        safe(wf.files ?? []),
      ].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    if (res) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="workflows.csv"',
      );
    }
    return csv;
  }

  @Post(":id/attachments")
  @ApiBody({ type: CreateAttachmentDto })
  addAttachment(@Param("id") id: string, @Body() dto: CreateAttachmentDto) {
    return this.workflowService.addAttachment(id, dto);
  }
}
