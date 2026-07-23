import { useEffect, useMemo, useState } from "react";
import { useGetYarnMasterQuery } from "../../../redux/uniformService/YarnMasterServices";
import { useGetColorMasterQuery } from "../../../redux/uniformService/ColorMasterService";
import { useGetUnitOfMeasurementMasterQuery } from "../../../redux/uniformService/UnitOfMeasurementServices";
import { toast } from "react-toastify";
import { capitalizeFirstLetter, findFromList, sumArray } from "../../../Utils/helper";
import { useDispatch, useSelector } from "react-redux";
import { push } from "../../../redux/features/opentabs";
import { setLastTab, setOpenPartyModal } from "../../../redux/features/openModel";
import Swal from "sweetalert2";
import { useGetHsnMasterQuery } from "../../../redux/services/HsnMasterServices";
import {
    getCatalogColorOptions,
    getCatalogColumnVisibility,
    getCatalogSizeOptions,
    isLegacyCatalogItem,
    itemUsesColor,
    itemUsesSize,
    resolveSellablePriceRow,
} from "../../../Utils/salesCatalogRules";
import TransactionLineItemsSection, {
    standardTransactionPlaceholderRowCount,
    transactionTableClassName,
    transactionTableCellClassName,
    transactionTableFocusCellClassName,
    transactionTableHeadClassName,
    transactionTableHeaderCellClassName,
    transactionTableIndexCellClassName,
    transactionTableNumberInputClassName,
    transactionTableRowClassName,
    transactionTableSelectInputClassName,
} from "../ReusableComponents/TransactionLineItemsSection";
import SearchableTableCellSelect from "../ReusableComponents/SearchableTableCellSelect";
import { ItemMaster } from "../../../Shocks";
import { Gift } from "lucide-react";
import { calculateCartWithOffers, getPotentialOffers } from "../../../Utils/offerEngine";

