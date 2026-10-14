const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export function parseCsv(text) {
  const source = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => String(value).trim() !== "")) {
    rows.push(row);
  }

  if (quoted) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  return rows;
}

const HEADER_ALIASES = new Map([
  ["name", "name"],
  ["product", "name"],
  ["product name", "name"],
  ["brand", "brand"],
  ["category", "category"],
  ["unit", "unitType"],
  ["unit type", "unitType"],
  ["buying price", "buyingPrice"],
  ["cost", "buyingPrice"],
  ["cost price", "buyingPrice"],
  ["selling price", "sellingPrice"],
  ["price", "sellingPrice"],
  ["stock", "stock"],
  ["opening stock", "stock"],
  ["low stock", "lowStockLevel"],
  ["low stock level", "lowStockLevel"],
  ["supplier", "supplier"],
]);

export function productsFromCsv(text) {
  const rows = parseCsv(text);

  if (rows.length < 2) {
    throw new Error("CSV must contain a header row and at least one product row.");
  }

  const mappedHeaders = rows[0].map((heading) =>
    HEADER_ALIASES.get(normalizeHeader(heading)) || null
  );

  const required = ["name", "category", "unitType", "sellingPrice"];
  for (const column of required) {
    if (!mappedHeaders.includes(column)) {
      throw new Error(`Missing required CSV column: ${column}.`);
    }
  }

  const products = rows
    .slice(1)
    .filter((cells) => cells.some((value) => String(value ?? "").trim() !== ""))
    .map((cells) => {
      const product = {};
      mappedHeaders.forEach((key, columnIndex) => {
        if (key) {
          product[key] = String(cells[columnIndex] ?? "").trim();
        }
      });

      product.unitType = String(product.unitType || "piece").toLowerCase();
      product.buyingPrice = Number(product.buyingPrice || 0);
      product.sellingPrice = Number(product.sellingPrice || 0);
      product.stock = Number(product.stock || 0);
      product.lowStockLevel = Number(product.lowStockLevel || 0);
      product.brand = product.brand || "";
      product.supplier = product.supplier || "";
      return product;
    });

  if (products.length > 20000) {
    throw new Error("A single import is limited to 20,000 products.");
  }

  return products;
}

export const PRODUCT_CSV_TEMPLATE = [
  "Name,Brand,Category,Unit,Buying Price,Selling Price,Stock,Low Stock,Supplier",
  'Example Perfume,Demo Brand,Perfume,ml,100,150,500,50,Demo Supplier',
  'Example Lipstick,Demo Brand,Lipstick,piece,200,350,20,5,Demo Supplier',
].join("\r\n");
