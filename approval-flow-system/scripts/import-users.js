/**
 * 导入企业微信身份映射（邮箱 → 岗位号 → 角色）。
 *
 * 用法：
 *   NODE_ENV=development DATABASE_URL=postgres://... node scripts/import-users.js --file=人员.csv
 *
 * 支持的列：
 *   h8,e8,m8   -> MR 岗位号、姓名、邮箱
 *   h6,e6,m6   -> DSM 岗位号、姓名、邮箱
 *   h4,e4,m4   -> RSM 岗位号、姓名、邮箱
 *   h3,e3,m3   -> RSD 岗位号、姓名、邮箱
 *   h2,e2,m2   -> BU 岗位号、姓名、邮箱（映射到 UserRole.BISO1 作为上级；如需分开可后续扩展）
 *
 * 空邮箱表示暂未配置负责人，将写入 enabled=false。
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ROLE_MAP = [
  { code: "h8", name: "e8", email: "m8", role: "MR" },
  { code: "h6", name: "e6", email: "m6", role: "DSM" },
  { code: "h4", name: "e4", email: "m4", role: "RSM" },
  { code: "h3", name: "e3", email: "m3", role: "RSD" },
  // 将 BU 先映射为 BISO1，占位；后续如需分级可新增角色/字段
  { code: "h2", name: "e2", email: "m2", role: "BISO1" },
];

function loadCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

async function clearTable() {
  await prisma.userMapping.deleteMany();
  await prisma.userHierarchy.deleteMany();
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const file = arg ? arg.split("=")[1] : "人员.csv";
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const rows = loadCsv(filePath);

  const mappings = [];
  const hierarchies = [];
  for (const row of rows) {
    for (const r of ROLE_MAP) {
      const actorCode = row[r.code];
      const name = row[r.name];
      const email = row[r.email];
      if (!actorCode) continue;
      mappings.push({
        email: email || `${actorCode}@placeholder`,
        actorCode,
        actorRole: r.role,
        name: name || null,
        enabled: Boolean(email),
      });
    }
    // 层级映射：MR -> DSM/RSM；DSM -> RSM
    const mrCode = row["h8"];
    const dsmCode = row["h6"];
    const rsmCode = row["h4"];
    if (mrCode) {
      hierarchies.push({ actorCode: mrCode, dsmCode: dsmCode || null, rsmCode: rsmCode || null });
    }
    if (dsmCode) {
      hierarchies.push({ actorCode: dsmCode, dsmCode: null, rsmCode: rsmCode || null });
    }
  }

  console.log(`解析完成，记录数（含占位）：${mappings.length}`);

  console.log("清空 UserMapping 表...");
  await clearTable();

  console.log("写入数据库...");
  await prisma.$transaction([
    prisma.userMapping.createMany({
      data: mappings,
      skipDuplicates: true,
    }),
    prisma.userHierarchy.createMany({
      data: hierarchies,
      skipDuplicates: true,
    }),
  ]);
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
