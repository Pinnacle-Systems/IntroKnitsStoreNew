import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findFromList, getCommonParams, isGridDatasValid, sumArray } from "../../../Utils/helper";
import { ReusableInput } from "../Order/CommonInput";
import { DateInput, DropdownInput, ReusableSearchableInput, ReusableSearchableInputNewCustomerwithBranches, TextAreaNew, TextInput } from "../../../Inputs";
import { directOrPo } from "../../../Utils/DropdownData";
import { dropDownListObject } from "../../../Utils/contructObject";
import { useGetPartyByIdQuery } from "../../../redux/services/PartyMasterService";
import { toast } from "react-toastify";
import { FiChevronUp, FiEdit2, FiPrinter, FiSave } from "react-icons/fi";
import { HiOutlineRefresh, HiX } from "react-icons/hi";
import { useAddDirectInwardOrReturnMutation, useGetDirectInwardOrReturnByIdQuery, useUpdateDirectInwardOrReturnMutation } from "../../../redux/uniformService/DirectInwardOrReturnServices";
import moment from "moment";
import Swal from "sweetalert2";
import { useGetItemMasterQuery, useGetItemPriceListQuery } from "../../../redux/uniformService/ItemMasterService";
import { useGetSizeMasterQuery } from "../../../redux/uniformService/SizeMasterService";
import QuotationItems from "./QuotationItems";
import { useAddQuotationMasterMutation, useAddQuotationMutation, useGetQuotationByIdQuery, useGetQuotationMasterByIdQuery, useUpdateQuotationMasterMutation, useUpdateQuotationMutation } from "../../../redux/uniformService/quotationServices";
import Modal from "../../../UiComponents/Modal";
import { PDFViewer } from "@react-pdf/renderer";
import PremiumSalesPrintFormat from "../ReusableComponents/PremiumSalesPrintFormat";
import ThermalSalesPrintFormat from "../ReusableComponents/ThermalSalesPrintFormat";
import { useGetHsnMasterQuery } from "../../../redux/services/HsnMasterServices";
import CommonFormFooter from "../ReusableComponents/CommonFormFooter";
import useInvalidateTags from "../../../CustomHooks/useInvalidateTags";
import TransactionEntryShell from "../ReusableComponents/TransactionEntryShell";
import TransactionHeaderSection from "../ReusableComponents/TransactionHeaderSection";
import { useGetItemControlPanelMasterQuery } from "../../../redux/uniformService/ItemControlPanelService";
import { useFormKeyboardNavigation } from "../../../CustomHooks/useFormKeyboardNavigation";
import { areSalesRowsValid, checkDuplicateRows } from "../../../Utils/salesCatalogRules";
import { useGetoffersPromotionsQuery } from "../../../redux/uniformService/Offer&PromotionsService";
import ItemOfferModal from "../PointOfSale/components/ItemOfferModal";
import { calculateCartWithOffers, getPotentialOffers, getItemApplicableOffers } from "../../../Utils/offerEngine";
import { useGetcollectionsQuery } from "../../../redux/uniformService/CollectionsService";



