import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { WorkflowTypeEnum, WorkflowRoleEnum } from "../workflow.constants";

export class CreateApproverConfigDto {
  @ApiProperty({ enum: Object.values(WorkflowTypeEnum) })
  @IsEnum(WorkflowTypeEnum)
  workflowType: WorkflowTypeEnum;

  @ApiProperty({ enum: Object.values(WorkflowRoleEnum) })
  @IsEnum(WorkflowRoleEnum)
  role: WorkflowRoleEnum;

  @ApiProperty({ description: "企业邮箱（已关联企微）" })
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: "岗位号，可选" })
  @IsOptional()
  @IsString()
  actorCode?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
