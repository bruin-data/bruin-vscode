// Generate local fixtures and require bruin validate to pass for each size.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const output = process.env.PERF_DIR || path.resolve(__dirname, "../../.context/perf");
const sizes = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [100, 500, 1500];
if (sizes.some((n) => !Number.isInteger(n) || n < 1))
  throw new Error("Sizes must be positive integers");
const assetName = (i) => `perf.asset_${String(i).padStart(4, "0")}`;
const columns = Array.from({ length: 20 }, (_, i) => `col_${i}`);
for (const size of sizes) {
  const dir = path.join(output, `pipeline-${size}`);
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".bruin.yml"),
    `default_environment: default
environments:
  default:
    connections:
      duckdb:
        - name: local
          path: ${JSON.stringify(path.join(dir, "perf.duckdb"))}
`
  );
  fs.writeFileSync(
    path.join(dir, "pipeline.yml"),
    `name: perf-${size}
schedule: daily
start_date: "2024-01-01"
default_connections:
  duckdb: local
`
  );
  for (let i = 0; i < size; i++) {
    const prevLayer = Math.floor(i / 25) * 25 - 25;
    const upstreams =
      i < 25 ? [] : [0, 1, 2].map((j) => assetName(prevLayer + (((i % 25) + j) % 25)));
    const depends = upstreams.length
      ? `depends:\n${upstreams.map((n) => `  - ${n}`).join("\n")}\n`
      : "";
    const sql = upstreams.length
      ? `SELECT ${columns.join(", ")} FROM ${upstreams[0]}`
      : `SELECT ${columns.map((c, j) => `${j} AS ${c}`).join(", ")}`;
    fs.writeFileSync(
      path.join(dir, "assets", `asset_${String(i).padStart(4, "0")}.sql`),
      `/* @bruin\nname: ${assetName(i)}\ntype: duckdb.sql\n${depends}columns:\n${columns.map((c) => `  - name: ${c}\n    type: integer`).join("\n")}\n@bruin */\n${sql}\n`
    );
  }
  const validation = spawnSync(process.env.BRUIN_BIN || "bruin", ["validate", dir], {
    encoding: "utf8",
  });
  fs.writeFileSync(
    path.join(output, `validate-${size}.log`),
    (validation.stdout || "") + (validation.stderr || "")
  );
  if (validation.error) throw validation.error;
  if (validation.status !== 0)
    throw new Error(`Validation failed; see ${path.join(output, `validate-${size}.log`)}`);
  console.log(`Validated ${size} assets: ${dir}`);
}
