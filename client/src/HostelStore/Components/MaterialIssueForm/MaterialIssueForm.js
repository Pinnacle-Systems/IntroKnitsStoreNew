import { IoArrowBackCircleSharp } from "react-icons/io5";

import {
  DateInputNew,
  DropdownInput,
  ReusableInput,
  ReusableSearchableInput,
  TextArea,
  TextAreaNew,
  TextInput,
} from "../../../Inputs/index.js";
import { inwardTypes, productionTypeNew, productionTypes, receiptTypes } from "../../../Utils/DropdownData.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  findFromList,
  getCommonParams,
  ModeChip,
  renameFile,
} from "../../../Utils/helper.js";
import { toast } from "react-toastify";
import { FiEdit2, FiSave, FiPrinter } from "react-icons/fi";
import { HiOutlineRefresh } from "react-icons/hi";
import Swal from "sweetalert2";
import { dropDownListObject } from "../../../Utils/contructObject.js";
import {
  useAddPurchaseInwardEntryMutation,
  useGetPurchaseInwardEntryByIdQuery,
  useUpdatePurchaseInwardEntryMutation,
} from "../../../redux/uniformService/PurchaseInwardEntry.js";
import { useGetLocationMasterQuery } from "../../../redux/services/LocationMasterService.js";
import { useGetPoItemsQuery } from "../../../redux/uniformService/PoServices.js";
import { invalidatePurchaseModule } from "../../../redux/Dispatch/PurchaseInvalidateTags.js";
import useInvalidateTags from "../../../CustomHooks/useInvalidateTags.js";
import { PartyMaster, TaxTemplate } from "../index.js";
import { LocationMaster } from "../../../Basic/components/index.js";
import { DropdownWithModal } from "../../../Inputs/Reuseable.js";
import { calculateTaxWithHSNBreakupAndInsertIntoInwardItems } from "../PurchaseBillEntry/taxSummary.js";
import PoSummary from "../PurchaseOrder/PoSummary.js";
import Modal from "../../../UiComponents/Modal/index.js";
import { getImageUrlPath } from "../../../Constants/index.js";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { useGetPartyByIdQuery } from "../../../redux/services/PartyMasterService.js";
import IssueItems from "./InwardItems.js";
import { useGetStockforMaterialIssueQuery, useGetStockReportQuery } from "../../../redux/services/StockService.js";
import { useAddMaterialIssueMutation, useGetMaterialIssueByIdQuery, useUpdateMaterialIssueMutation } from "../../../redux/uniformService/MaterialIssue.js";
import TransactionEntryShell from "../ReusableComponents/TransactionEntryShell.jsx";
import TransactionHeaderSection from "../ReusableComponents/TransactionHeaderSection.jsx";
import CommonFormFooter from "../ReusableComponents/CommonFormFooter.jsx";
import { useGetOrderMasterQuery } from "../../../redux/services/OrderMasterService.js";
import { useGetLineMasterQuery } from "../../../redux/services/LineMasterService.js";
import SearchableTableCellSelect from "../ReusableComponents/SearchableTableCellSelect.jsx";
import { useGetEmployeeQuery } from "../../../redux/services/EmployeeMasterService.js";
import { useGetDepartmentQuery } from "../../../redux/services/DepartmentMasterService.js";
import { PDFViewer } from "@react-pdf/renderer";
import ThermalSalesPrintFormat from "./ThermalSalesPrintFormat.jsx";

