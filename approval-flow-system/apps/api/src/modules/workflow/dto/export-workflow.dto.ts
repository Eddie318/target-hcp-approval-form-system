import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { WorkflowStatusEnum, WorkflowTypeEnum } from "../workflow.constants";

export enum ExportFormatEnum {
  CSV = "csv",
  XLSX = "xlsx",
}

export class ExportWorkflowQueryDto {
  @ApiPropertyOptional({ enum: Object.values(WorkflowTypeEnum) })
  @IsOptional()
  @IsEnum(WorkflowTypeEnum)
  type?: WorkflowTypeEnum;

  @ApiPropertyOptional({ enum: Object.values(WorkflowStatusEnum) })
  @IsOptional()
  @IsEnum(WorkflowStatusEnum)
  status?: WorkflowStatusEnum;

  @ApiPropertyOptional({ description: "起始时间（ISO8601）" })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: "结束时间（ISO8601）" })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({
    enum: ExportFormatEnum,
    description: "导出格式，默认 csv，可选 xlsx",
  })
  @IsOptional()
  @IsEnum(ExportFormatEnum)
  format?: ExportFormatEnum;
}
