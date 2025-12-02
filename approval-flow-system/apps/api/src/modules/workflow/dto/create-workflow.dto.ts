import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsObject } from "class-validator";
import { WorkflowType, WorkflowTypeEnum } from "../workflow.constants";

export class CreateWorkflowDto {
  @ApiProperty({
    enum: Object.values(WorkflowTypeEnum),
    description: "流程类型",
  })
  @IsEnum(WorkflowTypeEnum)
  type: WorkflowType;

  @ApiPropertyOptional({
    description: "表单内容（不同流程的表单字段），取消医院需包含 distributions",
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>; // 具体表单内容，后续按类型收紧

  @ApiPropertyOptional({ description: "流程标题" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "发起人岗位号（可选）" })
  @IsOptional()
  @IsString()
  submittedBy?: string;
}
