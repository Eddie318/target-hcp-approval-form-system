import { Module } from "@nestjs/common";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowScopeService } from "./workflow.scope";

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowScopeService],
})
export class WorkflowModule {}
