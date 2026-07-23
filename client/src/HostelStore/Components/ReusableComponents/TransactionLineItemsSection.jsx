const TransactionLineItemsSection = ({
  title = "",
  actions = null,
  children,
  panelClassName = "",
  contentClassName = "",
  titleClassName = "",
}) => {
  const panelClasses = [
    "relative flex min-h-0 flex-col rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden",
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const contentClasses = ["relative min-h-0 flex-1 overflow-auto", contentClassName]
    .filter(Boolean)
    .join(" ");

  const titleClasses = ["font-medium text-slate-700", titleClassName].filter(Boolean).join(" ");
  const shouldRenderHeader = Boolean(title || actions);

  return (
    <div className={panelClasses}>
      {shouldRenderHeader ? (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-2 pt-2">
          {title ? <h2 className={titleClasses}>{title}</h2> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : <div />}
        </div>
      ) : null}
      <div className={contentClasses}>{children}</div>
    </div>
  );
};

export const transactionTableClassName = "w-full border-collapse table-fixed";
export const transactionTableHeadClassName = "sticky top-0 z-10 bg-slate-100 text-slate-700";
export const standardTransactionPlaceholderRowCount = 20;
export const transactionTableHeaderCellClassName = "bg-gray-300 px-1 py-1 text-center font-medium text-[12px]";
export const transactionTableRowClassName = "border border-blue-gray-200 cursor-pointer";
export const transactionTableIndexCellClassName = "w-12 border border-gray-300 p-0 text-center text-[11px]";
export const transactionTableCellClassName = "border border-gray-300 p-0 text-[11px]";
export const transactionTableFocusCellClassName = `${transactionTableCellClassName} focus-within:border-amber-700 focus-within:bg-amber-100`;
export const transactionTableSelectInputClassName =
  "h-full w-full rounded-none border-0 bg-transparent px-1 py-0 text-left shadow-none outline-none focus:bg-transparent focus:outline-none tx-table-input";
export const transactionTableNumberInputClassName =
  "h-full w-full rounded-none border-0 bg-transparent px-1 py-0 text-right shadow-none outline-none focus:bg-transparent focus:outline-none tx-table-input";
export const transactionTableActionCellClassName = "w-16 border border-gray-300 p-0 text-center";
export const transactionTableActionButtonClassName = "h-full w-full rounded-none bg-blue-50 py-0";

export default TransactionLineItemsSection;
