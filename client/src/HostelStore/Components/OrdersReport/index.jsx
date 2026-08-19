// ─────────────────────────────────────────────────────────────────────────────
//  OrdersReport/index.jsx
//  Orders Used Material Quantity & Value Report
//  Includes Drag-Drop Grouping | Department & Employee Filters | Excel & Print
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState } from "react";
import { useGetOrdersReportQuery } from "../../../redux/services/StockService";
import { useGetOrderMasterQuery } from "../../../redux/services/OrderMasterService";
import { useGetDepartmentQuery } from "../../../redux/services/DepartmentMasterService";
import { useGetEmployeeQuery } from "../../../redux/services/EmployeeMasterService";
import SearchableTableCellSelect from "../ReusableComponents/SearchableTableCellSelect";
import ColumnFilterMenu from "./ColumnFilterMenu";
import { getCommonParams } from "../../../Utils/helper";
import XLSXStyle from "xlsx-js-style";
import mpLogo from "../../../assets/Iknitslogo.png";
import {
  ORDERS_REPORT_COLUMNS,
  buildGroups,
  fmt2,
  fmt3,
} from "./stockReportUtils";
import {
  FiSearch,
  FiRefreshCw,
  FiPrinter,
  FiDownload,
  FiBox,
  FiDollarSign,
  FiLayers,
  FiFileText,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiFilter,
  FiMove,
  FiXCircle,
} from "react-icons/fi";

const PAGE_SIZE = 50;

