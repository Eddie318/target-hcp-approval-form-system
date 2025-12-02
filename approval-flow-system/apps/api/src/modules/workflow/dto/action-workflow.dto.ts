import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
  WorkflowAction,
  WorkflowActionEnum,
  WorkflowRole,
  WorkflowRoleEnum,
} from "../workflow.constants";

export class ActionWorkflowDto {
  @ApiProperty({
    enum: Object.values(WorkflowActionEnum),
    description: "审批动作",
  })
  @IsEnum(WorkflowActionEnum)
  action: WorkflowAction;

  @ApiPropertyOptional({
    description: "审批意见",
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: "审批人岗位号（占位，后续可从鉴权获取）",
  })
  @IsOptional()
  @IsString()
  actorCode?: string; // 岗位号，占位，后续从鉴权上下文获取

  @ApiPropertyOptional({
    enum: Object.values(WorkflowRoleEnum),
    description: "当前审批人角色（占位，后续从鉴权推断）",
  })
  @IsOptional()
  @IsEnum(WorkflowRoleEnum)
  role?: WorkflowRole; // 当前审批人角色（占位，后续从鉴权推断）
}
