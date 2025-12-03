import { Module } from "@nestjs/common";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowScopeService } from "./workflow.scope";
import { WorkflowAuditService } from "./workflow.audit";
import { WorkflowShortLinkService } from "./workflow.shortlink";
import { MockAuthGuard } from "./mock-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { ImportLogController } from "./import-log.controller";
import { OperationLogController } from "./operation-log.controller";
import { ApproverConfigController } from "./approver-config.controller";

@Module({
  controllers: [
    WorkflowController,
    ImportLogController,
    OperationLogController,
    ApproverConfigController,
  ],
  providers: [
    WorkflowService,
    WorkflowScopeService,
    WorkflowAuditService,
    WorkflowShortLinkService,
    MockAuthGuard,
    PrismaService,
  ],
})
export class WorkflowModule {}
