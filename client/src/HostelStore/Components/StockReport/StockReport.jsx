// ─────────────────────────────────────────────────────────────────────────────
//  StockReport.jsx
//  Same pattern as PurchaseReport.jsx:
//  groupBy drag-drop | column filters | sort | pagination | Excel | PDF print
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import { useGetStockReportQuery } from "../../../redux/services/StockService";
import ColumnFilterMenu from "./ColumnFilterMenu";
import XLSXStyle from "xlsx-js-style";
import mpLogo from "../../../assets/Iknitslogo.png";
import {
  STOCK_COLUMNS,
  QTY_KEYS,
  buildGroups,
  fmt3,
  fmt2,
} from "./stockReportUtils";
import { getCommonParams } from "../../../Utils/helper";

const PAGE_SIZE = 40;
const EXCEL_NUM_FMT = "#,##0.000";

export default function StockReport() {
  const { branchId } = getCommonParams();

  const [viewMode, setViewMode] = useState("qty"); // "qty" | "value"

  const queryParams = useMemo(
    () => ({
      branchId,
      isShowStockPriceWise: viewMode === "value",
    }),
    [branchId, viewMode],
  );

  const {
    data: apiData,
    isLoading,
    isFetching,
    isError,
  } = useGetStockReportQuery({ params: queryParams });

  const allData = useMemo(() => apiData?.data || [], [apiData]);

  const activeStockColumns = useMemo(() => {
    if (viewMode === "value") {
      return STOCK_COLUMNS;
    }
    return STOCK_COLUMNS.filter(
      (c) => c.key !== "price" && c.key !== "totalValue",
    );
  }, [viewMode]);

  const [colOrder, setColOrder] = useState(() =>
    activeStockColumns.map((c) => c.key),
  );

  React.useEffect(() => {
    setColOrder(activeStockColumns.map((c) => c.key));
  }, [activeStockColumns]);
  const [groupKeys, setGroupKeys] = useState([]);
  const [groupDirs, setGroupDirs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [colFilters, setColFilters] = useState({});
  const [openMenuCol, setOpenMenuCol] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [page, setPage] = useState(1);

  const dragColRef = useRef(null);
  const dragGbOver = useRef(false);

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // ── unique filter values ────────────────────────────────────────────────────
  const uniqueVals = useMemo(() => {
    const map = {};
    STOCK_COLUMNS.forEach(({ key }) => {
      map[key] = [...new Set(allData.map((r) => String(r[key] ?? "")))].sort();
    });
    return map;
  }, [allData]);

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allData.filter((r) => {
      for (const [k, allowed] of Object.entries(colFilters)) {
        if (!allowed) continue;
        if (!allowed.has(String(r[k] ?? ""))) return false;
      }
      return true;
    });
  }, [allData, colFilters]);

  // ── sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey],
        bv = b[sortKey];
      return (
        (typeof av === "string"
          ? av.localeCompare(bv)
          : (av || 0) - (bv || 0)) * sortDir
      );
    });
  }, [filtered, sortKey, sortDir]);

  // ── pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const tree = useMemo(
    () =>
      groupKeys.length
        ? buildGroups(paginated, groupKeys, groupDirs)
        : paginated,
    [paginated, groupKeys, groupDirs],
  );

  console.log(tree, "tree")

  // ── metrics ────────────────────────────────────────────────────────────────
  const metrics = useMemo(
    () => ({
      totalItems: filtered.length,
      totalNetQty: filtered.reduce(
        (s, r) => s + (parseFloat(r.netQty) || 0),
        0,
      ),
      totalValue: filtered.reduce(
        (s, r) => s + (parseFloat(r.totalValue) || 0),
        0,
      ),
    }),
    [filtered],
  );

  const visibleCols = useMemo(
    () =>
      colOrder
        .filter((k) => !groupKeys.includes(k))
        .map((k) => STOCK_COLUMNS.find((c) => c.key === k))
        .filter(Boolean),
    [colOrder, groupKeys],
  );

  // ─── handlers ──────────────────────────────────────────────────────────────
  function handleSort(k, dir) {
    setSortKey(k);
    setSortDir(dir);
    setPage(1);
  }
  function handleFilterApply(k, vs) {
    setColFilters((p) => {
      const n = { ...p };
      if (!vs) delete n[k];
      else n[k] = vs;
      return n;
    });
    setOpenMenuCol(null);
    setPage(1);
  }
  function removeFilterChip(k) {
    setColFilters((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
    setPage(1);
  }
  function toggleExpand(id) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  }
  function toggleGroup(gid) {
    setCollapsed((p) => ({ ...p, [gid]: !p[gid] }));
  }
  function removeGroupKey(k) {
    setGroupKeys((p) => p.filter((g) => g !== k));
    setGroupDirs((p) => {
      const n = { ...p };
      delete n[k];
      return n;
    });
  }
  function toggleGroupDir(k) {
    setGroupDirs((p) => ({ ...p, [k]: (p[k] || 1) * -1 }));
  }
  function onColDragStart(e, k) {
    dragColRef.current = k;
    e.dataTransfer.setData("col", k);
    e.dataTransfer.effectAllowed = "move";
  }
  function onGbDragOver(e) {
    e.preventDefault();
    dragGbOver.current = true;
  }
  function onGbDrop(e) {
    e.preventDefault();
    dragGbOver.current = false;
    const k = e.dataTransfer.getData("col") || dragColRef.current;
    if (!k || groupKeys.includes(k)) return;
    setGroupKeys((p) => [...p, k]);
    setGroupDirs((p) => ({ ...p, [k]: 1 }));
  }
  function onColDrop(e, tgtKey) {
    e.preventDefault();
    const srcKey = e.dataTransfer.getData("col") || dragColRef.current;
    if (!srcKey || srcKey === tgtKey) return;
    setColOrder((p) => {
      const a = [...p],
        si = a.indexOf(srcKey),
        ti = a.indexOf(tgtKey);
      if (si < 0 || ti < 0) return a;
      a.splice(si, 1);
      a.splice(ti, 0, srcKey);
      return a;
    });
  }

  // ─── cell renderer ─────────────────────────────────────────────────────────
  function renderCellValue(row, key) {
    if (key === "netQty") {
      return (
        <div className="text-xs text-right font-semibold text-green-700">
          {fmt3(row.netQty)}
        </div>
      );
    }
    if (key === "price") {
      return (
        <div className="text-xs text-right font-medium text-gray-700">
          {fmt2(row.price)}
        </div>
      );
    }
    if (key === "totalValue") {
      return (
        <div className="text-xs text-right font-semibold text-emerald-700">
          {fmt2(row.totalValue)}
        </div>
      );
    }
    return <span className="text-xs text-gray-600">{row[key] ?? "—"}</span>;
  }

  // ─── tree renderer ─────────────────────────────────────────────────────────
  let rowIndex = 0;
  const globalSnoStart = (safePage - 1) * PAGE_SIZE;

  function renderNode(node, vc) {
    if (node._group) {
      const gid = `${node._key}:${node._val}:${node._depth}`;
      const col = STOCK_COLUMNS.find((c) => c.key === node._key);

      function collectRows(n) {
        return n._group ? n._children.flatMap(collectRows) : [n];
      }
      const groupRows = collectRows(node);
      const activeSumKeys =
        viewMode === "value" ? ["netQty", "totalValue"] : ["netQty"];
      const qtyTotals = {};
      activeSumKeys.forEach((k) => {
        qtyTotals[k] = groupRows.reduce(
          (s, r) => s + (parseFloat(r[k]) || 0),
          0,
        );
      });

      return (
        <React.Fragment key={gid}>
          <tr className="bg-indigo-50 hover:bg-indigo-100">
            <td className="px-2 py-1.5 border-r border-b border-gray-200 w-10 text-center text-xs text-gray-400" />

            <td
              colSpan={vc.length}
              className="px-3 py-2 text-xs font-medium text-indigo-700 border-b border-gray-200"
              style={{ paddingLeft: `${node._depth * 18 + 12}px` }}
            >
              <button
                onClick={() => toggleGroup(gid)}
                className="mr-2 text-indigo-500 hover:text-indigo-700"
              >
                {collapsed[gid] ? "▶" : "▼"}
              </button>
              {col?.label || node._key}:{" "}
              <strong>{node._val || "(blank)"}</strong>
              <span className="ml-2 text-indigo-400 font-normal">
                — {node._count} item{node._count !== 1 ? "s" : ""}
              </span>
              <span className="ml-3 inline-flex flex-wrap gap-2">
                {activeSumKeys
                  .filter((k) => qtyTotals[k] !== 0)
                  .map((k) => {
                    const isNetQty = k === "netQty";
                    const label =
                      STOCK_COLUMNS.find((c) => c.key === k)?.label || k;
                    const isNeg = qtyTotals[k] < 0;
                    const displayVal = isNetQty
                      ? fmt3(qtyTotals[k])
                      : `₹ ${fmt2(qtyTotals[k])}`;
                    return (
                      <span
                        key={k}
                        className={`border rounded-full px-2 py-0.5 text-[10px] font-medium ${isNetQty
                          ? isNeg
                            ? "bg-red-50 border-red-200 text-red-600"
                            : "bg-green-50 border-green-200 text-green-600"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                      >
                        {label}: {displayVal}
                      </span>
                    );
                  })}
              </span>
            </td>
          </tr>
          {!collapsed[gid] &&
            node._children.map((child) => renderNode(child, vc))}
        </React.Fragment>
      );
    }

    const r = node;
    const stripe = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50";
    const isNegNet = r.netQty < 0;
    const sno = globalSnoStart + rowIndex + 1;
    rowIndex++;

    return (
      <React.Fragment key={r.id}>
        <tr className={`${stripe} hover:bg-indigo-50 transition-colors`}>
          <td className=" py-0.5  text-center border-r border-b border-gray-100 text-xs text-gray-400 select-none">
            {sno}
          </td>

          {vc.map((col) => (
            <td
              key={col.key}
              className={`px-2.5 py-0.5 whitespace-nowrap border-r border-b border-gray-100 last:border-r-0
                ${QTY_KEYS.includes(col.key) ? "col-qty" : ""}`}
            >
              {renderCellValue(r, col.key)}
            </td>
          ))}
        </tr>
      </React.Fragment>
    );
  }

  // ─── Excel export ───────────────────────────────────────────────────────────
  function exportExcel() {
    const keys = colOrder;
    const labels = keys.map(
      (k) => STOCK_COLUMNS.find((c) => c.key === k)?.label || k,
    );

    const BORDER = {
      top: { style: "thin", color: { rgb: "E5E7EB" } },
      bottom: { style: "thin", color: { rgb: "E5E7EB" } },
      left: { style: "thin", color: { rgb: "E5E7EB" } },
      right: { style: "thin", color: { rgb: "E5E7EB" } },
    };

    function cell(value, opts = {}) {
      const {
        bold = false,
        fontColor = "1F2937",
        fgColor = null,
        align = "left",
        fontSize = 9,
        indent = 1,
        numFmt = null,
      } = opts;
      const fill = fgColor
        ? { fgColor: { rgb: fgColor }, patternType: "solid" }
        : { patternType: "none" };
      const c = {
        v: value ?? "",
        t: typeof value === "number" ? "n" : "s",
        s: {
          font: {
            bold,
            color: { rgb: fontColor },
            sz: fontSize,
            name: "Arial",
          },
          fill,
          alignment: {
            horizontal: align,
            vertical: "center",
            indent,
            wrapText: false,
          },
          border: BORDER,
        },
      };
      if (numFmt) c.z = numFmt;
      return c;
    }

    function qtyCell(k, val, bg = null) {
      const numVal = typeof val === "number" ? val : parseFloat(val) || 0;
      const isVal = k === "totalValue" || k === "price";
      return cell(numVal, {
        fontColor: k === "totalValue" ? "047857" : "15803D",
        bold: true,
        align: "right",
        indent: 0,
        numFmt: isVal ? "#,##0.00" : EXCEL_NUM_FMT,
        fgColor: bg,
      });
    }

    const allKeys = ["sno", ...keys];
    const allLabels = ["S.No", ...labels];
    const allSheetRows = [];
    const GROUP_BG = ["F6F6F6", "F0F0F0", "EBEBEB", "E5E5E5"];
    let dataRowCount = 0;

    function flattenNode(node, depth) {
      if (node._group) {
        const col = STOCK_COLUMNS.find((c) => c.key === node._key);
        function collectRows(n) {
          return n._group ? n._children.flatMap(collectRows) : [n];
        }
        const gRows = collectRows(node);
        const activeSumKeys =
          viewMode === "value" ? ["netQty", "totalValue"] : ["netQty"];
        const qtyTotals = {};
        activeSumKeys.forEach((k) => {
          qtyTotals[k] = gRows.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0);
        });
        const qtyStr = activeSumKeys
          .filter((k) => qtyTotals[k] !== 0)
          .map((k) => {
            const lbl = STOCK_COLUMNS.find((c) => c.key === k)?.label || k;
            const val =
              k === "totalValue"
                ? Number(qtyTotals[k]).toFixed(2)
                : Number(qtyTotals[k]).toFixed(3);
            return `${lbl}: ${val}`;
          })
          .join("  |  ");
        const label = `${col?.label || node._key}: ${node._val || "(blank)"}  —  ${node._count} item${node._count !== 1 ? "s" : ""}${qtyStr ? "  |  " + qtyStr : ""}`;
        const bg = GROUP_BG[depth] || "F6F6F6";
        const fs = depth === 0 ? 10 : 9;
        const labelColIndex = depth + 1;
        const groupRow = allKeys.map((_, ci) =>
          cell(ci === labelColIndex ? label : "", {
            fontColor: "1F2937",
            fgColor: bg,
            align: "left",
            fontSize: fs,
            indent: 1,
          }),
        );
        allSheetRows.push({ cells: groupRow, isGroup: true, depth: depth + 1 });
        node._children.forEach((child) => flattenNode(child, depth + 1));
      } else {
        const r = node;
        dataRowCount++;
        const isNegNet = r.netQty < 0;
        const isOdd = dataRowCount % 2 === 1;
        const bg = isNegNet ? "FFF5F5" : isOdd ? "FFFFFF" : "F9FAFB";

        const dataRow = allKeys.map((k) => {
          if (k === "sno")
            return cell(dataRowCount, {
              fontColor: "9CA3AF",
              align: "center",
              indent: 0,
              fgColor: bg,
            });
          if (QTY_KEYS.includes(k) || k === "price" || k === "totalValue")
            return qtyCell(k, r[k], bg);
          return cell(String(r[k] ?? ""), { fgColor: bg, fontColor: "1F2937" });
        });
        allSheetRows.push({ cells: dataRow, isGroup: false, depth: 0 });
      }
    }

    if (groupKeys.length > 0) {
      buildGroups(sorted, groupKeys, groupDirs).forEach((n) =>
        flattenNode(n, 0),
      );
    } else {
      sorted.forEach((r) => flattenNode(r, 0));
    }

    const headerRow = allLabels.map((label, i) =>
      cell(label, {
        bold: true,
        fgColor: "F3F4F6",
        fontColor: "000000",
        align:
          QTY_KEYS.includes(allKeys[i]) ||
            allKeys[i] === "price" ||
            allKeys[i] === "totalValue" ||
            allKeys[i] === "sno"
            ? "center"
            : "left",
        fontSize: 10,
        indent: 1,
      }),
    );

    const wsData = [headerRow, ...allSheetRows.map((r) => r.cells)];
    const ws = XLSXStyle.utils.aoa_to_sheet(
      wsData.map((row) => row.map((c) => c.v)),
    );
    wsData.forEach((row, ri) => {
      row.forEach((c, ci) => {
        const addr = XLSXStyle.utils.encode_cell({ r: ri, c: ci });
        ws[addr] = { ...(ws[addr] || {}), ...c };
        if (c.z) ws[addr].z = c.z;
      });
    });

    const merges = [];
    allSheetRows.forEach((row, i) => {
      if (row.isGroup) {
        merges.push({
          s: { r: i + 1, c: row.depth },
          e: { r: i + 1, c: allKeys.length - 1 },
        });
      }
    });
    if (merges.length > 0) ws["!merges"] = merges;

    const COL_WIDTHS = {
      sno: 6,
      store: 25,
      item: 35,
      itemGroup: 25,
      size: 20,
      color: 20,
      gsm: 12,
      uom: 15,
      netQty: 14,
      price: 14,
      totalValue: 16,
    };
    ws["!cols"] = allKeys.map((k) => ({ wch: COL_WIDTHS[k] || 14 }));
    ws["!rows"] = [
      { hpt: 24 },
      ...allSheetRows.map((r) => ({ hpt: r.isGroup ? 18 : 17 })),
    ];
    ws["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: "A2",
      activePane: "bottomLeft",
    };

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, "Stock Report");
    const today = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");
    XLSXStyle.writeFile(wb, `Stock_Report_${today}.xlsx`);
  }

  // ─── loading / error ────────────────────────────────────────────────────────
  if (isLoading || isFetching)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading stock report…
      </div>
    );
  if (isError)
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Failed to load report. Please try again.
      </div>
    );

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .stock-report-print, .stock-report-print * { visibility: visible !important; }
          .stock-report-print { position: absolute; top: 0; left: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .print-header { display: flex !important; }
          .purchase-report-table {
            overflow: visible !important; height: auto !important;
            max-height: none !important; border: none !important;
          }
          .col-expand { display: none !important; width: 0 !important; min-width: 0 !important; max-width: 0 !important; padding: 0 !important; overflow: hidden !important; }
          thead button { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: auto !important; font-size: 8pt; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { border: 1px solid #374151 !important; padding: 3px 5px !important; white-space: normal !important; word-break: break-word !important; }
          th { background-color: #F3F4F6 !important; color: #000000 !important; outline: 1px solid #374151 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr.row-negnet td { background-color: #FFF5F5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          td.col-qty { text-align: right !important; }
          @page { size: A4 landscape; margin: 8mm 10mm; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      <div
        className="p-4 space-y-3 stock-report-print overflow-y-auto"
        style={{ height: "90vh" }}
      >
        {/* top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white py-1.5 px-3 rounded-xl border border-gray-100 shadow-sm no-print">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-800">
              Stock Report
            </h2>

            {/* Qty Wise vs Value Wise Toggle Switch */}
            <div className="inline-flex p-0.5 bg-gray-100 rounded-lg border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setViewMode("qty");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1.5 ${viewMode === "qty"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                  }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                Qty Wise
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("value");
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-all duration-200 flex items-center gap-1.5 ${viewMode === "value"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                  }`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Value Wise
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="h-8 px-3 text-xs font-medium border border-emerald-300 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel
            </button>
            <button
              onClick={() => {
                const today = new Date()
                  .toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  .replace(/\//g, "-");
                const prev = document.title;
                document.title = `StockReport_${today}`;
                window.print();
                document.title = prev;
              }}
              className="h-8 px-3 text-xs font-medium border border-rose-300 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print PDF
            </button>
          </div>
        </div>

        {/* print header */}
        <div
          className="print-header items-center justify-between mb-3 pb-2"
          style={{ borderBottom: "2px solid #1E3A5F" }}
        >
          <img
            src={mpLogo}
            alt="Muthu Printers"
            style={{ height: "52px", objectFit: "contain" }}
          />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                fontSize: "16pt",
                fontWeight: "800",
                letterSpacing: "0.1em",
                color: "#1E3A5F",
              }}
            >
              STOCK REPORT
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: "120px" }}>
            <div
              style={{ fontSize: "10pt", fontWeight: "700", color: "#111827" }}
            >
              {todayStr}
            </div>
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
          {[
            {
              label: "Total Items",
              val: metrics.totalItems,
              color: "text-gray-700",
              bg: "bg-gray-100",
              icon: (
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              ),
            },
            {
              label: "Total Net Qty",
              val: fmt3(metrics.totalNetQty),
              color: "text-indigo-700",
              bg: "bg-indigo-50",
              icon: (
                <>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path d="M3.3 7l8.7 5 8.7-5M12 22V12" />
                </>
              ),
            },
            ...(viewMode === "value"
              ? [
                {
                  label: "Total Stock Value",
                  val: `₹ ${fmt2(metrics.totalValue)}`,
                  color: "text-emerald-700",
                  bg: "bg-emerald-50",
                  icon: (
                    <>
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </>
                  ),
                },
              ]
              : []),
          ].map((m) => (
            <div
              key={m.label}
              className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${m.bg} ${m.color}`}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {m.icon}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 leading-tight truncate">
                  {m.label}
                </p>
                <p
                  className={`text-lg font-semibold leading-tight mt-0.5 ${m.color}`}
                >
                  {m.val}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* active filter chips */}
        {Object.keys(colFilters).length > 0 && (
          <div className="flex gap-2 flex-wrap no-print">
            {Object.entries(colFilters).map(([k, vals]) => {
              const col = STOCK_COLUMNS.find((c) => c.key === k);
              const allV = uniqueVals[k] || [];
              const summary =
                vals.size === 1
                  ? [...vals][0]
                  : `${vals.size} of ${allV.length} selected`;
              return (
                <span
                  key={k}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs"
                >
                  {col?.label}: <strong>{summary}</strong>
                  <button
                    onClick={() => removeFilterChip(k)}
                    className="text-blue-400 hover:text-blue-700 text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* group-by bar */}
        <div
          className="min-h-10 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl flex items-center px-3 py-2 gap-2 flex-wrap no-print"
          onDragOver={onGbDragOver}
          onDrop={onGbDrop}
          onDragLeave={() => {
            dragGbOver.current = false;
          }}
        >
          {groupKeys.length === 0 ? (
            <span className="text-xs text-indigo-400">
              Drag a column header here to group by that column
            </span>
          ) : (
            groupKeys.map((k) => {
              const col = STOCK_COLUMNS.find((c) => c.key === k);
              return (
                <span
                  key={k}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-full px-3 py-1 text-xs font-medium"
                >
                  {col?.label}
                  <button
                    onClick={() => toggleGroupDir(k)}
                    className="opacity-80 hover:opacity-100"
                  >
                    {groupDirs[k] === 1 ? "↑" : "↓"}
                  </button>
                  <button
                    onClick={() => removeGroupKey(k)}
                    className="opacity-80 hover:opacity-100 text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* TABLE */}
        <div
          className="border border-gray-400 rounded-xl overflow-auto purchase-report-table"
          style={{ height: "60vh" }}
        >
          <table
            className="w-full table-fixed border-collapse"
            style={{ width: viewMode === "value" ? "1700px" : "1550px" }}
          >
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th
                  style={{ width: "20px", minWidth: "20px" }}
                  className="px-2 py-2.5 text-center text-xs font-medium text-black border-r border-b border-gray-200 select-none"
                >
                  S.No
                </th>

                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={(e) => onColDragStart(e, col.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onColDrop(e, col.key)}
                    style={{ width: col.w, minWidth: col.w }}
                    className="px-2.5 py-2.5 text-center text-xs font-medium text-black whitespace-nowrap cursor-grab select-none relative border-r border-b border-gray-200 last:border-r-0"
                  >
                    <div className="flex items-center gap-1">
                      <span className="flex-1">
                        {col.label}
                        {sortKey === col.key && (
                          <span className="text-indigo-500 ml-1">
                            {sortDir === 1 ? "↑" : "↓"}
                          </span>
                        )}
                        {colFilters[col.key] && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 align-middle" />
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuCol(
                            openMenuCol === col.key ? null : col.key,
                          );
                        }}
                        className={`text-[11px] px-0.5 rounded hover:bg-blue-100 hover:text-blue-600 ${colFilters[col.key] ? "text-indigo-500" : "text-gray-400"}`}
                      >
                        ⇅
                      </button>
                    </div>
                    {openMenuCol === col.key && (
                      <ColumnFilterMenu
                        colKey={col.key}
                        allValues={uniqueVals[col.key] || []}
                        activeFilter={colFilters[col.key]}
                        onApply={handleFilterApply}
                        onSort={handleSort}
                        onClose={() => setOpenMenuCol(null)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tree.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length + 1}
                    className="text-center py-10 text-sm text-gray-400"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                (() => {
                  rowIndex = 0;
                  return tree.map((node) => renderNode(node, visibleCols));
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* pagination + footer */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-gray-600 no-print">
          <span>
            Showing {sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}{" "}
            records
            {filtered.length < allData.length &&
              ` (filtered from ${allData.length})`}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-gray-500 text-xs"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-gray-500 text-xs"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
                )
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-1 text-gray-300">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-7 min-w-[28px] px-1.5 rounded-lg border text-xs font-medium transition-colors ${p === safePage ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-gray-500 text-xs"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-gray-500 text-xs"
              >
                »
              </button>
            </div>
          )}


        </div>
      </div>
    </>
  );
}
