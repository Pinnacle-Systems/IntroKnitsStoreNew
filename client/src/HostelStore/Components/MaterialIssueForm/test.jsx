import { useEffect, useRef, useState } from "react";
import FxSelect, { FxSelectWithAdd } from "../../../Inputs";
import Swal from "sweetalert2";
import Modal from "../../../UiComponents/Modal";
import PoItemsSelection from "./PoItemsSelection";
import { getUniqueArrayBySize } from "../../../Utils/helper";
import { ColorMaster, Size, StyleItemMaster, ItemGroup } from "..";
import { useGetPoItemsQuery } from "../../../redux/uniformService/PoServices";
// import { VIEW } from "../../../icons";
import { toast } from "react-toastify";
import { useLazyGetItemMasterByIdQuery } from "../../../redux/services/ItemMasterService";
import TransactionLineItemsSection from "../ReusableComponents/TransactionLineItemsSection";
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



const IssueItems = ({
    id,
    inwardItems,
    setInwardItems,
    readOnly,
    params,
    styleItemList,
    itemGroupList,
    uomList,
    hsnList,
    taxTemplateId,
    inwardType,
    supplierId,
    branchId,
    sizeList,
    colorList,
    setTempItems,
    tempItems,
    searchDocId,
    setSearchDocId,
    setSearchDocDate,
    searchDocDate,
    vehicleRef,
    fromPoId,
    receiptType,
    gsmList,
    isSupplierOutside,
    fillGrid,
    setFillGrid
}) => {
    const EMPTY_ROW = {
        styleItemId: "",
        hsnId: "",
        uomId: "",
        inwardQty: "",
        poQty: "",
        poId: "",
        alreadyInwardQty: "",
        alreadyReturnQty: "",
        alreadyCancelQty: "",
        balQty: "",
        itemGroupId: "",
        sizeId: "",
        colorId: "",
        gsmId: "",
    };
    const [contextMenu, setContextMenu] = useState(null);
    const [currentSelectedIndex, setCurrentSelectedIndex] = useState(null);
    const [focusedField, setFocusedField] = useState(null);
    const actionRefs = useRef([]);

    const skipFocusRef = useRef(false);

    console.log(inwardItems, "inwardItems")

    const addRow = () => {
        const newRow = {
            styleItemId: "",
            hsnId: "",
            uomId: "",
            inwardQty: "",
            poQty: "",
            poId: "",
            itemGroupId: "",
            sizeId: "",
            colorId: "",
            gsmId: "",
        };
        setInwardItems([...inwardItems, newRow]);
    };
    const [triggerGetStyleItem, { data: styleData }] =
        useLazyGetItemMasterByIdQuery();
    const handleInputChange = async (value, index, field, row) => {
        // clone first
        const newRows = structuredClone(inwardItems);
        if (field === "itemId") {
            newRows[index].itemId = value;
            setInwardItems([...newRows]);
            try {
                // 2️⃣ fetch style data
                const response = await triggerGetStyleItem(value).unwrap();

                // 3️⃣ update fabricId
                newRows[index].hsnId = response?.data?.hsnId;
                newRows[index].itemGroupId = response?.data?.itemGroupId;
                newRows[index].sizeId = response?.data?.sizeId;
                newRows[index].colorId = response?.data?.colorId;
                newRows[index].uomId = response?.data?.uomId;
                // 4️⃣ update again after API fetch
                setInwardItems([...newRows]);
            } catch (e) {
                console.error("Style fetch failed", e);
            }

            return; // stop here
        }

        if (field === "issueQty") {
            if (value > row.netQty) {
                Swal.fire({
                    title: "Inward quantity cannot be greater than Stock quantity",
                    icon: "error",
                });
                return;
            }
            newRows[index][field] = value;
        }
        newRows[index][field] = value;
        setInwardItems([...newRows]);
    };
    const deleteRow = (id) => {
        setInwardItems((currentRows) => {
            if (currentRows.length > 1) {
                return currentRows.filter((row, index) => index !== parseInt(id));
            }
            return currentRows;
        });
    };

    const handleDeleteAllRows = () => {
        setInwardItems(Array.from({ length: 4 }, () => ({ ...EMPTY_ROW })));
    };

    const handleRightClick = (event, rowIndex, type) => {
        event.preventDefault();
        setContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
            rowId: rowIndex,
            type,
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const deleteSelectedRows = () => {
        setInwardItems((rows) =>
            rows.filter((r) => !(r.selected && (r.stockQty ?? 0) === 0)),
        );
        setContextMenu(null);
    };

    useEffect(() => {
        // If edit mode (id exists)
        if (id && inwardItems?.length > 0) {
            const requiredRows = 20;
            const missingRows = requiredRows - inwardItems.length;

            if (missingRows > 0) {
                setInwardItems([
                    ...inwardItems,
                    ...Array.from({ length: missingRows }, () => ({ ...EMPTY_ROW })),
                ]);
            }
        }

        // If create mode (no id)
        if (!id && (!inwardItems || inwardItems.length === 0)) {
            setInwardItems(Array.from({ length: 20 }, () => ({ ...EMPTY_ROW })));
        }
    }, [id, inwardItems]);

    const {
        data: poItemsData,
        isLoading: isPoItemsLoading,
        isFetching: isPoItemsFetching,
    } = useGetPoItemsQuery(
        {
            params: {
                branchId,
                supplierId,
                pagination: true,
                dataPerPage: "100",
                pageNumber: 1,
                poType: inwardType,
            },
        },
        { skip: !supplierId || !fromPoId }, // ⬅️ only fetch when needed
    );

    useEffect(() => {
        if (!fromPoId || !poItemsData?.data) return;

        // Filter only items belonging to this specific PO
        const filtered = poItemsData.data.filter(
            (item) => parseInt(item.poId) === parseInt(fromPoId),
        );

        if (filtered.length === 0) return;

        const mapped = filtered.map((item) => ({
            styleItemId: item.styleItemId || "",
            hsnId: item.hsnId || "",
            uomId: item.uomId || "",
            itemGroupId: item.itemGroupId || "",
            sizeId: item.sizeId || "",
            colorId: item.colorId || "",
            poId: item.poId || "",
            poQty: item.qty || "",
            alreadyInwardQty: item.alreadyInwardQty || 0,
            alreadyCancelQty: item.alreadyCancelQty || 0,
            alreadyReturnQty: item.alreadyReturnQty || 0,
            balQty: item.balQty ?? item.qty,
            inwardQty: "", // ⬅️ user fills this
            price: item.price || "",
            gsmId: item.gsmId || "",
            Po: item?.Po ?? "",
        }));

        // Pad to minimum 4 rows
        const padded = [
            ...mapped,
            ...Array.from({ length: Math.max(0, 4 - mapped.length) }, () => ({
                ...EMPTY_ROW,
            })),
        ];

        setInwardItems(padded);
    }, [fromPoId, poItemsData]);

    const showFillButton = inwardType !== "Direct Inward" && !id && !fromPoId;

    const focusActionCell = (index) => {
        setTimeout(() => {
            actionRefs.current[index]?.focus();
        }, 200); // wait for modal close render
    };

    return (
        <>
            {/* <Modal
        isOpen={Number.isInteger(currentSelectedIndex)}
        onClose={() => setCurrentSelectedIndex("")}
      >
        <TaxDetailsFullTemplate
          readOnly={readOnly}
          taxTypeId={taxTemplateId}
          currentIndex={currentSelectedIndex}
          setCurrentSelectedIndex={setCurrentSelectedIndex}
          inwardItems={inwardItems}
          handleInputChange={handleInputChange}
          id={id}
          onCloseFocus={focusActionCell}
          isSupplierOutside={isSupplierOutside}
        />
      </Modal> */}
            <Modal
                isOpen={fillGrid}
                onClose={() => {
                    setFillGrid(false);

                    setTimeout(() => {
                        const firstInput = document.querySelector("#inwardQty-input-0");
                        if (firstInput) {
                            firstInput.focus();
                            firstInput.select(); // optional UX 🔥
                        }
                    }, 100); // small delay important
                }}
                widthClass={"w-[98%] h-[90%]"}
            >
                <PoItemsSelection
                    supplierId={supplierId}
                    inwardItems={inwardItems}
                    setInwardItems={setInwardItems}
                    branchId={branchId}
                    inwardType={inwardType}
                    setTempItems={setTempItems}
                    tempItems={tempItems}
                    searchDocId={searchDocId}
                    setSearchDocId={setSearchDocId}
                    setSearchDocDate={setSearchDocDate}
                    searchDocDate={searchDocDate}
                    onClose={() => setFillGrid(false)}
                />
            </Modal>
            <div className="border border-slate-200 px-2 bg-white rounded-md shadow-sm min-h-[270px] overflow-auto  w-full">

                <div
                    className={`w-full min-h-[205px] max-h-[300px] overflow-y-auto  my-2`}
                >
                    <table className="w-full border-collapse table-fixed">
                        <thead className="bg-gray-200 text-gray-800 sticky top-0 z-10">
                            <tr className="text-[12px]">
                                <th className={`w-12 px-4 py-2 text-center font-medium `}>
                                    S.No
                                </th>
                                {inwardType !== "Direct Inward" && (
                                    <th className={`w-24 px-4 py-2 text-center font-medium`}>
                                        PO No
                                    </th>
                                )}
                                <th className={`w-56 px-2 py-2 text-center font-medium`}>
                                    Item Group<span className="text-red-500">*</span>
                                </th>
                                <th className={`w-56 px-2 py-2 text-center font-medium`}>
                                    Item <span className="text-red-500">*</span>
                                </th>
                                <th className={`w-20 px-4 py-2 text-center font-medium`}>
                                    Size
                                </th>
                                <th className={`w-32 px-4 py-2 text-center font-medium`}>
                                    Color
                                </th>

                                <th className={`w-16 px-4 py-2 text-center font-medium`}>
                                    UOM
                                </th>






                                <th className={`w-16 px-4 py-2 text-center font-medium `}>
                                    Stock Qty<span className="text-red-500">*</span>
                                </th>
                                <th className={`w-16 px-4 py-2 text-center font-medium `}>
                                    Issue Qty<span className="text-red-500">*</span>
                                </th>

                                <th className={`w-12 px-1 py-2 text-center font-medium `}>
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(inwardItems ? inwardItems : [])?.map((row, index) => (
                                <tr
                                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-100"} border border-blue-gray-200 cursor-pointer h-6`}
                                    key={index}
                                    onContextMenu={(e) => {
                                        if (!readOnly) {
                                            handleRightClick(e, index, "");
                                        }
                                    }}
                                >
                                    <td className="w-12 border border-gray-300 text-[11px]  text-center">
                                        {index + 1}
                                    </td>

                                    <td className=" text-[11px] border border-gray-300 text-left">
                                        <FxSelectWithAdd
                                            inputId={`itemId-input-${index}`}
                                            value={row.itemGroupId}
                                            onChange={(val) =>
                                                handleInputChange(val, index, "itemGroupId")
                                            }
                                            options={(itemGroupList?.data || [])
                                                .filter((item) => (id ? true : item.active))
                                                .map((item) => ({
                                                    label: item.name,
                                                    value: item.id,
                                                }))}
                                            disabled={true}
                                            placeholder=""
                                            onBlur={() =>
                                                handleInputChange(row.itemGroupId, index, "itemGroupId")
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "itemGroupId");
                                                }
                                            }}
                                            addNew={true}
                                            childComponent={ItemGroup}
                                            addNewModalWidth="w-[50%] h-[55%]"
                                            nextRef={vehicleRef}
                                        />
                                    </td>
                                    <td className=" text-[11px] border border-gray-300 text-left">
                                        <FxSelectWithAdd
                                            inputId={`itemId-input-${index}`}
                                            value={row.itemId}
                                            onChange={(val) =>
                                                handleInputChange(val, index, "itemId")
                                            }
                                            options={(styleItemList?.data?.filter(i => i.itemGroupId == row.itemGroupId) || [])
                                                .filter((item) => (id ? true : item.active))
                                                .map((item) => ({
                                                    label: item.name,
                                                    value: item.id,
                                                }))}
                                            readOnly={readOnly || inwardType !== "Direct Inward" || !row.itemGroupId}
                                            placeholder=""
                                            onBlur={() =>
                                                handleInputChange(row.itemId, index, "itemId")
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "itemId");
                                                }
                                            }}
                                            addNew={true}
                                            childComponent={StyleItemMaster}
                                            addNewModalWidth="w-[50%] h-[55%]"
                                            nextRef={vehicleRef}
                                            disabled={true}

                                        />
                                    </td>
                                    <td className=" border border-gray-300 text-[11px] ">
                                        <FxSelectWithAdd
                                            value={row.sizeId}
                                            onChange={(val) =>
                                                handleInputChange(val, index, "sizeId")
                                            }
                                            options={getUniqueArrayBySize(
                                                styleItemList?.data,
                                                sizeList?.data,
                                                "sizeId",
                                                row.styleItemId,
                                            )
                                                .filter((item) => (id ? true : item.active))
                                                .map((item) => ({
                                                    label: item.name,
                                                    value: item.id,
                                                }))}
                                            readOnly={readOnly || inwardType !== "Direct Inward"}
                                            placeholder=""
                                            onBlur={() =>
                                                handleInputChange(row.sizeId, index, "sizeId")
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "sizeId");
                                                }
                                            }}
                                            addNew={true}
                                            childComponent={Size}
                                            addNewModalWidth="w-[30%] h-[45%]"
                                            disabled={true}

                                        />
                                    </td>
                                    <td className=" border border-gray-300 text-[11px] ">
                                        <FxSelectWithAdd
                                            value={row.colorId}
                                            onChange={(val) =>
                                                handleInputChange(val, index, "colorId")
                                            }
                                            options={(colorList?.data || [])
                                                .filter((item) => (id ? true : item.active))
                                                .map((item) => ({
                                                    label: item.name,
                                                    value: item.id,
                                                }))}
                                            readOnly={readOnly || inwardType !== "Direct Inward"}
                                            placeholder=""
                                            onBlur={() =>
                                                handleInputChange(row.colorId, index, "colorId")
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "colorId");
                                                }
                                            }}
                                            addNew={true}
                                            childComponent={ColorMaster}
                                            addNewModalWidth="w-[30%] h-[45%]"
                                            disabled={true}

                                        />
                                    </td>

                                    <td className=" border border-gray-300 text-[11px] ">
                                        <FxSelect
                                            value={row.uomId}
                                            onChange={(val) => handleInputChange(val, index, "uomId")}
                                            options={(uomList?.data || [])
                                                .filter((item) => (id ? true : item.active))
                                                .map((item) => ({
                                                    label: item.name,
                                                    value: item.id,
                                                }))}
                                            // readOnly={true}
                                            placeholder=""
                                            onBlur={() =>
                                                handleInputChange(row.uomId, index, "uomId")
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "uomId");
                                                }
                                            }}
                                            disabled={true}

                                        />
                                    </td>


                                    <td className=" border border-gray-300 text-[11px] text-right px-2">
                                        {parseFloat(row.netQty || 0).toFixed(2)}
                                    </td>


                                    <td className="border-blue-gray-200 text-[11px] border border-gray-300 text-right">
                                        <input
                                            id={`issueQty-input-${index}`}
                                            onKeyDown={(e) => {
                                                if (e.code === "Minus" || e.code === "NumpadSubtract")
                                                    e.preventDefault();

                                                if (e.key === "Delete") {
                                                    handleInputChange("", index, "issueQty", row);
                                                }
                                                if (
                                                    inwardType !== "Direct Inward" ||
                                                    receiptType !== "Against Invoice"
                                                ) {

                                                }
                                                if (e.key === "Tab" && e.target.value === "") {
                                                    e.preventDefault(); // ← this was missing
                                                    vehicleRef.current?.focus();
                                                }
                                            }}
                                            min={"0"}
                                            type="number"
                                            className="text-right px-1 w-full table-data-input"
                                            onFocus={(e) => {
                                                e.target.select();
                                                setFocusedField(`${index}-issueQty`);
                                            }}
                                            value={
                                                focusedField === `${index}-issueQty`
                                                    ? (row?.issueQty ?? "")
                                                    : row?.issueQty
                                                        ? Number(row.issueQty).toFixed(2)
                                                        : ""
                                            }
                                            onChange={(e) =>
                                                handleInputChange(e.target.value, index, "issueQty", row)
                                            }
                                            onBlur={(e) => {
                                                const val = e.target.value;
                                                handleInputChange(val ? Number(val).toFixed(2) : "", index, "issueQty", row);
                                                setFocusedField(null);
                                            }}
                                            disabled={(row.netQty ?? 0) <= 0}
                                        />
                                    </td>



                                    <td className="w-2 border border-gray-300">
                                        <input
                                            ref={(el) => (actionRefs.current[index] = el)}
                                            className="w-full table-data-input"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    if (!receiptType) {
                                                        Swal.fire({
                                                            title: "Please select Receipt Basis",
                                                            icon: "warning",
                                                            confirmButtonText: "OK",
                                                        });
                                                        return;
                                                    }
                                                    if (inwardType === "Direct Inward") {
                                                        if (index === inwardItems.length - 1) {
                                                            addRow();
                                                        }
                                                    } else if (
                                                        receiptType === "Against Invoice" ||
                                                        receiptType === "Without Invoice"
                                                    ) {
                                                        if (index === inwardItems.length - 1) {
                                                            addRow();
                                                        }
                                                        const next = document.querySelector(
                                                            `#inwardQty-input-${index + 1}`,
                                                        );
                                                        if (next) next.focus();
                                                    } else {
                                                        addRow();
                                                    }
                                                }
                                            }}
                                            disabled={readOnly}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-50 h-6 font-medium text-gray-800 text-[12px]">
                                <td
                                    className="text-right px-4 border border-gray-300 font-medium "
                                    colSpan={inwardType !== "Direct Inward" ? 7 : 6}
                                >
                                    Total
                                </td>
                                {inwardType !== "Direct Inward" && (
                                    <>
                                        <td className="text-right border border-gray-300 px-1 font-medium ">
                                            {inwardItems
                                                ?.reduce(
                                                    (sum, row) => sum + (Number(row.poQty) || 0),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </td>
                                        <td className="text-right border border-gray-300 px-1 font-medium  ">
                                            {inwardItems
                                                ?.reduce(
                                                    (sum, row) =>
                                                        sum + (Number(row.alreadyCancelQty) || 0),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </td>
                                        <td className="text-right border border-gray-300 px-1 font-medium ">
                                            {inwardItems
                                                ?.reduce(
                                                    (sum, row) =>
                                                        sum + (Number(row.alreadyInwardQty) || 0),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </td>
                                        <td className="text-right border border-gray-300 px-1 font-medium ">
                                            {inwardItems
                                                ?.reduce(
                                                    (sum, row) =>
                                                        sum + (Number(row.alreadyReturnQty) || 0),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </td>
                                        <td className="text-right border border-gray-300 px-1 font-medium ">
                                            {inwardItems
                                                ?.reduce(
                                                    (sum, row) => sum + (Number(row.balQty) || 0),
                                                    0,
                                                )
                                                .toFixed(2)}
                                        </td>
                                    </>
                                )}
                                <td className="text-right border border-gray-300 px-1 font-medium ">
                                    {inwardItems
                                        ?.reduce(
                                            (sum, row) => sum + (Number(row.inwardQty) || 0),
                                            0,
                                        )
                                        .toFixed(2)}
                                </td>
                                {(inwardType === "Direct Inward" ||
                                    receiptType === "Against Invoice") && (
                                        <td className="text-right border border-gray-300 px-1 font-medium ">
                                            {inwardItems
                                                ?.reduce((sum, row) => sum + (Number(row.price) || 0), 0)
                                                .toFixed(2)}
                                        </td>
                                    )}
                                {receiptType === "Against Invoice" && (
                                    <td className="text-right border border-gray-300 px-1 font-medium ">
                                        {inwardItems
                                            ?.reduce((sum, row) => {
                                                const qty = parseFloat(row.inwardQty) || 0;
                                                const price = parseFloat(row.price) || 0;
                                                return sum + qty * price;
                                            }, 0)
                                            .toFixed(2)}
                                    </td>
                                )}
                                {receiptType === "Against Invoice" && (
                                    <td
                                        className="text-right border border-gray-300"
                                        colSpan={1}
                                    ></td>
                                )}

                                <td className="border border-gray-300"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {contextMenu && (
                    <div
                        style={{
                            position: "fixed",
                            top: `${contextMenu.mouseY - 20}px`,
                            left: `${contextMenu.mouseX - 50}px`,
                            boxShadow: "0px 0px 5px rgba(0,0,0,0.3)",
                            padding: "8px",
                            borderRadius: "4px",
                            zIndex: 1000,
                        }}
                        className="bg-gray-100"
                        onMouseLeave={handleCloseContextMenu}
                    >
                        <div className="flex flex-col gap-1">
                            <button
                                className=" text-black text-[12px] text-left rounded px-1"
                                onClick={() => {
                                    deleteRow(contextMenu.rowId);
                                    deleteSelectedRows();
                                    handleCloseContextMenu();
                                }}
                            >
                                Delete
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



        </>
    );
};

export default IssueItems;
