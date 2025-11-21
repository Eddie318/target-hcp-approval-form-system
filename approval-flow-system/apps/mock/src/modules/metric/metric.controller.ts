import { Controller, Get } from "@nestjs/common";

@Controller("metric")
export class MetricController {
  @Get("hospital-target")
  getHospitalTargets() {
    return {
      data: [
        {
          hospitalCode: "H001",
          hospitalName: "Central Hospital",
          availableAmount: 100000,
          currency: "CNY",
          lastUpdated: new Date().toISOString(),
        },
        {
          hospitalCode: "H002",
          hospitalName: "East Care",
          availableAmount: 50000,
          currency: "CNY",
          lastUpdated: new Date().toISOString(),
        },
      ],
    };
  }
}
