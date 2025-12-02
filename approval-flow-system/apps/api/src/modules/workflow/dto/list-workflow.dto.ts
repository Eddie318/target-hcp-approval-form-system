import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  WorkflowStatus,
  WorkflowStatusEnum,
  WorkflowType,
  WorkflowTypeEnum,
} from "../workflow.constants";

export class ListWorkflowQueryDto {
  @ApiPropertyOptional({ enum: Object.values(WorkflowTypeEnum) })
  @IsOptional()
  @IsEnum(WorkflowTypeEnum)
  type?: WorkflowType;

  @ApiPropertyOptional({ enum: Object.values(WorkflowStatusEnum) })
  @IsOptional()
  @IsEnum(WorkflowStatusEnum)
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    description: "当前用户岗位号，用于权限过滤（草稿仅本人可见）",
  })
  @IsOptional()
  @IsString()
  actorCode?: string;
}