const MaterialIssueFrom = ({
  onClose,
  id,
  setId,
  readOnly,
  setReadOnly,
  supplierList,
  uomList,
  styleItemList,
  itemGroupList,
  branchList,
  hsnList,
  sizeList,
  colorList,
  fromPoId,
  fromPoSupplierId,
  fromPoType,
  setFromPoId,
  setFromPoSupplierId,
  setFromPoType,
  taxTypeList,
  gsmList,
}) => {
  const today = new Date();

  const [docDate, setDocDate] = useState(
    moment.utc(today).format("YYYY-MM-DD"),
  );
  const [supplierId, setSupplierId] = useState("");
  const [inwardItems, setInwardItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [inwardType, setInwardType] = useState("Direct Inward");
  const [storeId, setStoreId] = useState("");
  const [docId, setDocId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [dcNo, setDcNo] = useState("");
  const [dcDate, setDcDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [invNo, setInvNo] = useState("");
  const [tempItems, setTempItems] = useState([]);
  const [searchDocId, setSearchDocId] = useState("");
  const [searchDocDate, setSearchDocDate] = useState("");
  const [dataPerPage, setDataPerPage] = useState("10");
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [receiptType, setReceiptType] = useState("");
  const [taxTemplateId, setTaxTemplateId] = useState("");
  const [discountType, setDiscountType] = useState("Percentage");
  const [discountValue, setDiscountValue] = useState();
  const [summary, setSummary] = useState(false);
  const [netBillValue, setNetBillValue] = useState("");
  const [attachmentModal, setAttachmentModal] = useState(false);
  const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const [productionType, setProductionType] = useState("InHouse");
  const [fillGrid, setFillGrid] = useState(false);

  const [searchInwardNo, setSearchInwardNo] = useState("");
  const [searchInwardDate, setSearchInwardDate] = useState("");
  const [searchItemGroup, setSearchItemGroup] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [searchSize, setSearchSize] = useState("");
  const [searchColor, setSearchColor] = useState("");
  const [searchUom, setSearchUom] = useState("");
  const [orderId, setOrderId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [childRecord, setChildRecord] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [thermalPrint, setThermalPrint] = useState(false);

  const supplierRef = useRef(null);
  const [dispatchInvalidate] = useInvalidateTags();
  const vehicleRef = useRef(null);

  const { userId, finYearId, branchId } = getCommonParams();
  const { data: locationData } = useGetLocationMasterQuery({
    params: { branchId },
  });

  const storeOptions = locationData
    ? locationData.data.filter(
      (item) => parseInt(item.locationId) === parseInt(locationId),
    )
    : [];

  const {
    data: singleData,
    isFetching: isSingleFetching,
    isLoading: isSingleLoading,
  } = useGetMaterialIssueByIdQuery(id, { skip: !id });

  const [addData] = useAddMaterialIssueMutation();
  const [updateData] = useUpdateMaterialIssueMutation();
  const { data: supplierData } = useGetPartyByIdQuery(supplierId, {
    skip: !supplierId,
  });


  const { data: orderData } = useGetOrderMasterQuery({});
  const { data: departmentData } = useGetDepartmentQuery({});
  const { data: employeeData } = useGetEmployeeQuery({});


  const searchFields = {
    searchDocId,
    searchDocDate,
    searchInwardNo,
    searchInwardDate,
    searchItemGroup: searchItemGroup.toUpperCase(),
    searchItem: searchItem.toUpperCase(),
    searchSize: searchSize.toUpperCase(),
    searchColor: searchColor.toUpperCase(),
    searchUom: searchUom.toUpperCase(),
  };

  const isSupplierOutside = useMemo(() => {
    return supplierData?.data?.City?.state?.name !== "TAMILNADU";
  }, [supplierData]);

  useEffect(() => {
    if (fromPoSupplierId && fromPoType && !id) {
      setSupplierId(fromPoSupplierId);
      setInwardType(fromPoType);
    }
  }, [fromPoSupplierId, fromPoType]);

  useEffect(() => {
    setCurrentPageNumber(1);
  }, [searchDocId, searchDocDate]);


  console.log(searchFields, "searchFields")

  const {
    data: stockDate,
    isLoading,
    isFetching,
    isError,
  } = useGetStockforMaterialIssueQuery({
    params: {
      branchId,
      supplierId,
      ...searchFields,
      pagination: true,
      dataPerPage,
      pageNumber: currentPageNumber,

    },
  });

  const syncFormWithDbItems = useCallback(
    (data) => {
      setTempItems(data);
    },
    [fillGrid, supplierId],
  );

  useEffect(() => {
    if (stockDate?.data) {
      syncFormWithDbItems(stockDate?.data);
    }
  }, [isLoading, isFetching, syncFormWithDbItems, stockDate]);

  const syncFormWithDb = useCallback(
    (data) => {
      setDocId(data?.docId ? data?.docId : "New");
      setDocDate(
        data?.docDate
          ? moment.utc(data.docDate).format("YYYY-MM-DD")
          : moment.utc(new Date()).format("YYYY-MM-DD"),
      );
      setInwardType(
        data?.inwardType || fromPoType || "Direct Inward",
      );
      setLocationId(data?.Store ? data.Store.locationId : branchId);
      setStoreId(data?.locationId ? data.locationId : "");
      setInwardItems(data?.MaterialIssueItems ? data?.MaterialIssueItems : []);
      setSupplierId(data?.supplierId || fromPoSupplierId || "");
      setDcDate(
        data?.dcDate ? moment.utc(data.dcDate).format("YYYY-MM-DD") : "",
      );
      setRemarks(data?.remarks || "");
      setDcNo(data?.dcNo ? data.dcNo : "");
      setVehicleNo(data?.vehicleNo ? data.vehicleNo : "");
      setInvNo(data?.invNo ? data?.invNo : "");
      setReceiptType(data?.receiptType || "");
      setTaxTemplateId(data?.taxTemplateId || "");
      setDiscountType(data?.discountType || "");
      setDiscountValue(data?.discountValue || "");
      setNetBillValue(parseFloat(data?.netBillValue)?.toFixed(2) || "");
      setAttachments(data?.attachments ? data?.attachments : []);
      setOrderId(data?.orderId || "");
      setDepartmentId(data?.departmentId || "");
      setEmployeeId(data?.employeeId || "");
      setChildRecord(data?.childRecord ? data?.childRecord : false)
    },
    [id, fromPoSupplierId, fromPoType],
  );

  useEffect(() => {
    if (id && singleData?.data) {
      syncFormWithDb(singleData.data);
    } else {
      syncFormWithDb(undefined);
    }
  }, [isSingleFetching, isSingleLoading, id, syncFormWithDb, singleData]);

  let data = {
    id,
    docDate,
    branchId,
    userId,
    inwardType,
    storeId,
    supplierId,
    dcNo,
    dcDate,
    remarks,
    vehicleNo,
    inwardItems: inwardItems?.filter((po) => po.itemId),
    finYearId,
    invNo,
    receiptType,
    taxTemplateId,
    discountType,
    discountValue,
    netBillValue,
    attachments: attachments?.filter((i) => i.filePath),
    productionType,
    orderId,
    departmentId,
    employeeId,
  };

  const handleSubmitCustom = async (callback, data, text, nextProcess) => {
    try {
      const formData = new FormData();
      for (let key in data) {
        if (key == "attachments") {
          console.log("attachments =>", data[key]);
          formData.append(
            key,
            JSON.stringify(
              data[key].map((i) => ({
                ...i,
                filePath:
                  i.filePath instanceof File ? i.filePath.name : i.filePath,
              })),
            ),
          );
          data[key].forEach((option) => {
            if (option?.filePath instanceof File) {
              formData.append("images", option.filePath);
            }
          });
        } else if (
          key === "inwardItems" ||
          Array.isArray(data[key]) ||
          (typeof data[key] === "object" && data[key] !== null)
        ) {
          formData.append(key, JSON.stringify(data[key])); // ✅ stringify arrays and objects
        } else {
          formData.append(key, data[key]); // ✅ primitives appended as-is
        }
      }
      let returnData;
      if (text === "Updated") {
        returnData = await callback({ id, body: data }).unwrap();
      } else {
        returnData = await callback(data).unwrap();
      }
      if (returnData.statusCode === 1) {
        toast.error(returnData.message);
      } else {
        Swal.fire({
          icon: "success",
          title: `${text || "Saved"} Successfully`,
          showConfirmButton: false,
          timer: 2000,
          didClose: () => {
            // ✅ Runs after Swal completely closes
            invalidatePurchaseModule();
            dispatchInvalidate();

            if (returnData.statusCode === 0) {
              if (nextProcess == "new") {
                setId(0);
                setDocId("New");
                syncFormWithDb(undefined);
                setFromPoId("");
                setFromPoSupplierId("");
                setFromPoType("");
                // ✅ Focus the Bill Type dropdown after all state updates
                setTimeout(() => {
                  supplierRef.current?.focus();
                }, 100);
              }
              if (nextProcess == "close") {
                onClose();
              }
            } else {
              toast.error(returnData?.message);
            }
          },
        });
      }
    } catch (error) {
      console.log("handle", error);
    }
  };

  const findDuplicates = (items) => {
    const seen = new Map(); // key -> first index
    const duplicates = [];

    items.forEach((row, index) => {
      const key = [
        row.itemId || "",
        row.itemGroupId || "",

        row.sizeId || "",
        row.colorId || "",
        row.gsmId || "",
      ].join("-");

      if (seen.has(key)) {
        duplicates.push({
          firstIndex: seen.get(key),
          duplicateIndex: index,
          itemId: row.itemId,
          itemGroupId: row.itemGroupId,
          sizeId: row.sizeId,
          colorId: row.colorId,
          gsmId: row.gsmId,
        });
      } else {
        seen.set(key, index);
      }
    });

    return duplicates; // empty array = no duplicates
  };

  function isGridDatasValid(datas, isRequiredAllData, mandatoryFields = []) {
    console.log(datas, "datas");
    console.log(isRequiredAllData, "isRequiredAllData");
    console.log(mandatoryFields, "mandatoryFields")

    // If the array is empty, we consider it invalid because there must be at least one row.
    if (!datas || datas.length === 0) {
      return false;
    }

    const isInvalidValue = (value) => {
      if (value === "" || value === null || value === undefined || value === "NaN") return true;
      if (typeof value === "number" && isNaN(value)) return true;

      if (String(value).trim() !== "" && !isNaN(Number(value)) && Number(value) === 0) {
        return true;
      }

      return false;
    };

    if (isRequiredAllData) {
      return datas.every(obj => Object.values(obj).every(value => !isInvalidValue(value)));
    } else {
      return datas.every(obj =>
        mandatoryFields.every(field => {
          const value = obj[field];
          return value !== undefined && !isInvalidValue(value);
        })
      );
    }
  }

  const validateData = (data) => {
    const items = data?.inwardItems || [];
    const filledItems = items.filter((item) => item.styleItemId);
    const isAgainstInvoice = data.receiptType === "Against Invoice";
    const isAmountMatched =
      Number(data?.netBillValue).toFixed(2) ===
      parseFloat(totals?.net || 0).toFixed(2);
    const checks = [
      { condition: !data.productionType, title: "Production Type is required!" },
      { condition: !data.storeId, title: "From Location is required!" },
      { condition: !data.supplierId, title: "Supplier is required!" },
      { condition: !data.orderId, title: "Order No is required!" },
      { condition: !data.departmentId, title: "Department is required!" },
      { condition: !data.employeeId, title: "Incharge Name is required!" },


      {
        condition: !isGridDatasValid(data?.inwardItems, false, [
          "itemId",
          "uomId",
          "issueQty",
        ]),
        title: "Please fill all required item fields!",
      },

      {
        condition: findDuplicates(filledItems).length > 0,
        title: "Duplicate Item Found!",
        html: (() => {
          const dup = findDuplicates(filledItems)[0];
          return `ItemGroup - ${findFromList(dup?.itemGroupId, itemGroupList?.data, "name")},Item - ${findFromList(dup?.itemId, styleItemList?.data, "name")}, Size - ${findFromList(dup?.sizeId, sizeList?.data, "name")}, Color - ${findFromList(dup?.colorId, colorList?.data, "name")}, GSM - ${findFromList(dup?.gsmId, gsmList?.data, "name")}`;
        })(),
      },
    ];

    const failed = checks.find((c) => c.condition);
    if (failed) {
      Swal.fire({
        icon: "warning",
        title: failed.title,
        html: failed.html,
        timer: failed.html ? undefined : 1500,
        showConfirmButton: !!failed.html,
        confirmButtonText: "OK",
      });
      return false;
    }

    return true;
  };

  const enrichedItems = useMemo(() => {
    if (!inwardItems?.length) return inwardItems;
    const { items, ...totals } =
      calculateTaxWithHSNBreakupAndInsertIntoInwardItems(
        structuredClone(inwardItems), // clone to avoid mutating state
        isSupplierOutside,
        discountType,
        discountValue,
      );
    return { items, totals };
  }, [inwardItems, discountType, discountValue, isSupplierOutside]);

  const enrichedItemsList = enrichedItems?.items || [];
  const totals = enrichedItems?.totals || {};

  const saveData = (nextProcess) => {
    if (!validateData(data)) {
      return;
    }
    if (id) {
      if (!window.confirm("Are you sure update the details ...?")) {
        return;
      }
    }
    if (nextProcess == "draft" && !id) {
      handleSubmitCustom(
        addData,
        (data = { ...data, draftSave: true }),
        "Added",
        nextProcess,
      );
    } else if (id && nextProcess == "draft") {
      handleSubmitCustom(
        updateData,
        { ...data, draftSave: true },
        "Updated",
        nextProcess,
      );
    } else if (id) {
      handleSubmitCustom(updateData, data, "Updated", nextProcess);
    } else {
      handleSubmitCustom(addData, data, "Added", nextProcess);
    }
  };

  const handleKeyDown = (event) => {
    let charCode = String.fromCharCode(event.which).toLowerCase();
    if ((event.ctrlKey || event.metaKey) && charCode === "s") {
      event.preventDefault();
      saveData("close");
    }
  };

  useEffect(() => {
    if (!id && !fromPoId) {
      // ⬅️ guard
      setInwardItems([]);
    }
  }, [supplierId]);

  useEffect(() => {
    supplierRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!id) {
      setTaxTemplateId(
        taxTypeList?.data?.filter((item) => item.name === "DEFAULT")[0]?.id,
      );
    }
  }, []);

  useEffect(() => {
    if (attachments?.length >= 5) return;
    setAttachments((prev) => {
      let newArray = Array.from({ length: 5 - prev?.length }, () => {
        return { date: today, filePath: "", log: "" };
      });
      return [...prev, ...newArray];
    });
  }, [setAttachments, attachments]);

  function handleInputChange(value, index, field) {
    const newBlend = structuredClone(attachments);
    newBlend[index][field] = value;
    setAttachments(newBlend);
  }

  function openPreview(filePath) {
    window.open(
      filePath instanceof File
        ? URL.createObjectURL(filePath)
        : getImageUrlPath(filePath),
    );
  }

  function addNewComments() {
    setAttachments((prev) => [...prev, { log: "", date: today, filePath: "" }]);
    // setDueDate(moment.utc(today).format("YYYY-MM-DD"));
  }

  function deleteRow(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function suppliers() {
    if (productionType === "InHouse") {
      return supplierList?.data?.filter((item) => item?.active && item?.isSupplier && item?.inhouse === true);
    } else {
      return supplierList?.data?.filter((item) => item?.active && item?.isSupplier && item?.outside === true);
    }
  }


  const footerContent = (
    <CommonFormFooter

      readOnly={readOnly}

      // saveCloseButtonRef={saveCloseButtonRef}
      // saveNewButtonRef={saveNewButtonRef}


      leftActions={
        <>
          <button onClick={() => saveData("close")}
            disabled={readOnly}
            className="bg-indigo-500 text-white px-4 py-1 rounded-md hover:bg-indigo-600 flex items-center text-sm">
            <HiOutlineRefresh className="w-4 h-4 mr-2" />
            Save & Close
          </button>
          <button onClick={() => saveData("new")} disabled={readOnly} className="bg-indigo-500 text-white px-4 py-1 rounded-md hover:bg-indigo-600 flex items-center text-sm">
            <FiSave className="w-4 h-4 mr-2" />
            Save & New
          </button>
        </>
      }
      rightActions={
        <>
          <button
            className="bg-slate-600 text-white px-4 py-1 rounded-md hover:bg-slate-700 flex items-center text-sm"
            onClick={() => {

              setThermalPrint(true);
            }}
          // disabled={childRecord}
          >
            <FiPrinter className="w-4 h-4 mr-2" />
            Thermal Print
          </button>
          <button
            className="bg-yellow-600 text-white px-4 py-1 rounded-md hover:bg-yellow-700 flex items-center text-sm"
            onClick={() => {

              setReadOnly(false);
            }}
          // disabled={childRecord}
          >
            <FiEdit2 className="w-4 h-4 mr-2" />
            Edit
          </button>

        </>
      }
    />
  );

  const orderOptions = (id ? orderData?.data : orderData?.data?.filter(i => i.active) || [])?.map((item) => ({
    value: item.id,
    label: item?.docId || "",
  }));
  const departmentOptions = (id ? departmentData?.data : departmentData?.data?.filter(i => i.active) || [])?.map((item) => ({
    value: item.id,
    label: item?.name || "",
  }));

  const employeeOptions = (id ? employeeData?.data : employeeData?.data?.filter(i => i.active && i.departmentId == departmentId) || [])?.map((item) => ({
    value: item.id,
    label: item?.name || "",
  }));

  useEffect(() => {
    if (id || productionType != "InHouse") return
    const data = supplierList?.data?.filter((i) => (i.name).includes("INTRO KNITS"))?.[0]?.id
    console.log(data, "data123", suppliers())
    setSupplierId(data)
  }, [supplierList, productionType])

  return (
    <>
      <Modal
        isOpen={summary}
        onClose={() => setSummary(false)}
        widthClass={"p-10"}
      >
        <PoSummary
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          poItems={inwardItems}
          taxTypeId={taxTemplateId}
          readOnly={readOnly}
          totals={totals}
          setSummary={setSummary}
        />
      </Modal>
      <Modal isOpen={thermalPrint} onClose={() => setThermalPrint(false)} widthClass="w-[300pt] h-[95%]">
        <PDFViewer style={{ width: "100%", height: "90vh" }}>
          <ThermalSalesPrintFormat
            title="MATERIAL ISSUE"
            docId={docId}
            // date={date}
            branchData={findFromList(branchId, branchList?.data, "all")}
            items={inwardItems?.filter(i => i.itemId)}
            remarks={remarks}
            itemList={itemGroupList?.data}
            sizeList={sizeList?.data}
            colorList={colorList?.data}
            uomList={uomList?.data}
            supplierName={findFromList(supplierId, suppliers(), "name") || supplierData?.data?.name}
            orderNo={findFromList(orderId, orderData?.data, "name")}
            department={findFromList(departmentId, departmentData?.data, "name")}
            inchargeName={findFromList(employeeId, employeeData?.data, "name")}
            processType={productionType === "InHouse" ? "IN-HOUSE" : "OUT-SOURCE"}
          />
        </PDFViewer>
      </Modal>



      <TransactionEntryShell
        id={id}
        readOnly={readOnly}
        title="Material Issue Form"
        onClose={onClose}
        headerOpen={isHeaderOpen}
        setHeaderOpen={setIsHeaderOpen}
        // summaryItems={summaryItems}
        openStateClassName="max-h-[400px] opacity-100 overflow-visible"
        footer={footerContent}
        headerContent={(
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 overflow-visible">
            <TransactionHeaderSection title="Basic Details" className="col-span-1" bodyClassName="grid-cols-2">
              <ReusableInput
                label="Material Issue No"
                readOnly
                value={docId}
              />
              <ReusableInput
                label="Material Issue Date"
                value={docDate}
                type={"date"}
                required={true}
                readOnly={true}
                disabled
              />

            </TransactionHeaderSection>

            <TransactionHeaderSection title="Basic Details" className="col-span-1" bodyClassName="grid-cols-2">
              <DropdownInput
                name="Production Type"
                options={productionTypeNew}
                value={productionType}
                setValue={(value) => {
                  setProductionType(value);
                }}
                required={true}
                readOnly={readOnly}
                disabled={id}
                beforeChange={() => {
                  setInwardItems([]);
                }}
                autoFocus={true}

              />
              <DropdownWithModal
                name="From Location"
                options={dropDownListObject(
                  id
                    ? storeOptions
                    : storeOptions?.filter((item) => item?.active),
                  "storeName",
                  "id",
                )}
                value={storeId}
                setValue={setStoreId}
                required={true}
                readOnly={readOnly}
                className={`w-[150px]`}
                // disabled={childRecord.current > 0}
                addNewLabel="+ Add New Location"
                childComponent={LocationMaster}
                addNewModalWidth="w-[40%] h-[48%]"
                disabled={id}
              />
            </TransactionHeaderSection>

            <TransactionHeaderSection title="Customer Details" className="col-span-3 overflow-visible" bodyClassName="grid-cols-12 gap-1 overflow-visible">
              <div className="col-span-4">
                <DropdownWithModal
                  name="Supplier"
                  options={dropDownListObject(
                    id
                      ? supplierList?.data?.filter((item) => item?.isSupplier)
                      : suppliers(),
                    "name",
                    "id",
                  )}
                  value={supplierId}
                  setValue={setSupplierId}
                  required={true}
                  readOnly={readOnly}
                  className={`w-[150px]`}
                  addNewLabel="+ Add New Supplier"
                  childComponent={PartyMaster}
                  addNewModalWidth="w-[90%] h-[95%]"
                  disabled={id || !!fromPoSupplierId}
                />
              </div>


              {/* <div className="col-span-2">
                <TextInput
                  name={"Contact No"}
                  value={findFromList(supplierId, supplierList?.data, "contactNumber")}
                  readOnly={true}
                />
              </div>
              <div className="col-span-4">

                <TextAreaNew
                  name={"Address"}
                  rows={1}
                  value={findFromList(supplierId, supplierList?.data, "address")}
                  readOnly={true}
                />
              </div> */}
              <div className="col-span-2  ">
                <SearchableTableCellSelect
                  name="Order No"
                  options={orderOptions}
                  value={orderId}
                  setValue={setOrderId}
                  required={true}
                  readOnly={readOnly}
                  className={`w-[150px]`}
                  addNewModalWidth="w-[40%] h-[48%]"
                  disabled={childRecord}
                />
              </div>
              <div className="col-span-2  ">
                <SearchableTableCellSelect
                  name="Department "
                  options={departmentOptions}
                  value={departmentId}
                  setValue={setDepartmentId}
                  required={true}
                  readOnly={readOnly}
                  className={`w-[150px]`}
                  addNewModalWidth="w-[40%] h-[48%]"
                  disabled={childRecord}
                />
              </div>
              <div className="col-span-2  ">
                <SearchableTableCellSelect
                  name="Incharge Name"
                  options={employeeOptions}
                  value={employeeId}
                  setValue={setEmployeeId}
                  required={true}
                  readOnly={readOnly}
                  className={`w-[150px]`}
                  addNewModalWidth="w-[40%] h-[48%]"
                  disabled={childRecord}
                />
              </div>

              <TextInput
                name={"Process"}
                value={"CMT"}
                readOnly={true}
              />
              <div>
                <div className="col-span-1 flex items-end mt-5" >
                  <button
                    type="button"
                    className="w-full mb-3 p-2 text-xs bg-green-400 rounded hover:bg-lime-600 font-semibold transition hover:text-white"
                    onClick={() => setFillGrid(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setFillGrid(true);
                      }
                    }}
                    disabled={id || readOnly}
                  >
                    Fill Stock
                  </button>
                </div>
              </div>


            </TransactionHeaderSection >

          </div >
        )}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <IssueItems
            id={id}
            inwardItems={enrichedItemsList}
            setInwardItems={setInwardItems}
            readOnly={readOnly}
            uomList={uomList}
            hsnList={hsnList}
            styleItemList={styleItemList}
            itemGroupList={itemGroupList}
            inwardType={inwardType}
            supplierId={supplierId}
            branchId={branchId}
            sizeList={sizeList}
            colorList={colorList}
            setTempItems={setTempItems}
            tempItems={tempItems}
            searchDocId={searchDocId}
            setSearchDocId={setSearchDocId}
            setSearchDocDate={setSearchDocDate}
            searchDocDate={searchDocDate}
            vehicleRef={vehicleRef}
            fromPoId={fromPoId}
            receiptType={receiptType}
            taxTemplateId={taxTemplateId}
            gsmList={gsmList}
            isSupplierOutside={isSupplierOutside}
            setFillGrid={setFillGrid}
            fillGrid={fillGrid}


            searchInwardNo={searchInwardNo}
            setSearchInwardNo={setSearchInwardNo}
            searchInwardDate={searchInwardDate}
            setSearchInwardDate={setSearchInwardDate}
            searchItemGroup={searchItemGroup}
            setSearchItemGroup={setSearchItemGroup}
            searchItem={searchItem}
            setSearchItem={setSearchItem}
            searchSize={searchSize}
            setSearchSize={setSearchSize}
            searchColor={searchColor}
            setSearchColor={setSearchColor}
            searchUom={searchUom}
            setSearchUom={setSearchUom}
          />
        </div>

      </TransactionEntryShell >

    </>
  );
};
export default MaterialIssueFrom;