export default function OrdersReport() {
  const { branchId } = getCommonParams();

  // Filters
  const [orderId, setOrderId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");



  const handleClearFilters = () => {
    setOrderId("");
    setDepartmentId("");
    setEmployeeId("");
    setFromDate("");
    setToDate("");
    setColFilters({});
    setGroupKeys([]);
    setGroupDirs({});
    setSortKey(null);
    setPage(1);
  };

  // Queries
  const queryParams = useMemo(
    () => ({
      branchId,
      orderId,
      departmentId,
      employeeId,
      fromDate,
      toDate,
    }),
    [branchId, orderId, departmentId, employeeId, fromDate, toDate]
  );

  const {
    data: apiData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetOrdersReportQuery({ params: queryParams });

  const { data: orderData } = useGetOrderMasterQuery({ params: { branchId } });
  const { data: departmentData } = useGetDepartmentQuery({});
  const { data: employeeData } = useGetEmployeeQuery({});

  const allData = useMemo(() => apiData?.data || [], [apiData]);

  // Options
  const orderOptions = useMemo(
    () =>
      (orderData?.data || []).map((item) => ({
        value: item.id,
        label: item?.docId || "",
      })),
    [orderData]
  );

  const departmentOptions = useMemo(
    () =>
      (departmentData?.data || []).map((item) => ({
        value: item.id,
        label: item?.name || "",
      })),
    [departmentData]
  );

  const employeeOptions = useMemo(
    () =>
      (employeeData?.data || []).map((item) => ({
        value: item.id,
        label: item?.name || "",
      })),
    [employeeData]
  );

  // Drag-Drop Grouping & Dynamic Column Management
  const [colOrder, setColOrder] = useState(() =>
    ORDERS_REPORT_COLUMNS.map((c) => c.key)
  );
  const [groupKeys, setGroupKeys] = useState([]);
  const [groupDirs, setGroupDirs] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [colFilters, setColFilters] = useState({});
  const [openMenuCol, setOpenMenuCol] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(1);

  const isAnyFilterActive = useMemo(() => {
    return (
      Boolean(orderId) ||
      Boolean(departmentId) ||
      Boolean(employeeId) ||
      Boolean(fromDate) ||
      Boolean(toDate) ||
      Object.keys(colFilters).length > 0 ||
      groupKeys.length > 0
    );
  }, [orderId, departmentId, employeeId, fromDate, toDate, colFilters, groupKeys]);

  const dragColRef = useRef(null);
  const dragGbOver = useRef(false);

  // Column Unique Values for Filter Dropdown
  const uniqueVals = useMemo(() => {
    const map = {};
    ORDERS_REPORT_COLUMNS.forEach(({ key }) => {
      map[key] = [...new Set(allData.map((r) => String(r[key] ?? "")))].sort();
    });
    return map;
  }, [allData]);

  // Column Filtering
  const filtered = useMemo(() => {
    return allData.filter((r) => {
      for (const [k, allowed] of Object.entries(colFilters)) {
        if (!allowed) continue;
        if (!allowed.has(String(r[k] ?? ""))) return false;
      }
      return true;
    });
  }, [allData, colFilters]);

  // Sorting
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return (
        (typeof av === "string"
          ? av.localeCompare(bv)
          : (parseFloat(av) || 0) - (parseFloat(bv) || 0)) * sortDir
      );
    });
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Multi-level Tree Building
  const tree = useMemo(
    () =>
      groupKeys.length
        ? buildGroups(paginated, groupKeys, groupDirs)
        : paginated,
    [paginated, groupKeys, groupDirs]
  );

  // Metrics
  const summary = useMemo(() => {
    return {
      totalRecords: filtered.length,
      totalOrders: new Set(filtered.map((d) => d.orderNo)).size,
      totalIssuedQty: filtered.reduce(
        (s, r) => s + (parseFloat(r.issuedQty) || 0),
        0
      ),
      totalReturnedQty: filtered.reduce(
        (s, r) => s + (parseFloat(r.returnedQty) || 0),
        0
      ),
      overallUsedQty: filtered.reduce(
        (s, r) => s + (parseFloat(r.usedQty) || 0),
        0
      ),
      overallUsedValue: filtered.reduce(
        (s, r) => s + (parseFloat(r.usedValue) || 0),
        0
      ),
    };
  }, [filtered]);

  const visibleCols = useMemo(
    () =>
      colOrder
        .filter((k) => !groupKeys.includes(k))
        .map((k) => ORDERS_REPORT_COLUMNS.find((c) => c.key === k))
        .filter(Boolean),
    [colOrder, groupKeys]
  );

  // Drag & Drop Handlers
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
  }

  function onColDragOver(e) {
    e.preventDefault();
  }

  function onColDrop(e, targetKey) {
    e.preventDefault();
    const srcKey = dragColRef.current || e.dataTransfer.getData("col");
    if (!srcKey || srcKey === targetKey) return;
    setColOrder((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(srcKey);
      const toIdx = arr.indexOf(targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, srcKey);
      return arr;
    });
  }

  function onGbDragOver(e) {
    e.preventDefault();
    dragGbOver.current = true;
  }

  function onGbDrop(e) {
    e.preventDefault();
    dragGbOver.current = false;
    const k = dragColRef.current || e.dataTransfer.getData("col");
    if (!k || groupKeys.includes(k)) return;
    setGroupKeys((p) => [...p, k]);
    setGroupDirs((p) => ({ ...p, [k]: 1 }));
  }

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!filtered || filtered.length === 0) return;

    const cell = (val, opts = {}) => ({
      v: val,
      t: typeof val === "number" ? "n" : "s",
      s: {
        font: {
          name: "Calibri",
          sz: opts.fontSize || 9,
          bold: Boolean(opts.bold),
          color: { rgb: opts.fontColor || "000000" },
        },
        fill: opts.fgColor ? { fgColor: { rgb: opts.fgColor } } : undefined,
        alignment: {
          horizontal: opts.align || "left",
          vertical: "center",
        },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } },
        },
      },
    });

    const allKeys = ORDERS_REPORT_COLUMNS.map((c) => c.key);
    const allLabels = ["S.No", ...ORDERS_REPORT_COLUMNS.map((c) => c.label)];

    const headerRow = allLabels.map((label, i) =>
      cell(label, {
        bold: true,
        fgColor: "F3F4F6",
        fontColor: "1F2937",
        align:
          i > 9 || allKeys[i - 1] === "price" || allKeys[i - 1] === "usedValue"
            ? "right"
            : "left",
        fontSize: 10,
      })
    );

    const sheetRows = [];

    function exportRec(nodes, depth = 0) {
      for (const node of nodes) {
        if (node._group) {
          const colDef = ORDERS_REPORT_COLUMNS.find((c) => c.key === node._key);
          const gLabel = `${colDef?.label || node._key}: ${node._val} (${node._count} items)`;

          const gCells = [
            cell(gLabel, { bold: true, fgColor: "E0E7FF", fontColor: "3730A3" }),
          ];
          for (let i = 1; i < allLabels.length; i++) {
            const keyName = allKeys[i - 1];
            if (["issuedQty", "returnedQty", "usedQty"].includes(keyName)) {
              gCells.push(
                cell(node[keyName] || 0, {
                  bold: true,
                  fgColor: "E0E7FF",
                  fontColor: "3730A3",
                  align: "right",
                })
              );
            } else if (keyName === "usedValue") {
              gCells.push(
                cell(node.usedValue || 0, {
                  bold: true,
                  fgColor: "E0E7FF",
                  fontColor: "3730A3",
                  align: "right",
                })
              );
            } else {
              gCells.push(cell("", { fgColor: "E0E7FF" }));
            }
          }
          sheetRows.push({ cells: gCells, isGroup: true });
          exportRec(node._children, depth + 1);
        } else {
          const rowCells = [
            cell(sheetRows.length + 1, { align: "center" }),
            cell(node.orderNo || "—"),
            cell(node.department || "—"),
            cell(node.employee || "—"),
            cell(node.docDate || "—"),
            cell(node.store || "—"),
            cell(node.itemGroup || "—"),
            cell(node.item || "—"),
            cell(node.size || "—"),
            cell(node.color || "—"),
            cell(node.uom || "—", { align: "center" }),
            cell(node.issuedQty || 0, { align: "right" }),
            cell(node.returnedQty || 0, { align: "right" }),
            cell(node.usedQty || 0, { align: "right", bold: true, fontColor: "4338CA" }),
            cell(node.price || 0, { align: "right" }),
            cell(node.usedValue || 0, { align: "right", bold: true, fontColor: "047857" }),
          ];
          sheetRows.push({ cells: rowCells, isGroup: false });
        }
      }
    }

    if (groupKeys.length > 0) {
      exportRec(tree);
    } else {
      filtered.forEach((r, idx) => {
        sheetRows.push({
          cells: [
            cell(idx + 1, { align: "center" }),
            cell(r.orderNo || "—"),
            cell(r.department || "—"),
            cell(r.employee || "—"),
            cell(r.docDate || "—"),
            cell(r.store || "—"),
            cell(r.itemGroup || "—"),
            cell(r.item || "—"),
            cell(r.size || "—"),
            cell(r.color || "—"),
            cell(r.uom || "—", { align: "center" }),
            cell(r.issuedQty || 0, { align: "right" }),
            cell(r.returnedQty || 0, { align: "right" }),
            cell(r.usedQty || 0, { align: "right", bold: true, fontColor: "4338CA" }),
            cell(r.price || 0, { align: "right" }),
            cell(r.usedValue || 0, { align: "right", bold: true, fontColor: "047857" }),
          ],
          isGroup: false,
        });
      });
    }

    const totalsCells = [
      cell("", { bold: true, fgColor: "F3F4F6" }),
      cell("TOTALS", { bold: true, fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell("", { fgColor: "F3F4F6" }),
      cell(summary.totalIssuedQty || 0, { bold: true, fgColor: "F3F4F6", align: "right" }),
      cell(summary.totalReturnedQty || 0, { bold: true, fgColor: "F3F4F6", align: "right" }),
      cell(summary.overallUsedQty || 0, { bold: true, fgColor: "E0E7FF", fontColor: "3730A3", align: "right" }),
      cell("", { fgColor: "F3F4F6" }),
      cell(summary.overallUsedValue || 0, { bold: true, fgColor: "D1FAE5", fontColor: "065F46", align: "right" }),
    ];
    sheetRows.push({ cells: totalsCells, isGroup: true });

    const wsData = [headerRow, ...sheetRows.map((r) => r.cells)];
    const ws = XLSXStyle.utils.aoa_to_sheet(
      wsData.map((row) => row.map((c) => c.v))
    );

    wsData.forEach((row, ri) => {
      row.forEach((c, ci) => {
        const addr = XLSXStyle.utils.encode_cell({ r: ri, c: ci });
        ws[addr] = { ...(ws[addr] || {}), ...c };
      });
    });

    const colWidths = [
      { wch: 6 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
    ];
    ws["!cols"] = colWidths;

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, "Orders Material Usage Report");
    const today = new Date().toLocaleDateString("en-IN").replace(/\//g, "-");
    XLSXStyle.writeFile(wb, `Orders_Used_Material_Report_${today}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Group Tree Renderer
  function renderTreeNodes(nodes, path = "") {
    return nodes.map((node, idx) => {
      const nodeKey = `${path}-${node._key}-${node._val}-${idx}`;

      if (node._group) {
        const isCol = collapsed[nodeKey];
        const colDef = ORDERS_REPORT_COLUMNS.find((c) => c.key === node._key);

        return (
          <React.Fragment key={nodeKey}>
            <tr className="bg-indigo-50/70 border-b border-indigo-200 font-semibold text-indigo-950">
              <td
                colSpan={visibleCols.length + 1}
                className="py-2 px-3 select-none"
                style={{ paddingLeft: `${node._depth * 20 + 12}px` }}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleGroup(nodeKey)}
                    className="flex items-center gap-2 hover:text-indigo-600 focus:outline-none"
                  >
                    {isCol ? (
                      <FiChevronRight className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <FiChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                    <span className="font-bold text-xs uppercase tracking-wider text-indigo-800">
                      {colDef?.label || node._key}:
                    </span>
                    <span className="text-xs font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {node._val || "—"}
                    </span>
                    <span className="text-[11px] font-normal text-indigo-600 bg-indigo-100/80 px-1.5 py-0.5 rounded-full">
                      {node._count} items
                    </span>
                  </button>

                  <div className="flex items-center gap-4 text-xs font-mono pr-4">
                    <span>
                      Used Qty:{" "}
                      <strong className="text-indigo-800">
                        {fmt3(node.usedQty)}
                      </strong>
                    </span>
                    <span>
                      Used Value:{" "}
                      <strong className="text-emerald-700">
                        ₹ {fmt2(node.usedValue)}
                      </strong>
                    </span>
                  </div>
                </div>
              </td>
            </tr>
            {!isCol && renderTreeNodes(node._children, nodeKey)}
          </React.Fragment>
        );
      }

      return (
        <tr
          key={node.id || idx}
          className="hover:bg-gray-50/90 transition border-b border-gray-100 text-xs"
        >
          <td className="py-2 px-3 text-center text-gray-400 font-mono">
            {(safePage - 1) * PAGE_SIZE + idx + 1}
          </td>
          {visibleCols.map((c) => {
            const val = node[c.key];
            if (c.key === "orderNo") {
              return (
                <td key={c.key} className="py-2 px-3 font-bold text-indigo-600">
                  {val}
                </td>
              );
            }
            if (c.key === "usedQty") {
              return (
                <td
                  key={c.key}
                  className="py-2 px-3 text-right font-bold text-indigo-700 bg-indigo-50/40 font-mono"
                >
                  {fmt3(val)}
                </td>
              );
            }
            if (c.key === "usedValue") {
              return (
                <td
                  key={c.key}
                  className="py-2 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40 font-mono"
                >
                  ₹ {fmt2(val)}
                </td>
              );
            }
            if (c.key === "issuedQty" || c.key === "returnedQty") {
              return (
                <td key={c.key} className="py-2 px-3 text-right font-mono text-gray-600">
                  {fmt3(val)}
                </td>
              );
            }
            if (c.key === "price") {
              return (
                <td key={c.key} className="py-2 px-3 text-right font-mono text-gray-600">
                  ₹ {fmt2(val)}
                </td>
              );
            }
            return (
              <td key={c.key} className="py-2 px-3 text-gray-700">
                {val ?? "—"}
              </td>
            );
          })}
        </tr>
      );
    });
  }

  // Loading & Error States
  if (isLoading || isFetching)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-indigo-600 text-sm gap-2">
        <FiRefreshCw className="w-6 h-6 animate-spin" />
        <span>Loading orders material report…</span>
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500 text-sm gap-2">
        <span>Failed to load report. Please try again.</span>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-xs font-medium flex items-center gap-1"
        >
          <FiRefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .orders-report-print, .orders-report-print * { visibility: visible !important; }
          .orders-report-print { position: absolute; top: 0; left: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .print-header { display: flex !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 8pt; }
          th, td { border: 1px solid #374151 !important; padding: 4px 6px !important; }
          th { background-color: #F3F4F6 !important; color: #000000 !important; }
          @page { size: A4 landscape; margin: 8mm 10mm; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      <div
        className="p-4 space-y-3.5 orders-report-print overflow-y-auto"
        style={{ height: "90vh" }}
      >
        {/* Printable Header */}
        <div className="print-header flex items-center justify-between border-b pb-3 mb-3">
          <div className="flex items-center gap-3">
            <img src={mpLogo} alt="Logo" className="h-10 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Orders Material Usage Report
              </h1>
              <p className="text-xs text-gray-500">
                Department-wise, Employee-wise & Order-wise Used Material Breakdown
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Date: {new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        {/* Top Header Controls Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm no-print">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FiFileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Orders Material Usage Report
              </h2>
              <p className="text-xs text-gray-500">
                Find overall used material quantity and value with dynamic drag & drop grouping
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Order No Filter */}
            <div className="min-w-[150px]">
              <SearchableTableCellSelect
                name="Order No"
                options={orderOptions}
                value={orderId}
                setValue={(val) => {
                  setOrderId(val);
                  setPage(1);
                }}
                className="w-[150px]"
              />
            </div>

            {/* Department Wise Filter */}
            <div className="min-w-[150px]">
              <SearchableTableCellSelect
                name="Department"
                options={departmentOptions}
                value={departmentId}
                setValue={(val) => {
                  setDepartmentId(val);
                  setPage(1);
                }}
                className="w-[150px]"
              />
            </div>

            {/* Employee Wise Filter */}
            <div className="min-w-[160px]">
              <SearchableTableCellSelect
                name="Incharge / Employee"
                options={employeeOptions}
                value={employeeId}
                setValue={(val) => {
                  setEmployeeId(val);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>

            {/* Action Buttons */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                title="Clear All Filters"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition shadow-xs"
              >
                <FiXCircle className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}

            <button
              onClick={() => refetch()}
              title="Refresh Data"
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
            >
              <FiDownload className="w-3.5 h-3.5" /> Excel
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm transition"
            >
              <FiPrinter className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Drag and Drop Group-By Zone */}
        <div
          onDragOver={onGbDragOver}
          onDrop={onGbDrop}
          className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 p-2.5 rounded-xl flex items-center flex-wrap gap-2 text-xs no-print transition hover:bg-indigo-50"
        >
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold pr-2 border-r border-indigo-200">
            <FiMove className="w-4 h-4" />
            <span>Drag Column Here to Group:</span>
          </div>

          {groupKeys.length === 0 ? (
            <span className="text-gray-400 italic text-[11px]">
              Drag any table column header here (e.g. Order No, Department, Employee, Item Group) to group records
            </span>
          ) : (
            groupKeys.map((gk) => {
              const colDef = ORDERS_REPORT_COLUMNS.find((c) => c.key === gk);
              const dir = groupDirs[gk] || 1;
              return (
                <div
                  key={gk}
                  className="flex items-center gap-1.5 bg-white border border-indigo-300 text-indigo-900 px-2.5 py-1 rounded-lg shadow-xs font-medium"
                >
                  <span>{colDef?.label || gk}</span>
                  <button
                    type="button"
                    onClick={() => toggleGroupDir(gk)}
                    className="text-indigo-600 hover:text-indigo-900 text-[10px] font-bold px-1 rounded hover:bg-indigo-100"
                    title="Toggle Sort Direction"
                  >
                    {dir === 1 ? "▲ A-Z" : "▼ Z-A"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroupKey(gk)}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Remove Grouping"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Applied Filter Chips */}
        {Object.keys(colFilters).length > 0 && (
          <div className="flex items-center flex-wrap gap-2 text-xs no-print">
            <span className="text-gray-500 font-medium">Applied Column Filters:</span>
            {Object.entries(colFilters).map(([k, set]) => {
              const colDef = ORDERS_REPORT_COLUMNS.find((c) => c.key === k);
              return (
                <div
                  key={k}
                  className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full"
                >
                  <span className="font-semibold">{colDef?.label || k}:</span>
                  <span>{set.size} selected</span>
                  <button
                    type="button"
                    onClick={() => removeFilterChip(k)}
                    className="text-amber-600 hover:text-red-600"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <FiLayers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Total Orders</p>
              <p className="text-lg font-bold text-gray-800">
                {summary.totalOrders || 0}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <FiBox className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Total Issued Qty</p>
              <p className="text-lg font-bold text-gray-800">
                {fmt3(summary.totalIssuedQty || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FiBox className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Overall Used Material Qty</p>
              <p className="text-lg font-bold text-indigo-700">
                {fmt3(summary.overallUsedQty || 0)}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <FiDollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">Overall Used Material Value</p>
              <p className="text-lg font-bold text-emerald-700">
                ₹ {fmt2(summary.overallUsedValue || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 bg-gray-100">#</th>
                  {visibleCols.map((c) => {
                    const isFiltered = Boolean(colFilters[c.key]);
                    return (
                      <th
                        key={c.key}
                        draggable
                        onDragStart={(e) => onColDragStart(e, c.key)}
                        onDragOver={onColDragOver}
                        onDrop={(e) => onColDrop(e, c.key)}
                        style={{ minWidth: c.w }}
                        className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 transition cursor-grab active:cursor-grabbing select-none relative group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>{c.label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuCol(openMenuCol === c.key ? null : c.key);
                            }}
                            className={`p-1 rounded hover:bg-gray-300 transition ${isFiltered ? "text-indigo-600 font-bold" : "text-gray-400"
                              }`}
                          >
                            <FiFilter className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Column Filter Dropdown Menu */}
                        {openMenuCol === c.key && (
                          <div className="absolute left-0 top-full mt-1 z-50">
                            <ColumnFilterMenu
                              colKey={c.key}
                              allValues={uniqueVals[c.key] || []}
                              activeFilter={colFilters[c.key]}
                              onApply={handleFilterApply}
                              onSort={handleSort}
                              onClose={() => setOpenMenuCol(null)}
                            />
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleCols.length + 1}
                      className="py-8 text-center text-gray-400 text-sm"
                    >
                      No order material usage data found.
                    </td>
                  </tr>
                ) : groupKeys.length > 0 ? (
                  renderTreeNodes(tree)
                ) : (
                  paginated.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-gray-50/90 transition border-b border-gray-100 text-xs"
                    >
                      <td className="py-2 px-3 text-center text-gray-400 font-mono">
                        {(safePage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      {visibleCols.map((c) => {
                        const val = row[c.key];
                        if (c.key === "orderNo") {
                          return (
                            <td
                              key={c.key}
                              className="py-2 px-3 font-bold text-indigo-600"
                            >
                              {val}
                            </td>
                          );
                        }
                        if (c.key === "usedQty") {
                          return (
                            <td
                              key={c.key}
                              className="py-2 px-3 text-right font-bold text-indigo-700 bg-indigo-50/40 font-mono"
                            >
                              {fmt3(val)}
                            </td>
                          );
                        }
                        if (c.key === "usedValue") {
                          return (
                            <td
                              key={c.key}
                              className="py-2 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40 font-mono"
                            >
                              ₹ {fmt2(val)}
                            </td>
                          );
                        }
                        if (c.key === "issuedQty" || c.key === "returnedQty") {
                          return (
                            <td
                              key={c.key}
                              className="py-2 px-3 text-right font-mono text-gray-600"
                            >
                              {fmt3(val)}
                            </td>
                          );
                        }
                        if (c.key === "price") {
                          return (
                            <td
                              key={c.key}
                              className="py-2 px-3 text-right font-mono text-gray-600"
                            >
                              ₹ {fmt2(val)}
                            </td>
                          );
                        }
                        return (
                          <td key={c.key} className="py-2 px-3 text-gray-700">
                            {val ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>

              {filtered.length > 0 && (
                <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300 text-gray-900 sticky bottom-0">
                  <tr>
                    <td className="py-2.5 px-3 text-center">#</td>
                    {visibleCols.map((c) => {
                      if (c.key === "orderNo") {
                        return (
                          <td key={c.key} className="py-2.5 px-3 font-bold text-gray-900">
                            TOTALS:
                          </td>
                        );
                      }
                      if (c.key === "issuedQty") {
                        return (
                          <td key={c.key} className="py-2.5 px-3 text-right font-mono">
                            {fmt3(summary.totalIssuedQty)}
                          </td>
                        );
                      }
                      if (c.key === "returnedQty") {
                        return (
                          <td key={c.key} className="py-2.5 px-3 text-right font-mono">
                            {fmt3(summary.totalReturnedQty)}
                          </td>
                        );
                      }
                      if (c.key === "usedQty") {
                        return (
                          <td
                            key={c.key}
                            className="py-2.5 px-3 text-right font-mono text-indigo-700 bg-indigo-100/60"
                          >
                            {fmt3(summary.overallUsedQty)}
                          </td>
                        );
                      }
                      if (c.key === "usedValue") {
                        return (
                          <td
                            key={c.key}
                            className="py-2.5 px-3 text-right font-mono text-emerald-700 bg-emerald-100/60"
                          >
                            ₹ {fmt2(summary.overallUsedValue)}
                          </td>
                        );
                      }
                      return <td key={c.key} className="py-2.5 px-3"></td>;
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-200 text-xs no-print">
              <span className="text-gray-600">
                Page {safePage} of {totalPages} ({filtered.length} total items)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-xs font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


