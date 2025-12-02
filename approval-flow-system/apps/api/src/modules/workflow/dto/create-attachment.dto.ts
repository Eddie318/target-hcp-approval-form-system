import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateAttachmentDto {
  @ApiProperty({ description: "文件名" })
  @IsString()
  filename: string;

  @ApiPropertyOptional({ description: "文件 URL（占位，可选）" })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: "MIME 类型" })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: "所属步骤 ID（可选）" })
  @IsOptional()
  @IsString()
  stepId?: string;
}
