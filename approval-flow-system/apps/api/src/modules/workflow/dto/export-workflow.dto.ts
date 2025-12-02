import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum ExportFormatEnum {
  JSON = "json",
  CSV = "csv",
}

export class ExportWorkflowQueryDto {
  @ApiPropertyOptional({
    enum: ExportFormatEnum,
    description: "导出格式，默认 csv",
  })
  @IsOptional()
  @IsEnum(ExportFormatEnum)
  format?: ExportFormatEnum;
}
