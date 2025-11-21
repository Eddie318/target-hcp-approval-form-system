import { Module } from "@nestjs/common";
import { MetricController } from "./metric.controller";

@Module({
  controllers: [MetricController],
})
export class MetricModule {}
