import React from 'react'
import { useEffect, useState } from "react";
import { useGetPartyQuery } from "../../../redux/services/PartyMasterService"
import { Loader } from "../../../Basic/components";
import { findFromList, getCommonParams, getDateFromDateTimeToDisplay } from "../../../Utils/helper";
import { showEntries } from '../../../Utils/DropdownData';
import secureLocalStorage from 'react-secure-storage';
import {
  useGetPoQuery
} from "../../../redux/uniformService/PoServices"
import { pageNumberToReactPaginateIndex, reactPaginateIndexToPageNumber } from '../../../Utils/helper';
import ReactPaginate from 'react-paginate';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useGetDirectInwardOrReturnQuery } from '../../../redux/uniformService/DirectInwardOrReturnServices';
import { useGetQuotationMasterQuery, useGetQuotationQuery } from '../../../redux/uniformService/quotationServices';
import { Tooltip } from '@mui/material';
import { CreditCard, FileText } from 'lucide-react';





const QuotationPrintFormat = ({
  onClick,
  onView,
  itemsPerPage = 10,
  onEdit,
  onDelete,
  onConvertToSaleOrder,
  onConvertToInvoice,
  onMakePayment,
  rowActions = true,
}) => {

  const calculateQuotationNetAmount = (quotationItems = [], quotation = {}) => {
    const packingCharge = parseFloat(quotation?.packingCharge || 0);
    const shippingCharge = parseFloat(quotation?.shippingCharge || 0);
    const courierCharge = parseFloat(quotation?.courierCharge || 0);

    const itemsTotal = quotationItems.reduce((acc, curr) => {
      const price = parseFloat(curr?.price || 0);
      const qty = parseFloat(curr?.qty || 0);
      const taxPercent = parseFloat(curr?.taxPercent || 0);
      const taxMethod = curr?.taxMethod || "Inclusive";
      const discountType = curr?.discountType;
      const discountValue = parseFloat(curr?.discountValue || 0);

      const gross = price * qty;
      let discountedAmount = gross;

      if (discountType === "Percentage") {
        discountedAmount = gross - (gross * discountValue) / 100;
      } else if (discountType === "Flat") {
        discountedAmount = gross - discountValue;
      }

      discountedAmount = Math.max(0, discountedAmount);

      if (taxMethod === "Inclusive" && taxPercent > 0) {
        return acc + discountedAmount;
      }

      return acc + discountedAmount + (discountedAmount * taxPercent) / 100;
    }, 0);

    return itemsTotal + packingCharge + shippingCharge + courierCharge;
  };

  const getPaidAmount = (paymentData = []) => {
    return paymentData.reduce(
      (acc, curr) => acc + parseFloat(curr?.paidAmount || 0),
      0
    );
  };

  const getRequiredAdvanceAmount = (dataObj) => {
    const minimumAdvanceAmount = parseFloat(dataObj?.minimumAdvancePayment || 0);
    if (minimumAdvanceAmount > 0) {
      return minimumAdvanceAmount;
    }

    return calculateQuotationNetAmount(dataObj?.QuotationItems, dataObj) * 0.25;
  };

  const shouldShowAdvanceReceipt = (dataObj) => {
    const paidAmount = getPaidAmount(dataObj?.paymentData?.filter(i => i.paymentFlow !== 'Payout'));
    const requiredAdvanceAmount = getRequiredAdvanceAmount(dataObj);
    console.log(paidAmount, dataObj.totalRefundAmount, "dataObj.totalRefundAmount")
    return (paidAmount - dataObj.totalRefundAmount) < requiredAdvanceAmount;
  };


  const branchId = secureLocalStorage.getItem(
    sessionStorage.getItem("sessionId") + "currentBranchId"
  );
  const [dataPerPage, setDataPerPage] = useState("1");
  const [serachDocNo, setSerachDocNo] = useState("");
  const [searchClientName, setSearchClientName] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [supplier, setSupplier] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("")


  const [totalCount, setTotalCount] = useState(0);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);


  const searchFields = {
    serachDocNo,
    searchClientName,
    searchDate,
    supplier,
    searchMaterial

  };

  useEffect(() => {
    setCurrentPageNumber(1);
  }, [
    serachDocNo,
    searchClientName,
    searchDate,
    supplier,
    searchMaterial,
  ]);

  const { data: allData, isFetching, isLoading } = useGetQuotationQuery({
    params: {
      branchId,
      ...searchFields,
      pagination: true,
      dataPerPage,
      pageNumber: currentPageNumber,
    }
  });




  useEffect(() => {
    if (allData?.totalCount) {
      setTotalCount(allData?.totalCount);
    }
  }, [allData, isLoading, isFetching]);

  const isLoadingIndicator =
    isLoading || isFetching



  console.log(allData, "entire");

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math?.ceil(allData?.data?.length / itemsPerPage);
  const indexOfLastItem = currentPage * parseInt(10);
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  console.log(indexOfLastItem, "indexOfLastItem")

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  const Pagination = () => {
    // if (totalPages <= 1) return null;

    return (
      <div className="h-10 w-full flex flex-col sm:flex-row justify-between items-center p-2 bg-white border-t border-gray-200 ">
        <div className="text-sm text-gray-600 mb-2 sm:mb-0">
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, allData?.data?.length)} of {allData?.length} entries
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md ${currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            <FaChevronLeft className="inline" />
          </button>

          {Array?.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`px-3 py-1 rounded-md ${currentPage === pageNum
                  ? 'bg-indigo-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="px-3 py-1">...</span>
          )}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <button
              onClick={() => handlePageChange(totalPages)}
              className={`px-3 py-1 rounded-md ${currentPage === totalPages
                ? 'bg-indigo-800 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ${currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
          >
            <FaChevronRight className="inline" />
          </button>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ status }) => {
    const config = {
      "Pending Advance": "bg-yellow-100 text-yellow-800 border-yellow-300",
      "Ready for Order": "bg-indigo-100 text-indigo-800 border-indigo-300",
      "Order Taken": "bg-green-100 text-green-800 border-green-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${config[status] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
        {status || "Pending Advance"}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">

      <>
        <div className="flex h-full min-h-0 flex-col rounded-lg bg-[#F1F1F0] shadow-sm">
          <div className="min-h-0 flex-1 overflow-auto">
            <table>
              <thead className="bg-gray-200 text-gray-800 ">
                <tr className="">
                  <th className=" px-1 py-1.5  font-bold text-[13px]  text-gray-900  text-center  w-12">
                    <div className="">S No</div>
                  </th>

                  <th className=" px-3  font-bold text-[13px]  text-gray-900  text-center w-32">
                    <div>Quotation No</div>
                  </th>
                  <th className=" px-3  font-bold text-[13px]  text-gray-900  text-center w-32">
                    <div>Quotation Date</div>
                  </th>

                  <th className="w-96  px-3   font-bold text-[13px] text-gray-900  text-center ">
                    <div>Customer</div>
                  </th>
                  <th className="w-36  px-3   font-bold text-[13px] text-gray-900  text-center ">
                    <div>Minimum Advance Amount</div>
                  </th>
                  <th className="w-36  px-3   font-bold text-[13px] text-gray-900  text-center ">
                    <div>Paid Amount</div>
                  </th>
                  <th className="w-36 px-3 font-bold text-[13px] text-gray-900 text-center">
                    <div>Status</div>
                  </th>
                  <th className="w-40   px-3  font-bold text-[13px]  text-gray-900  text-center ">
                    <div>Actions</div>
                  </th>

                </tr>
                <tr className="">
                  <th className=" px-1  font-bold text-[13px] justify-end  text-gray-900  text-center  w-12">
                    <div className="h-3"></div>
                  </th>

                  <th className=" px-1 font-bold text-[13px] border  text-gray-900  text-center w-32">
                    <input
                      type="text"
                      className="text-black h-5   w-full  px-1 focus:outline-none border  border-gray-400 rounded-md"
                      placeholder="Search"
                      value={serachDocNo}
                      onChange={(e) => {
                        setSerachDocNo(e.target.value);
                      }}
                    />
                  </th>
                  <th className="  px-1 font-bold text-[13px]  text-gray-900  text-center w-32">
                    <input
                      type="text"
                      className="text-black h-5   w-full   px-1 focus:outline-none border  border-gray-400 rounded-md"
                      placeholder="Search"
                      value={searchDate}
                      onChange={(e) => {
                        setSearchDate(e.target.value);
                      }}
                    />
                  </th>

                  {/* <th className="  px-1 font-medium text-[13px]  text-gray-900  text-center w-32">
                    <input
                      type="text"
                      className="text-black h-5   w-full   px-1 focus:outline-none border  border-gray-400 rounded-md"
                      placeholder="Search"
                      value={searchMaterial}
                      onChange={(e) => {
                        setSearchMaterial(e.target.value);
                      }}
                    />
                  </th> */}
                  <th className="w-96  px-1 font-bold text-[13px]  text-gray-900  text-center ">
                    <input
                      type="text"
                      className="text-black h-5   w-full   px-1 focus:outline-none border  border-gray-400 rounded-md"
                      placeholder="Search"
                      value={supplier}
                      onChange={(e) => {
                        setSupplier(e.target.value);
                      }}
                    />
                  </th>
                  <th className=" px-1 font-bold text-[13px] text-gray-900 text-center"></th>
                  <th className="w-36 px-1 font-bold text-[13px] text-gray-900 text-center"></th>

                  <th className="w-36 px-1 font-bold text-[13px] text-gray-900 text-center"></th>
                  <th className="w-40  px-1  font-bold text-[13px]  text-gray-900  text-center "></th>

                </tr>
              </thead>
              {isLoadingIndicator ? (
                <tbody>
                  <tr>
                    <td>
                      <Loader />
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="border-2">
                  {(allData?.data ? allData?.data : []).map((dataObj, index) => (
                    <tr
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onClick(dataObj.id);
                        }
                      }}
                      tabIndex={0}
                      key={dataObj.id}
                      className={`hover:bg-gray-50 transition-colors border-b   border-gray-200 text-[12px] ${index % 2 === 0 ? "bg-white" : "bg-gray-100"
                        }`}
                      onClick={() => onClick(dataObj.id)}
                    >
                      <td className="text-center " >
                        {index + 1}
                      </td>

                      <td className="py-1.5 text-left">{dataObj.docId} </td>


                      <td className="py-1.5 text-left">
                        {getDateFromDateTimeToDisplay(dataObj.createdAt)}
                      </td>


                      <td className="py-1.5 text-left">
                        {`${dataObj?.Party?.name}${dataObj?.Party?.BranchType?.name
                          ? ` / ${dataObj?.Party?.BranchType?.name}`
                          : ""
                          }${dataObj?.Party?.City?.name ? ` / ${dataObj?.Party?.City?.name}` : ""}`}                         </td>
                      <td className="py-1.5 text-center  text-green-500 font-bold">
                        <span style={{ color: "#F97316", fontWeight: 600 }}>
                          {parseFloat(dataObj?.minimumAdvancePayment).toFixed(2)}                        </span>
                      </td>

                      <td className="py-1.5 text-center  text-green-500 font-bold">
                        <span style={{ color: "#16A34A", fontWeight: 600 }}>
                          {parseFloat(dataObj?.paidAmount).toFixed(2)}
                        </span>
                      </td>


                      <td className="py-1.5 text-center">
                        <StatusBadge status={dataObj?.quotationStatus} />
                      </td>
                      {rowActions && (
                        <td className="border-gray-200 px-2 h-8">
                          <div className="flex items-center justify-end">
                            <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                              {shouldShowAdvanceReceipt(dataObj) && onMakePayment && dataObj?.Saleorder?.length === 0 && (
                                <Tooltip title="Advance Receipt" arrow>
                                  <button
                                    className="p-1.5 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMakePayment(dataObj);
                                    }}
                                  >
                                    <CreditCard size={16} />
                                  </button>
                                </Tooltip>
                              )}
                              {onConvertToSaleOrder && (
                                <Tooltip title={dataObj?.canConvertToSaleOrder ? "Convert to Sale Order" : (dataObj?.quotationStatus || "Conversion blocked")} arrow>
                                  <span>
                                    <button
                                      disabled={!dataObj?.canConvertToSaleOrder}
                                      className={`p-1.5 rounded-md transition ${dataObj?.canConvertToSaleOrder
                                        ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (dataObj?.canConvertToSaleOrder) onConvertToSaleOrder(dataObj);
                                      }}
                                    >
                                      <FileText size={16} />
                                    </button>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-1 pl-2">
                              {onView && (
                                <Tooltip title="View" arrow>
                                  <span>
                                    <button
                                      className="text-blue-600 flex items-center px-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                      onClick={(e) => { e.stopPropagation(); onView(dataObj.id); }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </span>
                                </Tooltip>
                              )}
                              {onEdit && (
                                <Tooltip title={dataObj?.Saleorder?.length > 0 ? "Cannot Edit. Child Record Exists" : "Edit"} arrow>
                                  <span>
                                    <button
                                      disabled={dataObj?.Saleorder?.length > 0}
                                      className={`flex items-center px-1 rounded transition-colors ${dataObj?.Saleorder?.length > 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-green-600 bg-green-50 hover:bg-green-100"}`}
                                      onClick={(e) => { e.stopPropagation(); if (!(dataObj?.Saleorder?.length > 0)) onEdit(dataObj.id); }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                  </span>
                                </Tooltip>
                              )}
                              {onDelete && (
                                <Tooltip title={dataObj?.Saleorder?.length > 0 ? "Cannot Delete. Child Record Exists" : "Delete"} arrow>
                                  <span>
                                    <button
                                      disabled={dataObj?.Saleorder?.length > 0}
                                      className={`flex items-center px-1 rounded transition-colors ${dataObj?.Saleorder?.length > 0 ? "bg-red-50 text-red-500 opacity-40 cursor-not-allowed" : "text-red-800 bg-red-50 hover:bg-red-100"}`}
                                      onClick={(e) => { e.stopPropagation(); if (!(dataObj?.Saleorder?.length > 0)) onDelete(dataObj.id, dataObj?._count); }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </span>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                    </tr>
                  ))}

                </tbody>
              )}
            </table>

          </div>
          <div className="shrink-0">
            <Pagination />
          </div>

        </div>
      </>

    </div>
  );
};

export default QuotationPrintFormat;
