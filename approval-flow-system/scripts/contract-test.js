/**
 * 简单契约校验示例：请求 mock 接口并检测关键字段是否存在。
 * Node 18+ 内置 fetch。
 */
const assertFields = (obj, fields, label) => {
  for (const f of fields) {
    if (!(f in obj)) {
      throw new Error(`[${label}] missing field: ${f}`);
    }
  }
};

async function checkHospitals() {
  const res = await fetch('http://localhost:4001/masterdata/hospitals');
  const body = await res.json();
  const sample = body.data?.[0] || {};
  assertFields(sample, ['id', 'code', 'name', 'regionCode', 'address'], 'hospitals');
}

async function checkMetric() {
  const res = await fetch('http://localhost:4001/metric/hospital-target');
  const body = await res.json();
  const sample = body.data?.[0] || {};
  assertFields(sample, ['hospitalCode', 'hospitalName', 'availableAmount', 'currency', 'lastUpdated'], 'metric');
}

async function checkNotify() {
  const res = await fetch('http://localhost:4001/notify/approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ processId: 'P1', status: 'approved', actionBy: 'tester' })
  });
  const body = await res.json();
  assertFields(body, ['code', 'message'], 'notify');
}

async function main() {
  await checkHospitals();
  await checkMetric();
  await checkNotify();
  // eslint-disable-next-line no-console
  console.log('contract-test passed');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
