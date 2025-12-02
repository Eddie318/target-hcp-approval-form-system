import { Module } from "@nestjs/common";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowScopeService } from "./workflow.scope";
import { WorkflowAuditService } from "./workflow.audit";
import { WorkflowShortLinkService } from "./workflow.shortlink";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowScopeService,
    WorkflowAuditService,
    WorkflowShortLinkService,
    PrismaService,
  ],
})
export class WorkflowModule {}
