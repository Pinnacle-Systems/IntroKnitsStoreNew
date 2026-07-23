const TransactionHeaderSection = ({
  title,
  children,
  className = "",
  bodyClassName = "",
  titleClassName = "",
}) => {
  const sectionClasses = [
    "relative  rounded-md bg-white px-2  pb-0 shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClasses = ["grid gap-1 pt-1  overflow-visible", bodyClassName].filter(Boolean).join(" ");
  // const legendClasses = [
  //   "absolute -top-3 left-3 bg-gray-200 px-2 py-1  text-[12px] font-medium text-slate-800",
  //   titleClassName,
  // ]
  //   .filter(Boolean)
  //   .join(" ");
  const legendClasses = [
    "text-sm font-bold text-gray-800",
    titleClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={sectionClasses}>
      <h2 className={legendClasses}>{title}</h2>
      <div className={bodyClasses}>{children}</div>
    </div>
  );
};

export default TransactionHeaderSection;
