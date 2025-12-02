/**
 * 全量导入医院/药店主数据与医院-MR 分配关系（占比必须=100%）。
 * 用法：
 *   NODE_ENV=development DATABASE_URL=postgres://... node scripts/import-assignments.js --file=testdata.csv
 *
 * 约定：
 * - CSV 必须包含表头；当前支持的列：
 *   大区,关联医院code,关联医院名称,机构ID,机构名称,省份,城市,销售类型,New territory code,HCPP Name,Catalyst Orbit code,Catalyst,RSM Orbit code,Regional Catalyst,占比
 * - “销售类型”=医院 时，写入 Hospital + HospitalAssignment；占比按医院累计=100% 否则报错。
 * - “销售类型”=药店 时，写入 Pharmacy（code=机构ID），不写入分配表。
 * - 全量覆盖：导入前会清空 Hospital/HospitalAssignment/Pharmacy 表。
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const HEADER_MAP = {
  region: "大区",
  hospitalCode: "关联医院code",
  hospitalName: "关联医院名称",
  orgId: "机构ID",
  orgName: "机构名称",
  province: "省份",
  city: "城市",
  salesType: "销售类型",
  mrCode: "New territory code",
  mrName: "HCPP Name",
  dsmCode: "Catalyst Orbit code",
  dsmName: "Catalyst",
  rsmCode: "RSM Orbit code",
  rsmName: "Regional Catalyst",
};

function loadCsv(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  // 去掉文件开头的空行/全逗号行，避免空表头
  content = content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && line.replace(/,/g, "").trim() !== "")
    .join("\n");

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const get = (key) => row[HEADER_MAP[key]]?.trim();
    return {
      region: get("region") || null,
      hospitalCode: get("hospitalCode"),
      hospitalName: get("hospitalName"),
      orgId: get("orgId"),
      orgName: get("orgName"),
      province: get("province") || null,
      city: get("city") || null,
      salesType: get("salesType"),
      mrCode: get("mrCode"),
      mrName: get("mrName"),
      dsmCode: get("dsmCode") || null,
      dsmName: get("dsmName") || null,
      rsmCode: get("rsmCode") || null,
      rsmName: get("rsmName") || null,
      percent: null, // 新版无占比，默认空（导入时设 0）
    };
  });
}

function validate(rows) {
  for (const r of rows) {
    if (!r.hospitalCode) throw new Error("缺少 关联医院code");
    if (!r.salesType) throw new Error("缺少 销售类型");
    if (r.salesType === "医院" && !r.mrCode) {
      throw new Error(
        `医院行缺少 MR 岗位号: ${r.hospitalCode} / ${r.orgId}`
      );
    }
  }
}

async function clearTables() {
  await prisma.workflowAction.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.hospitalAssignment.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.hospital.deleteMany();
}

async function importData(rows) {
  for (const r of rows) {
    if (r.salesType === "医院") {
      // 医院 & 分配
      await prisma.hospital.upsert({
        where: { code: r.hospitalCode },
        update: {
          organizationId: r.orgId,
          name: r.hospitalName || r.orgName || r.hospitalCode,
          region: r.region,
          province: r.province,
          city: r.city,
          salesType: r.salesType,
        },
        create: {
          code: r.hospitalCode,
          organizationId: r.orgId,
          name: r.hospitalName || r.orgName || r.hospitalCode,
          region: r.region,
          province: r.province,
          city: r.city,
          salesType: r.salesType,
        },
      });

      await prisma.hospitalAssignment.upsert({
        where: {
          hospitalCode_mrCode: {
            hospitalCode: r.hospitalCode,
            mrCode: r.mrCode,
          },
        },
        update: {
          dsmCode: r.dsmCode,
          rsmCode: r.rsmCode,
          sharePercent: r.percent ?? 0,
          region: r.region,
          province: r.province,
          city: r.city,
        },
        create: {
          hospitalCode: r.hospitalCode,
          mrCode: r.mrCode,
          dsmCode: r.dsmCode,
          rsmCode: r.rsmCode,
          sharePercent: r.percent ?? 0,
          region: r.region,
          province: r.province,
          city: r.city,
        },
      });
    } else if (r.salesType === "药店") {
      // 药店
      await prisma.pharmacy.upsert({
        where: { code: r.orgId || r.hospitalCode },
        update: {
          organizationId: r.orgId || r.hospitalCode,
          name: r.orgName || r.hospitalName || r.orgId || r.hospitalCode,
          region: r.region,
          province: r.province,
          city: r.city,
          pharmacyType: null,
        },
        create: {
          code: r.orgId || r.hospitalCode,
          organizationId: r.orgId || r.hospitalCode,
          name: r.orgName || r.hospitalName || r.orgId || r.hospitalCode,
          region: r.region,
          province: r.province,
          city: r.city,
          pharmacyType: null,
        },
      });
    } else {
      console.warn(`未知销售类型，已跳过: ${r.salesType}`);
    }
  }
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const file = arg ? arg.split("=")[1] : "testdata.csv";
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  console.log("读取文件:", filePath);
  const parsed = loadCsv(filePath);
  const rows = normalizeRows(parsed).filter(
    (r) => Object.values(r).some((v) => v !== null && v !== "")
  );

  validate(rows);
  console.log(`校验通过，记录数：${rows.length}`);

  console.log("清空相关表...");
  await clearTables();

  console.log("写入数据库...");
  await importData(rows);

  console.log("导入完成");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
