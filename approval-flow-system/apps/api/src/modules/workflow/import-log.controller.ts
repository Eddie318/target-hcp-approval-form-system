import { Controller, Get, Query } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";

class ImportLogQueryDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number = 50;
}

@ApiTags("import-logs")
@Controller("import-logs")
export class ImportLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: ImportLogQueryDto) {
    const where: any = {};
    if (query.source) where.source = query.source;
    return this.prisma.importLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
    });
  }
}