const QuotationItems = ({
    id,
    transType,
    quoteItems,
    setQuoteItems,
    readOnly,
    params,
    isSupplierOutside,
    taxTypeId,
    greyFilter,
    contextMenu,
    handleCloseContextMenu,
    handleRightClick,
    setInwardItemSelection,
    supplierId,
    itemList,
    sizeList,
    taxMethod,
    setTaxMethod,
    isHeaderOpen,
    itemControlPanel,
    handlers,
    movedToNextSaveNewRef,
    activeOffers = [],
    selectedOffersByRow = {},
    setSelectedOffersByRow,
    setSelectedItemForOffers,
    setShowItemOfferModal,
    itemPriceList
}) => {
    const compactHeaderCellClassName = transactionTableHeaderCellClassName;
    const compactCellClassName = transactionTableCellClassName;
    const compactFocusCellClassName = transactionTableFocusCellClassName;
    const compactSelectClassName = transactionTableSelectInputClassName;
    const compactNumberInputClassName = transactionTableNumberInputClassName;
    const compactDropdownClassName = "h-full w-full max-w-none rounded-none border-0 bg-transparent px-1 py-0 text-[10px] shadow-none outline-none focus:bg-transparent focus:outline-none";

    const [currentSelectedLotGrid, setCurrentSelectedLotGrid] = useState(false)
    const catalogItems = itemList?.data || [];
    const catalogPriceRows = itemPriceList?.data || [];
    const { showSize, showColor } = getCatalogColumnVisibility(catalogItems, catalogPriceRows);
    const findSelectedItem = (itemId) => catalogItems.find((item) => String(item.id) === String(itemId));
    const isLegacyRow = (row) => isLegacyCatalogItem(catalogItems, row?.itemId);
    const rowRequiresSize = (row) => itemUsesSize(catalogItems, catalogPriceRows, row?.itemId);
    const rowRequiresColor = (row) => itemUsesColor(catalogItems, catalogPriceRows, row?.itemId);
    const isSizeReady = (row) => !rowRequiresSize(row) || Boolean(row.itemId);
    const isColorReady = (row) => !rowRequiresColor(row) || Boolean(rowRequiresSize(row) ? row.sizeId : row.itemId);
    const isUomReady = (row) => {
        if (rowRequiresColor(row)) return Boolean(row.colorId);
        if (rowRequiresSize(row)) return Boolean(row.sizeId);
        return Boolean(row.itemId);
    };


    const handleInputChange = (value, index, field) => {
        const newBlend = structuredClone(quoteItems);
        if (field === "itemId") {
            const selectedItem = findSelectedItem(value);
            if (selectedItem) {
                newBlend[index]["sectionId"] = selectedItem.sectionId;
                newBlend[index]["hsnId"] = selectedItem.hsnId;
                if (!itemUsesSize(catalogItems, catalogPriceRows, selectedItem.id)) {
                    newBlend[index]["sizeId"] = "";
                }
                if (!itemUsesColor(catalogItems, catalogPriceRows, selectedItem.id)) {
                    newBlend[index]["colorId"] = "";
                }
                const selectedHsn = hsnList?.data?.find(hsn => parseInt(hsn.id) === parseInt(selectedItem.hsnId));
                newBlend[index]["taxPercent"] = selectedHsn?.tax || 0;
                newBlend[index]["taxMethod"] = newBlend[index]["taxMethod"] || "Inclusive";
            } else {
                newBlend[index]["taxMethod"] = "";
            }
        }

        if (field === "hsnId") {
            const selectedHsn = hsnList?.data?.find(hsn => parseInt(hsn.id) === parseInt(value));
            newBlend[index]["taxPercent"] = selectedHsn?.tax || 0;
        }

        if (field === "itemId" || field === "sizeId" || field === "colorId" || field === "qty" || field === "barcodeType") {
            const currentItem = field === "itemId" ? value : newBlend[index].itemId;
            const currentSize = field === "sizeId" ? value : newBlend[index].sizeId;
            const currentColor = field === "colorId" ? value : newBlend[index].colorId;
            const currentQty = field === "qty" ? value : newBlend[index].qty;
            const currentBarcodeType = field === "barcodeType" ? value : (newBlend[index].barcodeType || "REGULAR");
            const isLegacySelection = isLegacyCatalogItem(catalogItems, currentItem);
            const requiresSize = itemUsesSize(catalogItems, catalogPriceRows, currentItem);
            const requiresColor = itemUsesColor(catalogItems, catalogPriceRows, currentItem);

            const selectedItem = catalogItems?.find((i) => i.id === currentItem);

            if (selectedItem) {
                if (selectedItem.isLegacy) {
                    newBlend[index].barcode = selectedItem.ItemPriceList?.[0]?.ItemBarcodes?.find(b => b.barcodeType === currentBarcodeType)?.barcode ||
                        selectedItem.ItemPriceList?.[0]?.barcode ||
                        selectedItem.barcode || "";
                } else {
                    const priceEntry = selectedItem.ItemPriceList?.find(
                        p => String(p.sizeId) === String(currentSize) && String(p.colorId) === String(currentColor)
                    );
                    newBlend[index].barcode = priceEntry?.ItemBarcodes?.find(b => b.barcodeType === currentBarcodeType)?.barcode || "";
                }
            } else {
                newBlend[index].barcode = "";
            }

            if (!requiresSize || currentSize || isLegacySelection) {
                const foundPrice = resolveSellablePriceRow(
                    catalogItems,
                    catalogPriceRows,
                    currentItem,
                    currentSize,
                    requiresColor ? currentColor : ""
                );

                console.log(foundPrice, "foundPrice")

                if (foundPrice) {
                    let finalPrice = foundPrice.salesPrice;

                    if (currentBarcodeType === "CLEARANCE") {
                        const currentBarcodeStr = newBlend[index].barcode;
                        const existingOffer = (activeOffers || [])?.find(offer =>
                            offer.scopeMode === 'Item' &&
                            offer.OfferScope?.some(s => parseInt(s.refId) === parseInt(currentItem)) &&
                            offer.OfferRule?.some(rule =>
                                rule.conditions?.rules?.some(r =>
                                    r.field === 'Specific Barcode' &&
                                    r.operator === '==' &&
                                    String(r.value).trim().includes(String(currentBarcodeStr).trim())
                                )
                            )
                        );
                        
                        if (existingOffer && existingOffer.discountValue) {
                            finalPrice = existingOffer.discountValue;
                        }
                    }

                    newBlend[index]["price"] = finalPrice;
                } else {
                    // newBlend[index]["priceType"] = null;
                    newBlend[index]["price"] = 0;
                }
            } else {
                newBlend[index]["priceType"] = null;
            }
        }

        newBlend[index][field] = value;
        setQuoteItems(newBlend);
    };



    useEffect(() => {
        const length = standardTransactionPlaceholderRowCount
        if (quoteItems?.length >= length) return;
        setQuoteItems((prev) => {
            console.log(prev, "prev", quoteItems?.length)
            let newArray = Array.from({ length: length - prev.length }, (i) => {
                return {
                    itemId: "",
                    qty: "0.00",
                    tax: "0",
                    colorId: "",
                    uomId: "",
                    price: "0.00",
                    discountValue: "0.00",
                    discountType: "",
                    noOfBags: "0",
                    weightPerBag: "0.00",
                    id: '',
                    poItemsId: "",
                    taxMethod: "",
                    barcode: "",
                    barcodeType: "REGULAR"
                };
            });
            return [...prev, ...newArray];
        });
    }, [transType, setQuoteItems, quoteItems, isHeaderOpen, id]);

    const addNewRow = () => {
        const newRow = {
            itemId: "",
            qty: "",
            tax: "0",
            colorId: "",
            uomId: "",
            price: "",
            discountTypes: "",
            discountValue: "0.00",
            id: '',
            poItemsId: "",
            taxMethod: "",
            barcode: "",
            barcodeType: "REGULAR"
        };
        setQuoteItems([...quoteItems, newRow]);
    };
    const handleDeleteRow = (id) => {
        setQuoteItems((yarnBlend) =>
            yarnBlend.filter((row, index) => index !== parseInt(id))
        );
    };
    const handleDeleteAllRows = () => {
        // setQuoteItems((prevRows) => {
        //     if (prevRows.length <= 1) return prevRows;
        //     return [prevRows[0]];
        // });
        setQuoteItems([])
    };
    const activeTab = useSelector((state) =>
        state.openTabs.tabs.find((tab) => tab.active).name
    );

    const { data: yarnList } = useGetYarnMasterQuery({ params });
    const { data: uomList } = useGetUnitOfMeasurementMasterQuery({ params });
    const { data: colorList, isLoading: isColorLoading, isFetching: isColorFetching, } = useGetColorMasterQuery({ params: { ...params, isGrey: greyFilter ? true : undefined }, });
    const { data: hsnList } = useGetHsnMasterQuery({ params });


    function findYarnTax(id) {
        if (!yarnList) return 0;
        let yarnItem = yarnList.data.find(
            (item) => parseInt(item.id) === parseInt(id)
        );
        return yarnItem ? yarnItem.taxPercent : 0;
    }

    function getTotals(field) {
        const total = quoteItems.reduce((accumulator, current) => {
            return accumulator + parseFloat(current[field] ? current[field] : 0);
        }, 0);
        return parseFloat(total);
    }


    ;

    const dispatch = useDispatch();
    const handleCreateNew = (masterName = "") => {
        dispatch(setOpenPartyModal(true));
        dispatch(setLastTab(activeTab));
        dispatch(push({ name: masterName }));
    }


    let selectedRow = Number.isInteger(currentSelectedLotGrid) ? quoteItems[currentSelectedLotGrid] : ""
    let taxItems = quoteItems?.map(item => {
        let newItem = structuredClone(item)
        newItem["qty"] = sumArray(newItem.lotDetails, "qty")
        return newItem
    })
    let lotNoArr = selectedRow?.lotDetails ? selectedRow.lotDetails.map(item => item.lotNo) : []
    let isLotNoUnique = new Set(lotNoArr).size == lotNoArr.length
    function onClose() {
        if (!isLotNoUnique) {
            toast.info("Lot No Should be Unique", { position: "top-center" })
            return
        }
        setCurrentSelectedLotGrid(false)
    }

    const getLineTotals = (line) => {
        const quantity = Math.max(0, Number(line.qty));
        const unitPrice = Math.max(0, Number(line.price));
        const taxRate = Number(line.taxPercent) || 0;
        const taxMethod = line.taxMethod; // ✅ from line

        const grossAmount = quantity * unitPrice;

        // 👉 Step 1: Apply Discount FIRST
        let discountedAmount = grossAmount;

        if (line.discountType === "Percentage") {
            discountedAmount =
                grossAmount - (grossAmount * (Number(line.discountValue) || 0)) / 100;
        } else if (line.discountType === "Flat") {
            discountedAmount =
                grossAmount - (Number(line.discountValue) || 0);
        }

        // Prevent negative
        discountedAmount = Math.max(0, discountedAmount);

        // 👉 Step 2: Tax Calculation (based on line)
        if (taxMethod === "Inclusive" && taxRate > 0) {
            const subTotal = discountedAmount / (1 + taxRate / 100);
            const taxTotal = discountedAmount - subTotal;

            return {
                subTotal,
                taxTotal,
                total: discountedAmount,
            };
        }

        // Exclusive Tax
        const subTotal = discountedAmount;
        const taxTotal = subTotal * (taxRate / 100);

        return {
            subTotal,
            taxTotal,
            total: subTotal + taxTotal,
        };
    };

    const potentialOffers = useMemo(() => getPotentialOffers(activeOffers, quoteItems), [activeOffers, quoteItems]);
    const { cartWithOffers: rawItemsWithOffers } = useMemo(() => calculateCartWithOffers(quoteItems, selectedOffersByRow, potentialOffers, activeOffers), [quoteItems, selectedOffersByRow, potentialOffers, activeOffers]);

    console.log(quoteItems, "quoteItems")

    const quoteItemsWithOffers = useMemo(() => {
        let items = [...(rawItemsWithOffers || [])];
        const length = standardTransactionPlaceholderRowCount;
        if (items.length < length) {
            const padding = Array.from({ length: length - items.length }, () => ({
                itemId: "",
                qty: "0.00",
                tax: "0",
                colorId: "",
                uomId: "",
                price: "0.00",
                discountValue: "0.00",
                discountType: "",
                noOfBags: "0",
                weightPerBag: "0.00",
                id: '',
                poItemsId: "",
                taxMethod: "",
                barcode: "",
                barcodeType: "REGULAR"
            }));
            return [...items, ...padding];
        }
        return items;
    }, [rawItemsWithOffers]);
    const itemOptions = (id ? itemList?.data : itemList?.data?.filter(i => i.active) || [])?.map((item) => ({
        value: item.id,
        label: item?.name || "",
    }));

    const hsnOptions = (id ? hsnList?.data : hsnList?.data?.filter(i => i.active) || [])?.map((item) => ({
        value: item.id,
        label: item?.name || "",
    }));

    const uomOptions = (id ? uomList?.data : uomList?.data?.filter(i => i.active) || [])?.map((item) => ({
        value: item.id,
        label: item?.name || "",
    }));

    const discountTypeOptions = [
        { value: "", label: "" },
        { value: "Flat", label: "Flat" },
        { value: "Percentage", label: "Percentage" },
    ];

    const taxMethodOptions = [
        { value: "", label: "   " },
        { value: "Inclusive", label: "Inclusive" },
        { value: "Exclusive", label: "Exclusive" },
    ];

    return (
        <>


            <fieldset className="h-full min-h-0">
                <TransactionLineItemsSection
                    panelClassName="h-full min-h-0"
                    contentClassName="min-h-0 overflow-hidden rounded-md border border-slate-200 !py-0"
                >
                    <div className="h-full overflow-x-auto overflow-y-auto">
                        <table className={transactionTableClassName}>
                            <thead className={transactionTableHeadClassName}>
                                <tr>
                                    <th
                                        className={`${compactHeaderCellClassName} w-12`}
                                    >
                                        S.No
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-52`}
                                    >
                                        Item
                                    </th>
                                    {showSize && (
                                        <th
                                            className={`${compactHeaderCellClassName} w-16`}
                                        >
                                            Size
                                        </th>
                                    )}
                                    {showColor && (
                                        <th
                                            className={`${compactHeaderCellClassName} w-32`}
                                        >
                                            Color
                                        </th>
                                    )}
                                    <th

                                        className={`${compactHeaderCellClassName} w-20`}
                                    >
                                        Hsn
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-12`}
                                    >
                                        UOM
                                    </th>


                                    <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >
                                        Quantity
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >

                                        Price
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-24`}
                                    >
                                        Barcode  Type
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-7`}
                                    >

                                        Offer
                                    </th>

                                    {/* <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >
                                        Discount Type
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >
                                        Discount
                                    </th> */}
                                    <th

                                        className={`${compactHeaderCellClassName} w-20`}
                                    >
                                        Tax Type
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-10`}
                                    >
                                        Tax
                                    </th>
                                    {/* <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >
                                        Tax Total
                                    </th> */}
                                    <th

                                        className={`${compactHeaderCellClassName} w-16`}
                                    >
                                        Net Amount
                                    </th>
                                    <th

                                        className={`${compactHeaderCellClassName} w-7`}
                                    >

                                    </th>
                                </tr>
                            </thead>

                            <tbody>{console.log(quoteItemsWithOffers, "quoteItemsWithOffers")}

                                {(quoteItemsWithOffers ? quoteItemsWithOffers : [])?.map((row, index) => {

                                    const { subTotal, taxTotal, total } = getLineTotals(row, taxMethod);
                                    const selectedItemData = itemList?.data?.find(i => i.id === row.itemId);
                                    const isLegacy = row.itemId ? selectedItemData?.isLegacy : true;
                                    const priceList = selectedItemData?.ItemPriceList || [];
                                    const currentPriceEntry = isLegacy
                                        ? priceList[0]
                                        : priceList.find(p => String(p.sizeId) === String(row.sizeId) && String(p.colorId) === String(row.colorId));

                                    const availableBarcodes = currentPriceEntry?.ItemBarcodes || [];

                                    return (
                                        <tr className={`${transactionTableRowClassName} ${contextMenu && contextMenu.rowId === index ? "!bg-blue-200" : (index % 2 === 0 ? "bg-white" : "bg-gray-100")} `}
                                            onContextMenu={(e) => {
                                                if (!readOnly) {
                                                    handleRightClick(e, index, "shiftTimeHrs");
                                                }
                                            }}
                                        >
                                            <td className={transactionTableIndexCellClassName}>{index + 1}</td>
                                            <td className={compactFocusCellClassName}>

                                                <SearchableTableCellSelect
                                                    value={row.itemId}
                                                    options={itemOptions}
                                                    disabled={readOnly}
                                                    onChange={(nextValue) => handleInputChange(nextValue, index, "itemId")}
                                                    addNewModalWidth="w-[90%] h-[95%]"
                                                    childComponent={ItemMaster}
                                                    addNewLabel="+ Add New Item"
                                                    // ref={secondInputRef}
                                                    handlers={handlers}
                                                    movedToNextSaveNewRef={movedToNextSaveNewRef}
                                                />
                                            </td>

                                            {showSize && (
                                                <td className={compactFocusCellClassName}>

                                                    <SearchableTableCellSelect
                                                        value={row.sizeId}
                                                        options={
                                                            id ?
                                                                sizeList?.data?.map((item) => ({
                                                                    value: item.id,
                                                                    label: item?.name || "",
                                                                })) :
                                                                getCatalogSizeOptions(catalogItems, catalogPriceRows, sizeList?.data, row?.itemId)?.map((item) => ({
                                                                    value: item.id,
                                                                    label: item?.name || "",
                                                                }))}

                                                        disabled={readOnly || !isSizeReady(row)}
                                                        onChange={(nextValue) => handleInputChange(nextValue, index, "sizeId")}
                                                        addNewModalWidth="w-[90%] h-[95%]"

                                                    />
                                                </td>
                                            )}

                                            {showColor && (
                                                <td className={compactFocusCellClassName}>


                                                    <SearchableTableCellSelect
                                                        value={row.colorId}
                                                        options={
                                                            id ?
                                                                colorList?.data?.map((item) => ({
                                                                    value: item.id,
                                                                    label: item?.name || "",
                                                                })) :
                                                                getCatalogColorOptions(catalogItems, catalogPriceRows, colorList?.data, row?.itemId, row?.sizeId)?.map((item) => ({
                                                                    value: item.id,
                                                                    label: item?.name || "",
                                                                }))}

                                                        disabled={readOnly || !isColorReady(row)}
                                                        onChange={(nextValue) => handleInputChange(nextValue, index, "colorId")}
                                                        addNewModalWidth="w-[90%] h-[95%]"

                                                    />
                                                </td>
                                            )}


                                            <td className={compactFocusCellClassName}>
                                                <SearchableTableCellSelect
                                                    value={row.hsnId}
                                                    options={hsnOptions}
                                                    disabled={readOnly || !row.itemId}
                                                    onChange={(nextValue) => handleInputChange(nextValue, index, "hsnId")}
                                                    addNewModalWidth="w-[90%] h-[95%]"

                                                />
                                            </td>


                                            <td className={`${compactFocusCellClassName} w-40`}>

                                                <SearchableTableCellSelect
                                                    value={row.uomId}
                                                    options={uomOptions}
                                                    disabled={readOnly || !isUomReady(row)}
                                                    onChange={(nextValue) => handleInputChange(nextValue, index, "uomId")}
                                                    addNewModalWidth="w-[90%] h-[95%]"

                                                />
                                            </td>


                                            <td className={`${compactFocusCellClassName} w-40 text-right`}>
                                                <input
                                                    onKeyDown={e => {
                                                        if (e.code === "Minus" || e.code === "NumpadSubtract") e.preventDefault()
                                                        if (e.key === "Delete") { handleInputChange("0.000", index, "qty") }
                                                    }}
                                                    min={"0"}
                                                    type="number"
                                                    className={compactNumberInputClassName}
                                                    onFocus={(e) => e.target.select()}
                                                    // value={sumArray(row?.lotDetails ? row?.lotDetails : [], "qty")}
                                                    value={row?.qty}
                                                    disabled={readOnly || !row.uomId}
                                                    onChange={(e) =>
                                                        handleInputChange(e.target.value, index, "qty")
                                                    }
                                                    onBlur={(e) => {
                                                        handleInputChange(parseFloat(e.target.value).toFixed(3), index, "qty");
                                                    }
                                                    }
                                                />
                                            </td>

                                            <td className={`${compactFocusCellClassName} w-40 text-right relative`}>
                                                <input
                                                    onKeyDown={e => {
                                                        if (e.code === "Minus" || e.code === "NumpadSubtract") e.preventDefault()
                                                        if (e.key === "Delete") { handleInputChange("0.00", index, "price") }
                                                    }}
                                                    min={"0"}
                                                    type="number"
                                                    className={compactNumberInputClassName}
                                                    onFocus={(e) => e.target.select()}
                                                    value={(!row.price) ? 0 : row.price}
                                                    disabled={readOnly || !row.qty || true}
                                                    onChange={(e) =>
                                                        handleInputChange(e.target.value, index, "price")
                                                    }
                                                    onBlur={(e) => {
                                                        handleInputChange(parseFloat(e.target.value).toFixed(3), index, "price");
                                                    }}
                                                />{console.log(row.price, "row.price")}



                                            </td>


                                            <td className={`${compactCellClassName} px-1 text-[10px] font-bold leading-none`}>

                                                <select
                                                    className="h-full w-full rounded-none border-0 bg-transparent px-1 py-0 shadow-none outline-none focus:bg-transparent focus:outline-none"
                                                    value={row.barcodeType || "REGULAR"}
                                                    onChange={(e) => handleInputChange(e.target.value, index, "barcodeType")}
                                                    disabled={readOnly}
                                                >
                                                    {availableBarcodes.length > 0 ? (
                                                        availableBarcodes.map((b) => (
                                                            <option key={b.barcodeType} value={b.barcodeType}>
                                                                {b.barcodeType}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <>
                                                            {/* <option value="REGULAR">REGULAR</option>
                                                            <option value="CLEARANCE">CLEARANCE</option> */}
                                                        </>
                                                    )}
                                                </select>
                                            </td>
                                            <td className={`${compactCellClassName} px-1 text-[10px] text-center font-bold leading-none relative`}>
                                                {row.itemId && (
                                                    <button
                                                        disabled={readOnly}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItemForOffers(row);
                                                            setShowItemOfferModal(true);
                                                        }}
                                                        title="View Item Offers"
                                                        className="absolute right-1/4 top-1/2 -translate-y-1/2 p-1 text-indigo-600 bg-indigo-50 hover:text-white hover:bg-indigo-600 rounded transition-all flex items-center justify-center border border-indigo-100 hover:border-indigo-600 shrink-0 z-10"
                                                    >
                                                        <Gift size={12} fill="currentColor" />
                                                    </button>
                                                )}
                                            </td>



                                            <td className={compactFocusCellClassName}>

                                                <SearchableTableCellSelect
                                                    value={row.taxMethod}
                                                    options={taxMethodOptions}
                                                    disabled={readOnly}
                                                    onChange={(nextValue) => handleInputChange(nextValue, index, "taxMethod")}
                                                    addNewModalWidth="w-[90%] h-[95%]"

                                                />
                                            </td>

                                            <td className={`${compactCellClassName} w-40 text-right`}>
                                                <input
                                                    onKeyDown={e => {
                                                        if (e.code === "Minus" || e.code === "NumpadSubtract") e.preventDefault()
                                                        if (e.key === "Delete") { handleInputChange("0.00", index, "taxPercent") }
                                                    }}
                                                    min={"0"}
                                                    type="number"
                                                    className={compactNumberInputClassName}
                                                    onFocus={(e) => e.target.select()}
                                                    value={(!row.taxPercent) ? 0 : row.taxPercent}
                                                    disabled={true}
                                                    onChange={(e) =>
                                                        handleInputChange(e.target.value, index, "taxPercent")
                                                    }
                                                    onBlur={(e) => {
                                                        handleInputChange(parseFloat(e.target.value).toFixed(3), index, "taxPercent");

                                                    }
                                                    }

                                                />

                                            </td>

                                            <td className={`${compactCellClassName} w-40 text-right px-2`}>
                                                {(total).toFixed(2)}
                                            </td>



                                            <td className="w-16 px-1 py-1 text-center">
                                                <button
                                                    onClick={() => addNewRow(index)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            if (index === quotationItems.length - 1) {
                                                                addNewRow(index);
                                                            }

                                                        }
                                                    }}
                                                    className="h-full w-full rounded-none bg-blue-50 py-0"
                                                >
                                                    +
                                                </button>
                                            </td>



                                        </tr>
                                    )

                                }




                                )}
                            </tbody>
                        </table>
                        {contextMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: `${contextMenu.mouseY - 240}px`,
                                    left: `${contextMenu.mouseX - 38}px`,

                                    // background: "gray",
                                    boxShadow: "0px 0px 5px rgba(0,0,0,0.3)",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    zIndex: 1000,
                                }}
                                className="bg-gray-100"
                                onMouseLeave={handleCloseContextMenu} // Close when the mouse leaves
                            >
                                <div className="flex flex-col gap-1">
                                    <button
                                        className=" text-black text-[12px] text-left rounded px-1"
                                        onClick={() => {
                                            handleDeleteRow(contextMenu.rowId);
                                            handleCloseContextMenu();
                                        }}
                                    >
                                        Delete{" "}
                                    </button>
                                    <button
                                        className=" text-black text-[12px] text-left rounded px-1"
                                        onClick={() => {
                                            handleDeleteAllRows();
                                            handleCloseContextMenu();
                                        }}
                                    >
                                        Delete All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </TransactionLineItemsSection>
            </fieldset>

        </>
    );
};

export default QuotationItems;
