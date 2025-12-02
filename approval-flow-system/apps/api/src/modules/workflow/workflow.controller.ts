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
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { WorkflowService } from "./workflow.service";
import { ActionWorkflowDto } from "./dto/action-workflow.dto";
import { ListWorkflowQueryDto } from "./dto/list-workflow.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { WorkflowRole, WorkflowRoleEnum } from "./workflow.constants";
import { WorkflowShortLinkService } from "./workflow.shortlink";
import {
  ExportFormatEnum,
  ExportWorkflowQueryDto,
} from "./dto/export-workflow.dto";
import { Response } from "express";
import { ShortlinkActionDto } from "./dto/shortlink-action.dto";
import { WorkflowAuditService } from "./workflow.audit";
import { MockAuthGuard } from "./mock-auth.guard";
import * as XLSX from "xlsx";

@ApiTags("workflows")
@Controller("workflows")
@UseGuards(MockAuthGuard)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly shortLinkService: WorkflowShortLinkService,
    private readonly audit: WorkflowAuditService,
  ) {}

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
      filters: {
        type: query?.type,
        status: query?.status,
        createdFrom: query?.createdFrom,
        createdTo: query?.createdTo,
      },
    });
    const format = query?.format ?? ExportFormatEnum.CSV;
    const rows = workflows.map((wf) => ({
      id: wf.id,
      type: wf.type,
      status: wf.status,
      title: wf.title ?? "",
      submittedBy: wf.submittedBy ?? "",
      createdAt: wf.createdAt?.toISOString?.() ?? wf.createdAt,
      updatedAt: wf.updatedAt?.toISOString?.() ?? wf.updatedAt,
      payload: JSON.stringify(wf.payload ?? {}),
      steps: JSON.stringify(wf.steps ?? []),
      actions: JSON.stringify(wf.actions ?? []),
      attachments: JSON.stringify(wf.files ?? []),
    }));

    if (format === ExportFormatEnum.XLSX) {
      const sheet = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "workflows");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      if (res) {
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="workflows.xlsx"',
        );
      }
      return buffer;
    }

    // 默认导出为 CSV
    const header = Object.keys(rows[0] ?? {});
    const safe = (v: any) =>
      typeof v === "string"
        ? `"${v.replace(/"/g, '""')}"`
        : `"${JSON.stringify(v || "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => header.map((key) => safe(r[key])).join(","));
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

  @Post("shortlink/actions")
  @ApiBody({ type: ShortlinkActionDto })
  async actViaShortlink(@Body() dto: ShortlinkActionDto) {
    const payload = this.shortLinkService.verify(dto.token);
    await this.audit.log("SHORTLINK_USE", {
      workflowId: payload.workflowId,
      actorCode: null,
      data: { action: payload.action, role: payload.role, via: "shortlink" },
    });
    return this.workflowService.act(payload.workflowId, {
      action: payload.action,
      role: payload.role,
      comment: dto.comment,
      actorCode: undefined, // 短链模式不携带用户上下文，后续接入企业微信后替换
    } as any);
  }
}
