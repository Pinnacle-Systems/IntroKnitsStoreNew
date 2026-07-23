import { getDateFromDateTimeToDisplay } from "../../../Utils/helper";

const PurchaseInwardItemsSelection = ({
  inwardItems = [],
  setInwardItems,
  onClose,
  tempItems = [],
  searchDocId,
  setSearchDocId,
  searchDocDate,
  setSearchDocDate,

  searchInwardNo,
  setSearchInwardNo,
  searchInwardDate,
  setSearchInwardDate,
  searchItemGroup,
  setSearchItemGroup,
  searchItem,
  setSearchItem,
  searchSize,
  setSearchSize,
  searchColor,
  setSearchColor,
  searchUom,
  setSearchUom,

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
  };

  // ─── Selection Logic ──────────────────────────────────────────────────────

  function addItem(item) {
    setInwardItems((prev) => {
      let newItems = structuredClone(prev);
      const alreadyExists = newItems.some(
        (v) => parseInt(v.id) === parseInt(item.id),
      );
      if (alreadyExists) return prev;
      const newRow = {
        ...item,
        styleItemId: item.styleItemId ?? "",
        uomId: item.uomId ?? "",
        hsnId: item.hsnId ?? "",
        poQty: item.poQty ?? "",
        poId: item.poId ?? "",
        alreadyCancelQty: item?.alreadyCancelQty ?? "",
        balQty: item.balQty ?? "",
        alreadyInwardQty: item.alreadyInwardQty ?? "",
        alreadyReturnQty: item.alreadyReturnQty ?? "",
        purchaseInwardId: item.purchaseInwardId ?? "",
        sizeId: item.sizeId ?? "",
        colorId: item.colorId ?? "",
        itemGroupId: item.itemGroupId ?? "",
        Po: item?.Po ?? "",
      };

      const emptyIndex = newItems.findIndex(
        (v) => !v.itemId || v.itemId === null,
      );

      if (emptyIndex !== -1) {
        newItems[emptyIndex] = newRow;
      } else {
        newItems.push(newRow);
      }

      return newItems;
    });
  }

  function removeItem(id) {
    setInwardItems((prev) => {
      let updated = prev.filter((r) => String(r.id) !== String(id));
      while (updated.length < 3) updated.push({ ...EMPTY_ROW });
      return updated;
    });
  }

  function handleSelectAllChange(value, inwardItems) {
    if (value) {
      inwardItems?.forEach((item) => addItem(item));
    } else {
      inwardItems?.forEach((item) => removeItem(item.id));
    }
  }

  function getSelectAll(inwardItems) {
    return inwardItems?.every((item) => isItemAddedd(item.id));
  }

  function handleChangee(id, obj) {
    if (isItemAddedd(id)) {
      removeItem(id);
    } else {
      addItem(obj);
    }
  }

  function isItemAddedd(id) {
    return (
      (inwardItems || [])?.findIndex(
        (item) => parseInt(item?.id) === parseInt(id),
      ) !== -1
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f1f1f0]">
      {/* HEADER */}
      <div className="border-b py-2 px-4 mx-3 flex justify-between items-center sticky top-0 z-10 bg-white mt-3">
        <h2 className="text-lg px-2 py-0.5 font-semibold text-gray-800">
          Available Stock Items
        </h2>
        <button
          type="button"
          onClick={() => {
            onClose();

            setTimeout(() => {
              const firstInput = document.querySelector("#issueQty-input-0");
              firstInput?.focus();
              firstInput?.select();
            }, 100);
          }}
          className="px-3 py-1 hover:bg-green-600 hover:text-white rounded text-green-600 
                     border border-green-600 flex items-center gap-1 text-xs"
        >
          Done
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-3">
        <div className="bg-white p-3 rounded-md border border-gray-200 h-full">
          <div className="border border-slate-200 p-2 bg-white rounded-md shadow-sm">
            <div className="relative w-full max-h-[420px] overflow-y-auto py-1">
              <table className="w-full text-xs border border-gray-200">
                <thead className="bg-gray-200 text-gray-800">
                  <tr>
                    <th className="px-1 py-1 w-6 border border-gray-300">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-medium mb-[2px]">Select</span>
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          onChange={(e) =>
                            handleSelectAllChange(
                              e.target.checked,
                              tempItems ? tempItems : []
                            )
                          }
                          checked={getSelectAll(tempItems ? tempItems : [])}
                        />
                      </div>
                    </th>

                    <th className="border border-gray-300 px-2 py-1 text-center text-xs w-10">
                      S No
                    </th>


                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-36">
                      <label>Item Group</label>
                      <input
                        type="text"
                        className="text-black h-6 focus:outline-none border border-gray-400 rounded-lg w-full"
                        placeholder="Search"
                        value={searchItemGroup}
                        onChange={(e) => setSearchItemGroup(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </th>

                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-36">
                      <label>Item</label>
                      <input
                        type="text"
                        className="text-black h-6 focus:outline-none border border-gray-400 rounded-lg w-full"
                        placeholder="Search"
                        value={searchItem}
                        onChange={(e) => setSearchItem(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </th>

                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-12">
                      <label>Size</label>
                      <input
                        type="text"
                        className="text-black h-6 focus:outline-none border border-gray-400 rounded-lg w-full"
                        placeholder="Search"
                        value={searchSize}
                        onChange={(e) => setSearchSize(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </th>

                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-24">
                      <label>Color</label>
                      <input
                        type="text"
                        className="text-black h-6 focus:outline-none border border-gray-400 rounded-lg w-full"
                        placeholder="Search"
                        value={searchColor}
                        onChange={(e) => setSearchColor(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </th>

                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-10">
                      <label>UOM</label>
                      <input
                        type="text"
                        className="text-black h-6 focus:outline-none border border-gray-400 rounded-lg w-full"
                        placeholder="Search"
                        value={searchUom}
                        onChange={(e) => setSearchUom(e.target.value)}
                        onFocus={(e) => e.target.select()}
                      />
                    </th>

                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-16">
                      Issued Qty
                    </th>
                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-16">
                      Return Qty
                    </th>
                    <th className="px-1 py-1.5 border border-gray-300 text-xs w-16">
                      Balance Qty
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {tempItems?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  ) : (
                    (tempItems || []).map((item, index) => (
                      <tr
                        key={index}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-100"
                          } border-b cursor-pointer hover:bg-gray-50`}
                        onClick={() => handleChangee(item?.id, item)}
                      >
                        <td className="text-center py-2 border border-gray-300">
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={isItemAddedd(item.id)}
                            readOnly
                          />
                        </td>

                        <td className="text-center border border-gray-300">
                          {index + 1}
                        </td>


                        <td className=" border border-gray-300 text-[11px]  py-1.5 px-2">
                          {item?.Itemgroup?.name}
                        </td>
                        <td className="border border-gray-300 text-[11px] py-1.5 px-2">
                          {item?.Item?.name}
                        </td>
                        <td className="border border-gray-300 text-[11px] py-1.5 px-2">
                          {item?.Size?.name}
                        </td>
                        <td className="border border-gray-300 text-[11px] py-1.5 px-2">
                          {item?.Color?.name}
                        </td>

                        <td className="border border-gray-300 text-[11px] py-1.5 px-2">
                          {item?.Uom?.name}
                        </td>
                        <td className=" border border-gray-300 text-[11px] text-right   py-1.5 px-2">
                          {parseFloat(item?.issueQty || 0).toFixed(2)}
                        </td>
                        <td className=" border border-gray-300 text-[11px] text-right   py-1.5 px-2">
                          {parseFloat(item?.alreadyReturnQty || 0).toFixed(2)}
                        </td>
                        <td className=" border border-gray-300 text-[11px] text-right   py-1.5 px-2">
                          {parseFloat(item?.balQty || 0).toFixed(2)}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInwardItemsSelection;
