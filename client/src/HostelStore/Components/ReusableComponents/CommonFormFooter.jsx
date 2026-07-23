import React, { useState } from "react";
import Modal from "../../../UiComponents/Modal";

const defaultTotalsRows = ({ totalQty, subtotal, taxAmount, netAmount }) => [
  {
    key: "totalQty",
    label: "Total Quantity",
    value: totalQty || 0,
    summaryColumn: "left",
  },
  {
    key: "subtotal",
    label: "Gross Amount",
    value: `₹${(subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    summaryColumn: "right",
  },
  {
    key: "taxAmount",
    label: "GST Amount",
    value: `₹${(taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    summaryColumn: "right",
  },
  {
    key: "netAmount",
    label: "Net Amount",
    value: `₹${(netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    emphasized: true,
    summaryColumn: "right",
  },
];

const resolveSummaryColumn = (row = {}) => {
  if (row.summaryColumn === "left" || row.summaryColumn === "right") {
    return row.summaryColumn;
  }

  const identity = String(row.key || row.label || "").toLowerCase();
  const leftColumnTokens = ["qty", "quantity", "payment", "advance", "received", "minimum"];

  return leftColumnTokens.some((token) => identity.includes(token)) ? "left" : "right";
};

const CommonFormFooter = ({
  remarks,
  setRemarks,
  terms,
  setTerms,
  totalQty,
  subtotal,
  taxAmount,
  netAmount,
  readOnly = false,
  showTermSelect = false,
  termValue = "",
  onTermChange = () => { },
  termOptions = [],
  totalsRows,
  extraTotalsContent = null,
  extraTotalsContentColumn = "left",
  chargeOptions = [],
  leftActions = null,
  rightActions = null,
  remarksPlaceholder = "Additional notes...",
  termsPlaceholder = "Select or type Terms & Conditions...",
  saveCloseButtonRef
}) => {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const termsTextareaRef = React.useRef(null);
  const templateOptionsRefs = React.useRef([]);

  const resolvedTotalsRows =
    totalsRows && totalsRows.length > 0
      ? totalsRows
      : defaultTotalsRows({ totalQty, subtotal, taxAmount, netAmount });
  const leftSummaryRows = resolvedTotalsRows.filter((row) => resolveSummaryColumn(row) === "left");
  const rightSummaryRows = resolvedTotalsRows.filter((row) => resolveSummaryColumn(row) === "right");

  const showTemplateControl = showTermSelect && !readOnly;
  const termsColumnClassName = "md:col-span-4";
  const remarksColumnClassName = "md:col-span-2";
  const totalsColumnClassName = "md:col-span-6";
  const visibleChargeOptions = chargeOptions.filter((option) => {
    if (!option) {
      return false;
    }

    if (readOnly) {
      return Boolean(option.checked);
    }

    return true;
  });

  const handleTemplateSelection = (value) => {
    const normalizedValue = value ? String(value) : "";

    if (!normalizedValue) {
      onTermChange("");
      return false;
    }

    const selectedOption = termOptions.find((option) => String(option.value) === normalizedValue);

    if (!selectedOption) {
      onTermChange("");
      return false;
    }

    const nextTermsText = selectedOption.templateText || "";
    const hasExistingTerms = Boolean((terms || "").trim());
    const shouldReplace =
      !hasExistingTerms ||
      (terms || "") === nextTermsText ||
      window.confirm("Replace current terms with the selected template?");

    if (!shouldReplace) {
      return false;
    }

    setTerms(nextTermsText);
    onTermChange(normalizedValue, selectedOption);
    setTimeout(() => termsTextareaRef.current?.focus(), 100);
    return true;
  };

  React.useEffect(() => {
    if (isTemplateModalOpen) {
      const initialIndex = termOptions.findIndex(
        (option) => String(option.value) === String(termValue || "")
      );
      const indexToSet = initialIndex >= 0 ? initialIndex : 0;
      setActiveIndex(indexToSet);

      // Focus the active option after a short delay to allow modal to render
      const timer = setTimeout(() => {
        if (templateOptionsRefs.current[indexToSet]) {
          templateOptionsRefs.current[indexToSet].focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTemplateModalOpen, termOptions, termValue]);

  React.useEffect(() => {
    if (isTemplateModalOpen && templateOptionsRefs.current[activeIndex]) {
      templateOptionsRefs.current[activeIndex].focus();
    }
  }, [activeIndex, isTemplateModalOpen]);

  const renderSummaryRows = (rows) =>
    rows.map((row, index) => (
      <div
        key={row.key || row.label || index}
        className={[
          "flex items-center justify-between gap-2 py-0.5 text-[12px]",
          row.emphasized ? "border-t border-slate-100 pt-1.5" : "",
          row.className || "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "shrink-0",
            row.emphasized ? "font-semibold text-slate-700" : "text-slate-600",
            row.labelClassName || "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {row.label}
        </span>
        {row.renderValue ? (
          <div className={["flex items-center", row.valueContainerClassName || ""].filter(Boolean).join(" ")}>{row.renderValue()}</div>
        ) : (
          <span
            className={[
              row.emphasized ? "font-semibold text-indigo-700" : "font-medium",
              row.valueClassName || "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {row.value}
          </span>
        )}
      </div>
    ));

  const renderChargeOptions = () => {
    if (visibleChargeOptions.length === 0) {
      return null;
    }

    return (
      <div className="border-t border-slate-100 pt-1.5">
        <div className="space-y-1">
          {visibleChargeOptions.map((option) => (
            <label
              key={option.key || option.label}
              className={[
                "flex items-center justify-between gap-2 text-[11px]",
                readOnly ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="font-medium text-slate-600">{option.label}</span>
              <input
                type="checkbox"
                checked={Boolean(option.checked)}
                disabled={readOnly}
                onChange={(event) => option.onToggle?.(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1.5">


      {/* <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        <div className={`flex h-full flex-col rounded-md border border-slate-200 bg-white p-1.5 shadow-sm ${termsColumnClassName}`}>
          <div className="flex h-full flex-col gap-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-bold text-slate-700">Terms & Conditions</h2>
              {showTemplateControl ? (
                <button
                  ref={saveCloseButtonRef}
                  onKeyDown={(e) => {
                    if (e.key == "Enter") {
                      e.preventDefault();
                      setIsTemplateModalOpen(true);
                    }
                  }}
                  type="button"
                  className="shrink-0 text-[10px] font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  Apply template
                </button>
              ) : null}
            </div>
            <textarea
              ref={termsTextareaRef}
              disabled={readOnly}
              className="min-h-[3.5rem] flex-1 w-full overflow-auto rounded-md border border-slate-300 px-2 py-1.5 text-[11px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
              value={terms || ""}
              onChange={(e) => setTerms(e.target.value)}
              placeholder={termsPlaceholder}
            />
          </div>
        </div>

        <div className={`flex h-full flex-col rounded-md border border-slate-200 bg-white p-1.5 shadow-sm ${remarksColumnClassName}`}>
          <h2 className="mb-1 text-[12px] font-bold text-slate-700">Remarks</h2>
          <textarea
            readOnly={readOnly}
            value={remarks || ""}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-[3.5rem] flex-1 w-full overflow-auto rounded-md border border-slate-300 px-2 py-1.5 text-[11px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
            placeholder={remarksPlaceholder}
          />
        </div>

        <div className={`grid grid-cols-1 gap-2 md:grid-cols-2 ${totalsColumnClassName}`}>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
            {renderSummaryRows(leftSummaryRows)}
            {renderChargeOptions()}
            {extraTotalsContent && extraTotalsContentColumn === "left" ? <div className="pt-0.5">{extraTotalsContent}</div> : null}
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
            {renderSummaryRows(rightSummaryRows)}
            {extraTotalsContent && extraTotalsContentColumn === "right" ? <div className="pt-0.5">{extraTotalsContent}</div> : null}
          </div>
        </div>
      </div> */}

      {leftActions || rightActions ? (
        <div className="mt-0.5 flex flex-col justify-between gap-1.5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">{leftActions}</div>
          <div className="flex flex-wrap gap-2">{rightActions}</div>
        </div>
      ) : null}
    </div>
  );
};

export default CommonFormFooter;