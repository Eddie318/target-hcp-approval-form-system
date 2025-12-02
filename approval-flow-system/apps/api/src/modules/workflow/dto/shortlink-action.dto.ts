import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ShortlinkActionDto {
  @ApiProperty({ description: "短链 token（包含流程ID/动作/角色/过期时间）" })
  @IsString()
  token: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
