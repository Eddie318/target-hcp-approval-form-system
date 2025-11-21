import { Body, Controller, Post } from "@nestjs/common";
import { IsString, IsOptional } from "class-validator";

class NotifyDto {
  @IsString()
  processId: string;

  @IsString()
  status: string;

  @IsString()
  actionBy: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller("notify")
export class NotifyController {
  @Post("approval")
  notifyApproval(@Body() _body: NotifyDto) {
    console.log("[mock] notify approval payload:", _body);
    return { code: 0, message: "ok" };
  }
}
