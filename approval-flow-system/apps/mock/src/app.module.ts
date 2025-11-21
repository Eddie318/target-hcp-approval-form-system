import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MasterdataModule } from "./modules/masterdata/masterdata.module";
import { MetricModule } from "./modules/metric/metric.module";
import { NotifyModule } from "./modules/notify/notify.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MasterdataModule,
    MetricModule,
    NotifyModule,
  ],
})
export class AppModule {}
