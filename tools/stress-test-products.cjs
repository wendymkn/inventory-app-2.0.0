const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const target = Number(process.argv[2] || 10000);

if (!Number.isInteger(target) || target < 1 || target > 250000) {
  console.error("Usage: node tools\\stress-test-products.cjs <target-product-count>");
  console.error("Example: node tools\\stress-test-products.cjs 10000");
  process.exit(1);
}

const appData = process.env.APPDATA;
if (!appData) {
  console.error("Could not resolve %APPDATA%.");
  process.exit(1);
}

const glamstockRoot = path.join(appData, "glamstock");
const dbPath = path.join(glamstockRoot, "data", "glamstock.db");
const backupDir = path.join(glamstockRoot, "backups");

if (!fs.existsSync(dbPath)) {
  console.error("GlamStock database not found:");
  console.error(dbPath);
  console.error("\nOpen the installed GlamStock app once, close it completely, then retry.");
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function elapsed(start) {
  return (performance.now() - start).toFixed(2);
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }

  return `${value.toFixed(2)} ${units[i]}`;
}

async function main() {
  console.log("\nGlamStock Product Stress Test");
  console.log("=============================");
  console.log(`Database: ${dbPath}`);
  console.log(`Target STRESS products: ${target.toLocaleString()}`);
  console.log("\nIMPORTANT: Close GlamStock completely before running this script.\n");

  const db = new Database(dbPath);

  try {
    const productsTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"
    ).get();

    if (!productsTable) {
      throw new Error("The products table was not found.");
    }

    const columns = db.prepare("PRAGMA table_info(products)").all();
    const columnNames = new Set(columns.map((c) => c.name));

    const requiredColumns = [
      "name",
      "brand",
      "category",
      "unit_type",
      "buying_price",
      "selling_price",
      "stock",
      "low_stock_level",
      "supplier_id",
      "is_active",
      "supplier_name"
    ];

    const missing = requiredColumns.filter((name) => !columnNames.has(name));

    if (missing.length > 0) {
      throw new Error(
        `Current products table does not match this stress-test script. Missing: ${missing.join(", ")}`
      );
    }

    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch (_) {
      // Fine if the DB is not using WAL.
    }

    const backupPath = path.join(
      backupDir,
      `GlamStock-Backup-Before-Stress-${stamp()}.glamstock.db`
    );

    console.log("Creating safety backup...");
    await db.backup(backupPath);
    console.log(`Backup created:\n${backupPath}\n`);

    const totalBefore = db
      .prepare("SELECT COUNT(*) AS count FROM products")
      .get().count;

    const existingStress = db
      .prepare("SELECT COUNT(*) AS count FROM products WHERE name LIKE 'STRESS-%'")
      .get().count;

    console.log(`Total products before run: ${totalBefore.toLocaleString()}`);
    console.log(`Existing STRESS products: ${existingStress.toLocaleString()}`);

    const toInsert = Math.max(0, target - existingStress);

    if (toInsert > 0) {
      const insert = db.prepare(`
        INSERT INTO products (
          name,
          brand,
          category,
          unit_type,
          buying_price,
          selling_price,
          stock,
          low_stock_level,
          supplier_id,
          is_active,
          supplier_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const categories = [
        ["Perfume", "ml"],
        ["Lipstick", "piece"],
        ["Skincare", "piece"],
        ["Hair Care", "piece"],
        ["Body Care", "piece"],
        ["Accessories", "piece"]
      ];

      const insertMany = db.transaction((start, end) => {
        for (let i = start; i <= end; i += 1) {
          const [category, unitType] = categories[(i - 1) % categories.length];

          const buyingPrice = 100 + (i % 900);
          const sellingPrice = buyingPrice + 50 + (i % 350);

          const stock =
            unitType === "ml"
              ? 1000 + (i % 5000)
              : 10 + (i % 200);

          const lowStockLevel =
            unitType === "ml"
              ? 100
              : 5;

          insert.run(
            `STRESS-${String(i).padStart(6, "0")} Test ${category}`,
            `Stress Brand ${(i % 100) + 1}`,
            category,
            unitType,
            buyingPrice,
            sellingPrice,
            stock,
            lowStockLevel,
            null,
            1,
            `Stress Supplier ${(i % 50) + 1}`
          );
        }
      });

      console.log(`\nInserting ${toInsert.toLocaleString()} products...`);

      const started = performance.now();
      insertMany(existingStress + 1, target);

      console.log(`Insert time: ${elapsed(started)} ms`);
    } else {
      console.log("\nTarget already reached. No new STRESS products inserted.");
    }

    console.log("\nRunning database benchmarks...");

    let started = performance.now();

    const totalAfter = db
      .prepare("SELECT COUNT(*) AS count FROM products")
      .get().count;

    const countMs = elapsed(started);

    started = performance.now();

    const activeRows = db
      .prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC")
      .all();

    const loadAllMs = elapsed(started);

    started = performance.now();

    const exactLikeRows = db
      .prepare(`
        SELECT *
        FROM products
        WHERE is_active = 1
          AND name LIKE ?
        LIMIT 20
      `)
      .all("STRESS-0095%");

    const prefixMs = elapsed(started);

    started = performance.now();

    const containsRows = db
      .prepare(`
        SELECT *
        FROM products
        WHERE is_active = 1
          AND (
            name LIKE ?
            OR brand LIKE ?
            OR category LIKE ?
          )
        LIMIT 20
      `)
      .all("%Lipstick%", "%Lipstick%", "%Lipstick%");

    const containsMs = elapsed(started);

    started = performance.now();

    const perfumeCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM products
        WHERE is_active = 1
          AND category = ?
      `)
      .get("Perfume").count;

    const categoryMs = elapsed(started);

    const sample = db
      .prepare(`
        SELECT id, stock
        FROM products
        WHERE name LIKE 'STRESS-%'
        ORDER BY id DESC
        LIMIT 1
      `)
      .get();

    let updateMs = "n/a";

    if (sample) {
      const updateAndRestore = db.transaction(() => {
        db.prepare(`
          UPDATE products
          SET stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(Number(sample.stock) + 1, sample.id);

        db.prepare(`
          UPDATE products
          SET stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(sample.stock, sample.id);
      });

      started = performance.now();
      updateAndRestore();
      updateMs = `${elapsed(started)} ms`;
    }

    const dbSize = fs.statSync(dbPath).size;
    const rss = process.memoryUsage().rss;

    console.log("\nRESULTS");
    console.log("=======");
    console.log(`Total products now:          ${totalAfter.toLocaleString()}`);
    console.log(`COUNT(*) query:              ${countMs} ms`);
    console.log(`Load ALL active products:    ${loadAllMs} ms (${activeRows.length.toLocaleString()} rows)`);
    console.log(`Prefix search LIMIT 20:      ${prefixMs} ms (${exactLikeRows.length} rows)`);
    console.log(`Contains search LIMIT 20:    ${containsMs} ms (${containsRows.length} rows)`);
    console.log(`Perfume category count:      ${categoryMs} ms (${perfumeCount.toLocaleString()} rows)`);
    console.log(`Stock update + restore:      ${updateMs}`);
    console.log(`Database size:               ${formatBytes(dbSize)}`);
    console.log(`Test-process RAM:            ${formatBytes(rss)}`);

    console.log("\nNEXT");
    console.log("====");
    console.log("1. Open the installed GlamStock app.");
    console.log("2. Test Products page loading and scrolling.");
    console.log("3. Search for STRESS-009500.");
    console.log("4. Test POS search for Lipstick and Perfume.");
    console.log("5. Test one stock in/out action.");
    console.log("6. Close GlamStock before running the next target.");
    console.log("\nWhen all stress testing is finished, restore the ORIGINAL pre-stress backup.");
    console.log(`Safety backup from this run:\n${backupPath}\n`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("\nStress test failed:");
  console.error(error);
  process.exit(1);
});
