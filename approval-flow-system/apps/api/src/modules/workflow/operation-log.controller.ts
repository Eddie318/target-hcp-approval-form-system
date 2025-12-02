import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

class OperationLogQueryDto {
  @IsOptional()
  @IsString()
  operation?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number = 50;
}

@ApiTags("operation-logs")
@Controller("operation-logs")
export class OperationLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: OperationLogQueryDto) {
    const where: any = {};
    if (query.operation) where.operation = query.operation;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return this.prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
    });
  }
}
