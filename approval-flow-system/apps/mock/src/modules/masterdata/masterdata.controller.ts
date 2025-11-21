import { Controller, Get } from "@nestjs/common";

@Controller("masterdata")
export class MasterdataController {
  @Get("hospitals")
  getHospitals() {
    return {
      data: [
        {
          id: "H001",
          code: "H001",
          name: "Central Hospital",
          regionCode: "R01",
          address: "123 Main St",
        },
        {
          id: "H002",
          code: "H002",
          name: "East Care",
          regionCode: "R02",
          address: "88 East Rd",
        },
      ],
    };
  }

  @Get("pharmacies")
  getPharmacies() {
    return {
      data: [
        {
          id: "P001",
          code: "P001",
          name: "Pharmacy One",
          regionCode: "R01",
          type: "A",
        },
        {
          id: "P002",
          code: "P002",
          name: "Pharmacy Two",
          regionCode: "R02",
          type: "关联",
        },
      ],
    };
  }

  @Get("representatives")
  getRepresentatives() {
    return {
      data: [
        { id: "MR01", name: "Alice", role: "MR", regionCode: "R01" },
        { id: "DSM01", name: "Bob", role: "DSM", regionCode: "R01" },
        { id: "RSM01", name: "Cindy", role: "RSM", regionCode: "R02" },
      ],
    };
  }

  @Get("regions")
  getRegions() {
    return {
      data: [
        { code: "R01", name: "North" },
        { code: "R02", name: "East" },
        { code: "R03", name: "South" },
      ],
    };
  }
}
