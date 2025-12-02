/**
 * 导入药店白名单（全量覆盖 pharmacy 类型白名单）。
 *
 * 用法：
 *   NODE_ENV=development DATABASE_URL=postgres://... node scripts/import-pharmacy-whitelist.js --file=药店白名单Sample.csv
 *
 * 约定的列（示例见 药店白名单Sample.csv）：
 *   关联医院code, 关联医院名称, 院边店code, 院边店名称, A类： （院内店、HIS）(Y/N)
 *
 * 说明：
 * - 仅写入 WhitelistRecord 表，entityType=PHARMACY，pharmacyType=Y?A类:关联。
 * - 导入前会清空 entityType=PHARMACY 的历史记录，避免重复。
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeKey(key) {
  return key
    .replace(/[\s\r\n]+/g, "")
    .replace(/[:：(),，"“”]/g, "")
    .toLowerCase();
}

const TARGET_KEYS = {
  hospitalCode: "关联医院code",
  hospitalName: "关联医院名称",
  pharmacyCode: "院边店code",
  pharmacyName: "院边店名称",
  isAClass: "A类",
};

function loadCsv(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  // 去掉空行/全逗号行，避免空表头
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
    const entries = Object.entries(row).map(([k, v]) => [
      normalizeKey(k),
      typeof v === "string" ? v.trim() : v,
    ]);
    const getVal = (targetKey) => {
      const normTarget = normalizeKey(targetKey);
      const hit = entries.find(([k]) => k.includes(normTarget));
      return hit ? hit[1] : "";
    };
    return {
      hospitalCode: getVal(TARGET_KEYS.hospitalCode) || null,
      hospitalName: getVal(TARGET_KEYS.hospitalName) || null,
      pharmacyCode: getVal(TARGET_KEYS.pharmacyCode),
      pharmacyName: getVal(TARGET_KEYS.pharmacyName),
      isAClass: getVal(TARGET_KEYS.isAClass),
    };
  });
}

function validate(rows) {
  rows.forEach((r, idx) => {
    if (!r.pharmacyCode) {
      throw new Error(`第 ${idx + 1} 行缺少 院边店code`);
    }
  });
}

async function clearPharmacyWhitelist() {
  await prisma.whitelistRecord.deleteMany({
    where: { entityType: "PHARMACY" },
  });
}

async function importData(rows) {
  for (const r of rows) {
    const isA =
      typeof r.isAClass === "string" &&
      r.isAClass.trim().toUpperCase() === "Y";
    await prisma.whitelistRecord.create({
      data: {
        entityType: "PHARMACY",
        code: r.pharmacyCode,
        name: r.pharmacyName || r.pharmacyCode,
        pharmacyType: isA ? "A类" : "关联",
        status: "ACTIVE",
        // 其他字段暂缺（地区/有效期）；如需可在 CSV 增加后再映射
      },
    });
  }
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const file = arg ? arg.split("=")[1] : "药店白名单Sample.csv";
  const filePath = path.resolve(process.cwd(), file);
  let logPayload = {
    source: "pharmacy-whitelist",
    fileName: path.basename(filePath),
    total: 0,
    success: 0,
    failed: 0,
    message: "",
  };
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
  logPayload.total = rows.length;

  console.log("清空药店白名单（entityType=PHARMACY）...");
  await clearPharmacyWhitelist();

  console.log("写入数据库...");
  await importData(rows);
  logPayload.success = rows.length;

  console.log("导入完成");
}

main()
  .catch(async (err) => {
    console.error(err);
    logPayload.failed = logPayload.total - logPayload.success;
    logPayload.message = err?.message ?? String(err);
    await prisma.importLog
      .create({ data: logPayload })
      .catch(() => console.error("记录导入日志失败"));
    process.exit(1);
  })
  .finally(async () => {
    logPayload.failed = logPayload.total - logPayload.success;
    if (!logPayload.message) logPayload.message = "OK";
    await prisma.importLog
      .create({ data: logPayload })
      .catch(() => console.error("记录导入日志失败"));
    await prisma.$disconnect();
  });
