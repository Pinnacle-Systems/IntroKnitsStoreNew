// ─────────────────────────────────────────────────────────────────────────────
//  stockReportUtils.js
// ─────────────────────────────────────────────────────────────────────────────

// ── Column definitions ────────────────────────────────────────────────────────
export const STOCK_COLUMNS = [
  { key: "store", label: "Location", w: "100px" },
  { key: "item", label: "Item Name", w: "150px" },
  { key: "itemGroup", label: "Item Group", w: "100px" },
  { key: "size", label: "Size", w: "70px" },
  { key: "color", label: "Color", w: "90px" },
  { key: "gsm", label: "GSM", w: "40px" },
  { key: "uom", label: "UOM", w: "40px" },
  { key: "netQty", label: "Qty", w: "50px" },
  { key: "price", label: "Price", w: "60px" },
  { key: "totalValue", label: "Value", w: "80px" },
];

export const ORDERS_REPORT_COLUMNS = [
  { key: "orderNo", label: "Order No", w: "120px" },
  { key: "department", label: "Department", w: "130px" },
  { key: "employee", label: "Incharge / Employee", w: "140px" },
  { key: "docDate", label: "Date", w: "90px" },
  { key: "store", label: "Location", w: "110px" },
  { key: "itemGroup", label: "Item Group", w: "110px" },
  { key: "item", label: "Item Name", w: "150px" },
  { key: "size", label: "Size", w: "70px" },
  { key: "color", label: "Color", w: "90px" },
  { key: "uom", label: "UOM", w: "50px" },
  { key: "issuedQty", label: "Issued Qty", w: "90px" },
  { key: "returnedQty", label: "Returned Qty", w: "90px" },
  { key: "usedQty", label: "Used Qty", w: "90px" },
  { key: "price", label: "Rate (₹)", w: "80px" },
  { key: "usedValue", label: "Used Value (₹)", w: "110px" },
];

export const QTY_KEYS = ["netQty", "issuedQty", "returnedQty", "usedQty"];
export const VALUE_KEYS = ["netQty", "totalValue", "usedValue"];

// ── fmt2: fixed 2 decimal ─────────────────────────────────────────────────────
export function fmt2(val) {
  const n = typeof val === "number" ? val : parseFloat(val) || 0;
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── fmt3: fixed 3 decimal ─────────────────────────────────────────────────────
export function fmt3(val) {
  const n = typeof val === "number" ? val : parseFloat(val) || 0;
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function calcGroupTotals(rows) {
  let issuedQty = 0, returnedQty = 0, usedQty = 0, usedValue = 0;
  function rec(arr) {
    for (const r of arr) {
      if (r._group) {
        rec(r._children);
      } else {
        issuedQty += parseFloat(r.issuedQty) || 0;
        returnedQty += parseFloat(r.returnedQty) || 0;
        usedQty += parseFloat(r.usedQty) || 0;
        usedValue += parseFloat(r.usedValue) || 0;
      }
    }
  }
  rec(rows);
  return { issuedQty, returnedQty, usedQty, usedValue };
}

// ── buildGroups ───────────────────────────────────────────────────────────────
export function buildGroups(rows, groupKeys, groupDirs, depth = 0) {
  if (depth >= groupKeys.length) return rows;
  const key = groupKeys[depth];
  const dir = groupDirs[key] ?? 1;

  const buckets = {};
  for (const r of rows) {
    const val = String(r[key] ?? "");
    if (!buckets[val]) buckets[val] = [];
    buckets[val].push(r);
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b) * dir)
    .map(([val, children]) => {
      const groupedChildren = buildGroups(children, groupKeys, groupDirs, depth + 1);
      const totals = calcGroupTotals(groupedChildren);
      return {
        _group: true,
        _key: key,
        _val: val,
        _depth: depth,
        _count: children.length,
        _children: groupedChildren,
        ...totals,
      };
    });
}