const Quotaion = ({ onClose, id, setId, docId, setDocId, date, setDate, readOnly, setReadOnly, transType, setTransType,
  dcNo, setDcNo, dcDate, setDcDate, customerId, setCustomerId, payTermId, setPayTermId, locationId, setLocationId, storeId, setStoreId, poInwardOrDirectInward, setPoInwardOrDirectInward, inwardItemSelection, setInwardItemSelection, onNew, branchList, locationData, supplierList, setQuoteItems, quoteItems,
  yarnList, colorList, uomList, termsData


}) => {








  const [vehicleNo, setVehicleNo] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [remarks, setRemarks] = useState("")
  const [minimumAdvancePayment, setMinimumAdvancePayment] = useState("");
  const [isMinimumAdvanceManuallyEdited, setIsMinimumAdvanceManuallyEdited] = useState(false);
  const [searchValue, setSearchValue] = useState("")
  const [discountType, setDiscountType] = useState("")
  const [discountValue, setDiscountValue] = useState("")
  const [terms, setTerms] = useState("")
  const [term, setTerm] = useState("")
  const [packingChargeEnabled, setPackingChargeEnabled] = useState(false);
  const [packingCharge, setPackingCharge] = useState("");
  const [shippingChargeEnabled, setShippingChargeEnabled] = useState(false);
  const [shippingCharge, setShippingCharge] = useState("");
  const [courierChargeEnabled, setCourierChargeEnabled] = useState(false);
  const [courierCharge, setCourierCharge] = useState("");
  const [taxMethod, setTaxMethod] = useState("WithoutTax")
  const [contextMenu, setContextMenu] = useState(false)
  const [barcodePrintOpen, setBarcodePrintOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [thermalPrintOpen, setThermalPrintOpen] = useState(false);
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [selectedOffersByRow, setSelectedOffersByRow] = useState({});
  const [showItemOfferModal, setShowItemOfferModal] = useState(false);
  const [selectedItemForOffers, setSelectedItemForOffers] = useState(null);

  const handleSelectOfferForItem = (selectedItem, offer, isDeselect) => {
    const activeItemKey = `${selectedItem.itemId || selectedItem.id}-${selectedItem.sizeId || 0}-${selectedItem.colorId || 0}-${selectedItem.barcodeType || ""}`;

    setSelectedOffersByRow((prev) => {
      const next = { ...prev };

      if (isDeselect) {
        next[activeItemKey] = null;

        // Clear from other matching combo rows as well
        if (
          offer.OfferRule?.[0]?.conditions?.rules?.length > 1 ||
          offer.OfferRule?.[0]?.conditions?.rules?.[0]?.field === "Variant Matrix"
        ) {
          Object.keys(next).forEach((k) => {
            if (next[k] === offer.id) {
              next[k] = null;
            }
          });
        }
      } else {
        next[activeItemKey] = offer.id;

        const rules = offer.OfferRule?.[0]?.conditions?.rules || [];
        const isCombo = rules.length > 1 || rules[0]?.field === "Variant Matrix";

        if (isCombo) {
          (quoteItems || []).forEach((item) => {
            if (!item.itemId) return;
            const applicable = getItemApplicableOffers(item, quoteItems, activeOffers, collectionsData);
            const isEligible = applicable.some((o) => String(o.id) === String(offer.id));
            if (!isEligible) return;

            const itemKey = `${item.itemId || item.id}-${item.sizeId || 0}-${item.colorId || 0}-${item.barcodeType || ""}`;
            next[itemKey] = offer.id;
          });
        }
      }
      return next;
    });
  };

  const getItemApplicableOffersLocal = (item) => {
    if (!item || !activeOffers.length) return [];
    return getItemApplicableOffers(item, quoteItems || [], activeOffers, collectionsData);
  };
  const [childRecord, setChildRecord] = useState(0);


  const { branchId, companyId, userId, finYearId } = getCommonParams()


  const params = {
    branchId, companyId, userId, finYearId
  };

  const parseChargeAmount = (value) => {
    const parsedValue = parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  };
  const formatChargeValue = (value) => {
    if (value === "" || value === null || value === undefined) {
      return "";
    }
    return parseChargeAmount(value).toFixed(2);
  };


  console.log(quoteItems, "quoteItems")
  const { refs, handlers, focusFirstInput } = useFormKeyboardNavigation();
  const {
    firstInputRef,
    secondInputRef,
    movedToNextSaveNewRef,
    saveNewButtonRef,
    saveCloseButtonRef,
  } = refs;

  console.log(isMinimumAdvanceManuallyEdited, "isMinimumAdvanceManuallyEdited")


  const { data: supplierDetails } =
    useGetPartyByIdQuery(customerId, { skip: !customerId });

  const salesItemParams = { ...params, active: true };
  const { data: itemList } = useGetItemMasterQuery({ params: salesItemParams });
  const { data: sizeList } = useGetSizeMasterQuery({ params });
  const { data: hsnList } = useGetHsnMasterQuery({ params });
  const { data: itemPriceList } = useGetItemPriceListQuery({ params: salesItemParams });
  const { data: itemControlPanel } = useGetItemControlPanelMasterQuery({ params });
  const { data: offersData } = useGetoffersPromotionsQuery({ params: { ...params, active: true } });
  const activeOffers = offersData?.data?.filter(i => i.active) || [];

  const { data: collectionsData } = useGetcollectionsQuery({
    params: { branchId, userId, finYearId, active: true }
  })
  const {
    data: singleData,
    isFetching: isSingleFetching,
    isLoading: isSingleLoading,
  } = useGetQuotationByIdQuery(id, { skip: !id });

  const [addData] = useAddQuotationMutation();
  const [updateData] = useUpdateQuotationMutation();
  const [invalidateTagsDispatch] = useInvalidateTags();

  useEffect(() => {
    if (firstInputRef.current && !id) firstInputRef.current.focus();
  }, []);


  const FirstInputFocus = useRef(null);


  useEffect(() => {
    if (FirstInputFocus.current && !id) {
      FirstInputFocus.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setTerm("");
      setPackingChargeEnabled(false);
      setPackingCharge("");
      setShippingChargeEnabled(false);
      setShippingCharge("");
      setCourierChargeEnabled(false);
      setCourierCharge("");
    }
  }, [id]);


  const syncFormWithDb = useCallback((data) => {
    if (id) {
      if (!data) return;
      setReadOnly(true);
    } else {
      setReadOnly(false);
    }
    setQuoteItems(data?.QuotationItems ? data.QuotationItems : []);
    setCustomerId(data?.customerId ? data?.customerId : "")
    if (data?.docId) {
      setDocId(data?.docId)
    }
    if (data?.date) setDate(data?.date);
    setRemarks(data?.remarks || "");
    setTerms(data?.termsAndCondition || "");
    const nextPackingCharge = formatChargeValue(data?.packingCharge);
    const nextShippingCharge = formatChargeValue(data?.shippingCharge);
    const nextCourierCharge = formatChargeValue(data?.courierCharge);
    setPackingCharge(nextPackingCharge);
    setShippingCharge(nextShippingCharge);
    setCourierCharge(nextCourierCharge);
    setPackingChargeEnabled(Boolean(data?.packingChargeEnabled) || parseChargeAmount(nextPackingCharge) > 0);
    setShippingChargeEnabled(Boolean(data?.shippingChargeEnabled) || parseChargeAmount(nextShippingCharge) > 0);
    setCourierChargeEnabled(Boolean(data?.courierChargeEnabled) || parseChargeAmount(nextCourierCharge) > 0);
    setMinimumAdvancePayment(data?.minimumAdvancePayment ? String(data?.minimumAdvancePayment) : "");
    setIsMinimumAdvanceManuallyEdited(data?.isMinAdvanceEdited ? Boolean(data?.isMinAdvanceEdited) : false)
    setSelectedOffersByRow(data?.selectedOffersByRow || {});
    setChildRecord(data?.Saleorder?.length > 0 ? true : false)
  }, [id]);

  useEffect(() => {
    if (id && singleData?.data) {
      syncFormWithDb(singleData?.data);
    } else if (!id) {
      syncFormWithDb(undefined);
    }
  }, [isSingleFetching, isSingleLoading, id, syncFormWithDb, singleData]);

  const potentialOffers = useMemo(() => getPotentialOffers(activeOffers, quoteItems || []), [activeOffers, quoteItems]);
  const { cartWithOffers: quoteItemsWithOffers } = useMemo(() => calculateCartWithOffers(quoteItems || [], selectedOffersByRow, potentialOffers, activeOffers), [quoteItems, selectedOffersByRow, potentialOffers, activeOffers]);

  const data = {
    docId,
    poType: transType,
    poInwardOrDirectInward,
    supplierId: customerId, dcDate,
    payTermId,
    id, userId,
    storeId,
    quoteItems: quoteItemsWithOffers?.filter(i => i.itemId),
    discountType,
    discountValue,
    dcNo,
    remarks,
    minimumAdvancePayment,
    specialInstructions,
    vehicleNo,
    finYearId,
    locationId: locationId ? parseInt(locationId) : undefined,
    branchId,
    customerId,
    termsAndCondition: terms,
    packingChargeEnabled,
    packingCharge: packingChargeEnabled ? String(parseChargeAmount(packingCharge).toFixed(2)) : "",
    shippingChargeEnabled,
    shippingCharge: shippingChargeEnabled ? String(parseChargeAmount(shippingCharge).toFixed(2)) : "",
    courierChargeEnabled,
    courierCharge: courierChargeEnabled ? String(parseChargeAmount(courierCharge).toFixed(2)) : "",
    taxMethod,
    selectedOffersByRow,
    isMinAdvanceEdited: isMinimumAdvanceManuallyEdited
  }

  console.log(data, "data")








  const validateData = (data) => {

    if (data?.customerId) {
      return true
    }

    return false
  }







  const handleSubmitCustom = async (callback, data, text, nextProcess) => {
    try {
      let returnData;
      if (text === "Updated") {
        returnData = await callback(data).unwrap();
      } else {
        returnData = await callback(data).unwrap();
      }
      if (returnData.statusCode === 1) {
        // toast.error(returnData.message);
        Swal.fire({
          icon: 'error',
          title: `${returnData?.message}`,
        });
      } else {

        if (returnData.statusCode === 0) {
          Swal.fire({
            icon: 'success',
            title: `${text || 'Saved'} Successfully`,
          });
          invalidateTagsDispatch()

          if (nextProcess == "new") {
            syncFormWithDb(undefined);
            onNew()
          }
          else {
            onClose()
          }

        } else {
          Swal.fire({
            icon: 'error',
            title: `${returnData?.message}!`,
          });
        }





      }
    } catch (error) {
      console.log("handle");
    }
  };

  function removeItem(id) {
    setQuoteItems(directInwardItems => {
      let newItems = structuredClone(directInwardItems);
      newItems = newItems.filter(item => parseInt(item.poItemsId) !== parseInt(id))
      return newItems
    });
  }






  const saveData = (nextProcess) => {
    if (!validateData(data)) {


      Swal.fire({
        title: "Please fill all required fields...!",
        icon: "success",

      });
      return
    }


    const duplicateCheck = checkDuplicateRows(data?.quoteItems?.filter(i => i.itemId), ['itemId', 'sizeId', 'colorId', "barcodeType"]);
    if (duplicateCheck.isDuplicate) {
      Swal.fire({
        title: "Duplicate Items Found",
        text: duplicateCheck.message,
        icon: "warning",
      });
      return;
    }

    // if (!areSalesRowsValid((data?.quoteItems)?.filter(i => i.itemId), itemList?.data, itemPriceList?.data)) {
    //   Swal.fire({
    //     title: "Please fill all Quote Items Mandatory fields...!",
    //     icon: "warning",
    //   });
    //   return;
    // }

    if (
      !isGridDatasValid(data?.quoteItems?.filter((i) => i.itemId), false, ["itemId", "uomId", "qty", "price",])
    ) {
      Swal.fire({
        title: "Please fill all Quote Items Mandatory fields...!",
        icon: "warning",
      });
      return;
    }
    if (!window.confirm("Are you sure save the details ...?")) {
      return
    }
    if (nextProcess == "draft" && !id) {
      handleSubmitCustom(addData, data = { ...data, draftSave: true }, "Added", nextProcess);
    }


    else if (id && nextProcess == "draft") {

      handleSubmitCustom(updateData, data = { ...data, draftSave: true }, "Updated", nextProcess);
    }
    else if (id) {

      handleSubmitCustom(updateData, data, "Updated", nextProcess);
    } else {
      handleSubmitCustom(addData, data, "Added", nextProcess);
    }
  }

  const totalOfferDiscount = quoteItemsWithOffers.reduce((sum, item) => item.priceType === 'offerPrice' ? sum + Math.max(0, (parseFloat(item.salesPrice || item.price || 0) - parseFloat(item.price || 0)) * parseFloat(item.qty || 0)) : sum, 0);

  function getTotalQty() {
    let qty = quoteItemsWithOffers?.reduce((acc, curr) => { return acc + parseFloat(curr?.qty ? curr?.qty : 0) }, 0)
    return parseFloat(qty || 0).toFixed(3)
  }
  const calculateTotals = () => {
    return (
      quoteItemsWithOffers?.reduce(
        (acc, curr) => {
          const price = parseFloat(curr.price || 0);
          const qty = parseFloat(curr.qty || 0);
          const taxPercent = parseFloat(curr.taxPercent || 0);
          const taxMethod = curr.taxMethod || "Inclusive";

          const discountType = curr.discountType; // "Percentage" | "Flat"
          const discountValue = parseFloat(curr.discountValue || 0);

          const gross = price * qty;

          // ✅ Step 1: Apply Discount
          let discountedAmount = gross;

          if (discountType === "Percentage") {
            discountedAmount =
              gross - (gross * discountValue) / 100;
          } else if (discountType === "Flat") {
            discountedAmount = gross - discountValue;
          }

          // Prevent negative
          discountedAmount = Math.max(0, discountedAmount);

          let subTotal = 0;
          let taxAmount = 0;
          let netAmount = 0;

          // ✅ Step 2: Tax Calculation
          if (taxMethod === "Inclusive" && taxPercent > 0) {
            subTotal = discountedAmount / (1 + taxPercent / 100);
            taxAmount = discountedAmount - subTotal;
            netAmount = discountedAmount;
          } else {
            subTotal = discountedAmount;
            taxAmount = subTotal * (taxPercent / 100);
            netAmount = subTotal + taxAmount;
          }

          // ✅ Accumulate
          acc.subtotal += subTotal;
          acc.taxAmount += taxAmount;
          acc.netAmount += netAmount;

          return acc;
        },
        { subtotal: 0, taxAmount: 0, netAmount: 0 }
      ) || { subtotal: 0, taxAmount: 0, netAmount: 0 }
    );
  };

  const { subtotal, taxAmount, netAmount } = calculateTotals();
  const extraCharges = (packingChargeEnabled ? parseChargeAmount(packingCharge) : 0) + (shippingChargeEnabled ? parseChargeAmount(shippingCharge) : 0) + (courierChargeEnabled ? parseChargeAmount(courierCharge) : 0);
  const adjustedNetAmount = netAmount + extraCharges;

  const defaultMinimumAdvancePayment = (parseFloat(adjustedNetAmount || 0) * 0.25).toFixed(2);

  console.log(defaultMinimumAdvancePayment, "minimumAdvancePayment", minimumAdvancePayment, adjustedNetAmount)

  useEffect(() => {
    setMinimumAdvancePayment(defaultMinimumAdvancePayment);

  }, [netAmount, extraCharges])




  const chargeRows = [
    ...(packingChargeEnabled
      ? [{
        key: "packingCharge",
        label: "Packing Charge",
        summaryColumn: "right",
        renderValue: () => (
          <input
            type="number"
            value={packingCharge}
            onChange={(event) => setPackingCharge(event.target.value)}
            onBlur={() => setPackingCharge(formatChargeValue(packingCharge))}
            readOnly={readOnly}
            className={`h-7 w-24 rounded border border-slate-300 px-1.5 py-0 text-right text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 ${readOnly ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"}`}
          />
        ),
      }]
      : []),
    ...(shippingChargeEnabled
      ? [{
        key: "shippingCharge",
        label: "Shipping Charge",
        summaryColumn: "right",
        renderValue: () => (
          <input
            type="number"
            value={shippingCharge}
            onChange={(event) => setShippingCharge(event.target.value)}
            onBlur={() => setShippingCharge(formatChargeValue(shippingCharge))}
            readOnly={readOnly}
            className={`h-7 w-24 rounded border border-slate-300 px-1.5 py-0 text-right text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 ${readOnly ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"}`}
          />
        ),
      }]
      : []),
    ...(courierChargeEnabled
      ? [{
        key: "courierCharge",
        label: "Courier Charge",
        summaryColumn: "right",
        renderValue: () => (
          <input
            type="number"
            value={courierCharge}
            onChange={(event) => setCourierCharge(event.target.value)}
            onBlur={() => setCourierCharge(formatChargeValue(courierCharge))}
            readOnly={readOnly}
            className={`h-7 w-24 rounded border border-slate-300 px-1.5 py-0 text-right text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 ${readOnly ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"}`}
          />
        ),
      }]
      : []),
  ];

  const summaryItems = [
    { label: "No", value: docId },
    { label: "Date", value: date },
    {
      label: "Customer",
      value:
        supplierDetails?.data?.name ||
        findFromList(customerId, supplierList?.data, "name") ||
        findFromList(customerId, supplierList?.data, "aliasName"),
    },
    {
      label: "Phone",
      value:
        supplierDetails?.data?.contactPersonNumber ||
        findFromList(customerId, supplierList?.data, "contactPersonNumber"),
    },
    {
      label: "Address",
      value:
        supplierDetails?.data?.address ||
        findFromList(customerId, supplierList?.data, "address"),
    },
  ];

  const handleTermTemplateChange = (value) => {
    setTerm(value);
  };

  const footerContent = (
    <CommonFormFooter
      remarks={remarks}
      setRemarks={setRemarks}
      terms={terms}
      setTerms={setTerms}
      readOnly={readOnly}
      showTermSelect
      termValue={term}
      onTermChange={handleTermTemplateChange}
      termOptions={((id ? termsData?.data : termsData?.data?.filter((item) => item?.active)) || []).map((blend) => ({
        value: blend.id,
        label: blend?.name,
        templateText: blend?.termsAndCondition || blend?.description || "",
      }))}
      saveCloseButtonRef={saveCloseButtonRef}
      saveNewButtonRef={saveNewButtonRef}
      chargeOptions={[
        {
          key: "packingChargeToggle",
          label: "Packing",
          checked: packingChargeEnabled,
          onToggle: (checked) => {
            setPackingChargeEnabled(checked);
            if (!checked) {
              setPackingCharge("");
            } else if (!packingCharge) {
              setPackingCharge("0.00");
            }
          },
        },
        {
          key: "shippingChargeToggle",
          label: "Shipping",
          checked: shippingChargeEnabled,
          onToggle: (checked) => {
            setShippingChargeEnabled(checked);
            if (!checked) {
              setShippingCharge("");
            } else if (!shippingCharge) {
              setShippingCharge("0.00");
            }
          },
        },
        {
          key: "courierChargeToggle",
          label: "Courier",
          checked: courierChargeEnabled,
          onToggle: (checked) => {
            setCourierChargeEnabled(checked);
            if (!checked) {
              setCourierCharge("");
            } else if (!courierCharge) {
              setCourierCharge("0.00");
            }
          },
        },
      ]}
      totalsRows={[
        {
          key: "totalQty",
          label: "Total Qty",
          value: parseFloat(getTotalQty()).toFixed(3),
          summaryColumn: "left",
        },
        {
          key: "beforeTax",
          label: "Gross Amount",
          value: `Rs.${parseFloat(subtotal || 0).toFixed(2)}`,
          summaryColumn: "right",
        },
        {
          key: "taxAmount",
          label: "Tax Amount",
          value: `Rs.${parseFloat(taxAmount || 0).toFixed(2)}`,
          summaryColumn: "right",
        },
        // {
        //   key: "promoDiscount",
        //   label: "Promo Discount",
        //   value: `Rs.${parseFloat(totalOfferDiscount || 0).toFixed(2)}`,
        //   summaryColumn: "right",
        //   className: "text-emerald-600 font-bold"
        // },
        ...chargeRows,
        {
          key: "netAmount",
          label: "Net Amount",
          value: `Rs.${parseFloat(adjustedNetAmount || 0).toFixed(2)}`,
          emphasized: true,
          summaryColumn: "right",
        },
      ]}
      extraTotalsContent={
        <div className="flex items-center justify-between gap-2 py-0.5 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Minimum Advance</span>
            <input
              disabled={readOnly}
              type="checkbox"
              checked={isMinimumAdvanceManuallyEdited}
              onChange={(e) => {
                setIsMinimumAdvanceManuallyEdited(e.target.checked);
                if (!e.target.checked) {
                  setMinimumAdvancePayment(defaultMinimumAdvancePayment);
                }
              }}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              title="Enable manual edit"
            />
          </div>
          <input
            type="number"
            value={minimumAdvancePayment}
            onChange={(e) => {
              setMinimumAdvancePayment(e.target.value);
            }}
            readOnly={readOnly || !isMinimumAdvanceManuallyEdited}
            className={`h-7 w-24 rounded border border-slate-300 px-1.5 py-0 text-right text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 ${readOnly || !isMinimumAdvanceManuallyEdited ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
          />
        </div>
      }
      extraTotalsContentColumn="left"
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
            className="bg-yellow-600 text-white px-4 py-1 rounded-md hover:bg-yellow-700 flex items-center text-sm"
            onClick={() => {
              // if (id && 
              // singleData?.data?.minimumAdvancePayment !== null 
              // && singleData?.data?.minimumAdvancePayment !== undefined
              //  && singleData?.data?.minimumAdvancePayment !== "") {
              //   setMinimumAdvancePayment(String(singleData.data.minimumAdvancePayment));
              //   setIsMinimumAdvanceManuallyEdited(true);
              // }
              setReadOnly(false);
            }}
            disabled={childRecord}
          >
            <FiEdit2 className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            className="bg-slate-600 text-white px-4 py-1 rounded-md hover:bg-slate-700 flex items-center text-sm"
            onClick={() => {
              if (!quoteItems?.filter(i => i.itemId).length) {
                Swal.fire({ icon: 'warning', title: 'Please add some items first' });
                return;
              }
              setPrintOpen(true);
            }}
          >
            <FiPrinter className="w-4 h-4 mr-2" />
            Print
          </button>
          <button
            className="bg-orange-600 text-white px-4 py-1 rounded-md hover:bg-orange-700 flex items-center text-sm"
            onClick={() => {
              if (!quoteItems?.filter(i => i.itemId).length) {
                Swal.fire({ icon: 'warning', title: 'Please add some items first' });
                return;
              }
              setThermalPrintOpen(true);
            }}
          >
            <FiPrinter className="w-4 h-4 mr-2" />
            Thermal Print
          </button>
        </>
      }
    />
  );

  console.log(adjustedNetAmount, "netAmount", taxAmount, 'taxAmount')



  function isSupplierOutside() {
    if (supplierDetails) {
      return supplierDetails?.data?.City?.state?.name !== "TAMIL NADU" && supplierDetails?.data?.City?.state?.name !== "TAMILNADU"
    }
    return false
  }

  console.log(supplierDetails, "supplierDetails", supplierDetails?.data?.City?.state?.name !== "TAMIL NADU" && supplierDetails?.data?.City?.state?.name !== "TAMILNADU")

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




  return (
    <>
      <Modal isOpen={printOpen} onClose={() => setPrintOpen(false)} widthClass="w-[95%] h-[95%]">
        <PDFViewer style={{ width: "100%", height: "90vh" }}>
          <PremiumSalesPrintFormat
            title="QUOTATION"
            subTittle="Quotation"
            docId={docId}
            date={date}
            branchData={branchList?.data?.find(i => i.id == branchId)}
            customerData={supplierDetails?.data}
            items={quoteItems?.filter(i => i.itemId)}
            remarks={remarks}
            itemList={itemList?.data}
            sizeList={sizeList?.data}
            colorList={colorList?.data}
            uomList={uomList?.data}
            hsnList={hsnList?.data}
            taxMethod={taxMethod}
            isSupplierOutside={isSupplierOutside()}
            packingCharge={packingChargeEnabled ? packingCharge : 0}
            shippingCharge={shippingChargeEnabled ? shippingCharge : 0}
            courierCharge={courierChargeEnabled ? courierCharge : 0}
          />
        </PDFViewer>
      </Modal>

      <Modal isOpen={thermalPrintOpen} onClose={() => setThermalPrintOpen(false)} widthClass="w-[300pt] h-[95%]">
        <PDFViewer style={{ width: "100%", height: "90vh" }}>
          <ThermalSalesPrintFormat
            title="QUOTATION"
            docId={docId}
            date={date}
            branchData={branchList?.data?.find(i => i.id == branchId)}
            customerData={supplierDetails?.data}
            items={quoteItems?.filter(i => i.itemId)}
            remarks={remarks}
            itemList={itemList?.data}
            sizeList={sizeList?.data}
            colorList={colorList?.data}
            uomList={uomList?.data}
            hsnList={hsnList?.data}
            packingCharge={packingChargeEnabled ? packingCharge : 0}
            shippingCharge={shippingChargeEnabled ? shippingCharge : 0}
            courierCharge={courierChargeEnabled ? courierCharge : 0}
            terms={terms}
            isSupplierOutside={isSupplierOutside()}

          />
        </PDFViewer>
      </Modal>

      <TransactionEntryShell
        id={id}
        readOnly={readOnly}
        title="Estimate / Quotation"
        onClose={onClose}
        headerOpen={isHeaderOpen}
        setHeaderOpen={setIsHeaderOpen}
        summaryItems={summaryItems}
        openStateClassName="max-h-[400px] opacity-100 overflow-visible"
        footer={footerContent}
        headerContent={(
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 overflow-visible">
            <TransactionHeaderSection title="Basic Details" className="col-span-1" bodyClassName="grid-cols-2">
              <ReusableInput label="Quotation No" readOnly value={docId} />
              <ReusableInput label="Quotation Date" value={date} type="date" required readOnly disabled />
            </TransactionHeaderSection>

            <TransactionHeaderSection title="Customer Details" className="col-span-3 overflow-visible" bodyClassName="grid-cols-7 gap-1 overflow-visible">
              <div className="col-span-3 overflow-visible">

                <ReusableSearchableInputNewCustomerwithBranches
                  label="Customer Name"
                  component="PartyMaster"
                  placeholder="Search Customer Name..."
                  optionList={supplierList?.data}
                  setSearchTerm={(value) => { setCustomerId(value) }}
                  searchTerm={customerId}
                  show={"isClient"}
                  required={true}
                  disabled={id}
                  ref={firstInputRef}
                  nextRef={secondInputRef}
                />
              </div>
              <TextInput
                name="Phone Number"
                value={
                  supplierDetails?.data?.contactPersonNumber ||
                  findFromList(customerId, supplierList?.data, "contactPersonNumber")
                }
                disabled
                required
              />
              <div className="col-span-3">
                <TextAreaNew
                  rows={1}
                  name="Address"
                  placeholder="Address"
                  value={
                    supplierDetails?.data?.address ||
                    findFromList(customerId, supplierList?.data, "address")
                  }
                  disabled
                />
              </div>
            </TransactionHeaderSection>

          </div>
        )}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <QuotationItems
            quoteItems={quoteItems}
            setQuoteItems={setQuoteItems}
            setInwardItemSelection={setInwardItemSelection}
            supplierId={customerId}
            handleRightClick={handleRightClick}
            contextMenu={contextMenu}
            handleCloseContextMenu={handleCloseContextMenu}
            yarnList={yarnList}
            colorList={colorList}
            uomList={uomList}
            itemList={itemList}
            sizeList={sizeList}
            readOnly={readOnly}
            taxMethod={taxMethod}
            setTaxMethod={setTaxMethod}
            isHeaderOpen={isHeaderOpen}
            itemControlPanel={itemControlPanel}
            handlers={handlers}
            movedToNextSaveNewRef={movedToNextSaveNewRef}
            activeOffers={activeOffers}
            selectedOffersByRow={selectedOffersByRow}
            setSelectedOffersByRow={setSelectedOffersByRow}
            setSelectedItemForOffers={setSelectedItemForOffers}
            setShowItemOfferModal={setShowItemOfferModal}
          />
        </div>
      </TransactionEntryShell>

      <ItemOfferModal
        isOpen={showItemOfferModal}
        onClose={() => setShowItemOfferModal(false)}
        selectedItemForOffers={selectedItemForOffers}
        getItemApplicableOffers={getItemApplicableOffersLocal}
        selectedOffersByRow={selectedOffersByRow}
        onSelectOffer={handleSelectOfferForItem}
        Swal={Swal}
      />
    </>
  );
}

export default Quotaion;
