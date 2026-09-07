import { prisma } from "../lib/prisma.js";
import { NoRecordFound } from "../configs/Responses.js";
import {
  getYearShortCodeForFinYear,
  getYearShortCode,
  getDateFromDateTime,
} from "../utils/helper.js";
import { getFinYearStartTimeEndTime } from "../utils/finYearHelper.js";
import { getTableRecordWithId } from "../utils/helperQueries.js";
import fs from "fs";
import path from "path";
import {
  createApprovalLog,
  getModuleApprovalSetup,
  evaluateConfigTrigger,
  getTriggeredConfig,
  buildIncludeForModule,
} from "../utils/approvalHelper.js";

const REFERENCE_PAGE = "PURCHASE INWARD";

// ── Doc ID ────────────────────────────────────────────────────────────────────
async function getNextDocId(branchId, shortCode, startTime, endTime, saveType) {
  if (saveType) return "Draft Save";

  let lastObject = await prisma.MaterialReturn.findFirst({
    where: {
      branchId: parseInt(branchId),
      AND: [{ createdAt: { gte: startTime } }, { createdAt: { lte: endTime } }],
    },
    orderBy: { id: "desc" },
  });

  const branchObj = await getTableRecordWithId(branchId, "branch");
  let newDocId = `${branchObj.branchCode}/${shortCode}/MRT/1`;

  if (lastObject) {
    if (lastObject.docId === "Draft Save") {
      const records = await prisma.MaterialReturn.findMany({
        select: { docId: true },
        where: {
          branchId: parseInt(branchId),
          AND: [
            { createdAt: { gte: startTime } },
            { createdAt: { lte: endTime } },
          ],
        },
      });
      const maxDocId = records.reduce((max, current) => {
        const currentNo = Number(current.docId.split("/").pop());
        const maxNo = max ? Number(max.split("/").pop()) : 0;
        return currentNo > maxNo ? current.docId : max;
      }, null);
      newDocId = `${branchObj.branchCode}/${shortCode}/MRT/${parseInt(maxDocId.split("/").at(-1)) + 1}`;
    } else {
      newDocId = `${branchObj.branchCode}/${shortCode}/MRT/${parseInt(lastObject.docId.split("/").at(-1)) + 1}`;
    }
  }
  return newDocId;
}

// ── Status ────────────────────────────────────────────────────────────────────
function getPurchaseInwardStatus(inward) {
  if (inward.receiptType === "Against Invoice") {
    if (inward.inwardType !== "Direct Inward") {
      let isFullyReceived = true;
      let isPartiallyReceived = false;
      (inward.inwardItems || []).forEach((item) => {
        const poQty = item.poQty || 0;
        const inwardQty = item.inwardQty || 0;
        if (inwardQty < poQty) isFullyReceived = false;
        if (inwardQty > 0 && inwardQty < poQty) isPartiallyReceived = true;
      });
      if (isFullyReceived) return "Fully Billed";
      if (isPartiallyReceived) return "Partially Billed";
      return "Not Billed";
    }
    if (inward.inwardType === "Direct Inward") return "Fully Billed";
  } else {
    const inwardItems = inward.inwardItems || [];
    const returnItems = inward.purchaseReturnItems || [];
    const billItems = inward.purchaseBillEntryItems || [];
    const totalInwardQty = inwardItems.reduce(
      (sum, item) => sum + (item.inwardQty || 0),
      0,
    );
    const totalReturnQty = returnItems.reduce(
      (sum, item) => sum + (item.returnQty || 0),
      0,
    );
    const totalBilledQty = billItems.reduce(
      (sum, item) => sum + (item.inwardQty || 0),
      0,
    );

    if (totalInwardQty === 0) return "Pending";
    if (totalReturnQty >= totalInwardQty) return "Fully Returned";
    if (totalBilledQty >= totalInwardQty) return "Fully Billed";
    if (totalBilledQty > 0 && totalReturnQty > 0)
      return "Partially Billed & Returned";
    if (totalBilledQty > 0) return "Partially Billed";
    if (totalReturnQty > 0) return "Partially Returned";
    return "Not Billed";
  }
}

// ── Approval Status ───────────────────────────────────────────────────────────
function getApprovalStatus(log, isApprovalTriggered = false) {
  if (!log) {
    return isApprovalTriggered
      ? {
        status: "NOTAPPROVED",
        label: "Not Approved",
        color: "orange",
        currentLevel: 1,
        levelLogs: [],
      }
      : {
        status: "NOT_CONFIGURED",
        label: "No Approval",
        color: "gray",
        currentLevel: null,
        levelLogs: [],
      };
  }
  const base = {
    currentLevel: log.currentLevel,
    levelLogs: log.LevelLogs ?? [],
    remarks: log.remarks,
  };
  const map = {
    APPROVED: {
      ...base,
      status: "APPROVED",
      label: "Approved",
      color: "green",
    },
    REJECTED: { ...base, status: "REJECTED", label: "Rejected", color: "red" },
    PENDING: { ...base, status: "PENDING", label: "Pending", color: "orange" },
    NOTAPPROVED: {
      ...base,
      status: "NOTAPPROVED",
      label: "Not Approved",
      color: "orange",
    },
    SUPERSEDED: {
      ...base,
      status: "SUPERSEDED",
      label: "Re-approval Needed",
      color: "yellow",
    },
  };
  return (
    map[log.status] ?? {
      ...base,
      status: "UNKNOWN",
      label: "Unknown",
      color: "gray",
    }
  );
}

// ── Shared config evaluator ───────────────────────────────────────────────────
function evaluateConfigs(activeConfigs, record) {
  if (!activeConfigs?.length) return false;
  const valid = activeConfigs
    .filter(
      (c) =>
        c.approvalLevels?.length > 0 &&
        c.approvalLevels.some((l) => l.LevelUsers?.length > 0),
    )
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return valid.some((config) => evaluateConfigTrigger(config, record));
}

// ── GET LIST ──────────────────────────────────────────────────────────────────
async function get(req) {
  const {
    branchId,
    pagination,
    pageNumber,
    dataPerPage,
    serachDocNo,
    searchDocDate,
    searchStore,
    searchInwardType,
    finYearId,
    searchSupplier,
  } = req.query;

  console.log(branchId, "branchId")

  let finYearDate = await getFinYearStartTimeEndTime(finYearId);
  const shortCode = finYearDate
    ? getYearShortCodeForFinYear(finYearDate?.startTime, finYearDate?.endTime)
    : "";
  let newDocId = await getNextDocId(
    branchId,
    shortCode,
    finYearDate?.startDateStartTime,
    finYearDate?.endDateEndTime,
  );

  let data = await prisma.MaterialReturn.findMany({
    where: {
      branchId: branchId ? parseInt(branchId) : undefined,
      AND: finYearDate
        ? [
          { createdAt: { gte: finYearDate.startTime } },
          { createdAt: { lte: finYearDate.endTime } },
        ]
        : undefined,
      docId: Boolean(serachDocNo) ? { contains: serachDocNo } : undefined,
      supplier: {
        name: searchSupplier ? { contains: searchSupplier } : undefined,
      },

    },
    include: {
      supplier: {
        select: {
          id: true
          , name: true,
          BranchType: {
            select: {
              name: true,
            },
          },
          City: {
            select: {
              name: true,
            },
          },
        }
      },
    },

    orderBy: { id: "desc" },
  });

  let totalCount = data.length;

  if (searchDocDate) {
    data = data?.filter((item) =>
      String(getDateFromDateTime(item.createdAt)).includes(searchDocDate),
    );
  }
  if (pagination) {
    data = data.slice(
      (pageNumber - 1) * parseInt(dataPerPage),
      pageNumber * dataPerPage,
    );
  }

  return {
    statusCode: 0,
    data: data,
    nextDocId: newDocId,
    totalCount,
  };
}

async function getOne(id) {
  const data = await prisma.MaterialReturn.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      MaterialReturnItems: {
        include: {
          MaterialIssueItems: {
            include: {
              MaterialReturnItems: true
            }
          }
        }
      },
    }
  });

  if (!data) return NoRecordFound("Purchase Inward");

  const MaterialReturnItemsWithStock = await Promise.all(
    data.MaterialReturnItems.map(async (item) => {

      const alreadyReturnQty = item?.MaterialIssueItems?.MaterialReturnItems?.
        filter((i) => i.materialReturnId != id)
        .reduce((sum, item) => parseInt(sum) + (parseInt(item.returnQty) || 0), 0) || 0;


      return {
        ...item,
        balQty: parseInt(item?.MaterialIssueItems?.issueQty || 0) - parseInt(alreadyReturnQty || 0),
        issueQty: parseInt(item?.MaterialIssueItems?.issueQty || 0)
      };
    })
  );

  return {
    statusCode: 0,
    data: {
      ...data,
      MaterialReturnItems: MaterialReturnItemsWithStock
    },
  };
}

async function getOneBillEntry(req) {
  const { supplierId } = req.query;
  const data = await prisma.purchaseInward.findMany({
    where: { supplierId: parseInt(supplierId) },
    include: {
      Store: { select: { locationId: true, storeName: true } },
      Branch: { select: { branchName: true } },
      supplier: { select: { name: true } },
      inwardItems: { include: { Hsn: true, StyleItem: true, Uom: true } },
    },
  });
  if (!data) return NoRecordFound("Purchase Inward");
  return { statusCode: 0, data };
}

// ── CREATE ────────────────────────────────────────────────────────────────────
async function create(body) {
  const {
    userId,
    branchId,
    storeId,
    docDate,
    supplierId,
    inwardItems: rawInwardItems,
    finYearId,
    draftSave,
    productionType,
    issueId,
    orderId,
    departmentId,
    employeeId,
  } = await body;

  console.log(body, "body")

  let finYearDate = await getFinYearStartTimeEndTime(finYearId);
  const shortCode = finYearDate ? getYearShortCodeForFinYear(finYearDate?.startDateStartTime, finYearDate?.endDateEndTime,) : "";
  let newDocId = await getNextDocId(branchId, shortCode, finYearDate?.startDateStartTime, finYearDate?.endDateEndTime, draftSave,);

  let data;
  await prisma.$transaction(async (tx) => {
    data = await tx.MaterialReturn.create({

      data: {
        docId: newDocId,
        docDate: docDate ? new Date(docDate) : null,
        createdById: parseInt(userId),
        branchId: parseInt(branchId),
        locationId: parseInt(storeId),
        supplierId: parseInt(supplierId),
        productionType,
        materialIssueId: issueId ? parseInt(issueId) : null,
        orderId: orderId ? parseInt(orderId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        employeeId: employeeId ? parseInt(employeeId) : null,

      },
    });

    const inwardItems = typeof rawInwardItems === "string" ? JSON.parse(rawInwardItems) : rawInwardItems;

    await createReturnItems(tx, inwardItems, data, userId, storeId, issueId, branchId, orderId, departmentId, employeeId);

  });

  return { statusCode: 0, data };
}





async function calculateLIFOIssuedStock(tx, materialIssueItemsId) {
  if (!materialIssueItemsId) return [];

  const outStocks = await tx.stock.findMany({
    where: {
      materialIssueItemsId: parseInt(materialIssueItemsId),
      inOrOut: "Out"
    },
    orderBy: { createdAt: "desc" }
  });

  const existingReturns = await tx.MaterialReturnItems.findMany({
    where: { materialIssueItemsId: parseInt(materialIssueItemsId) },
    select: { id: true }
  });

  let totalReturnedQty = 0;
  if (existingReturns.length > 0) {
    const returnIds = existingReturns.map(r => r.id);
    const inStocks = await tx.stock.findMany({
      where: {
        materialReturnItemsId: { in: returnIds },
        inOrOut: "In"
      }
    });
    totalReturnedQty = inStocks.reduce((sum, s) => sum + (s.qty || 0), 0);
  }

  const outBatches = [];

  for (const stock of outStocks) {
    let outQty = Math.abs(stock.qty || 0);

    if (totalReturnedQty >= outQty) {
      totalReturnedQty -= outQty;
      outBatches.push({ ...stock, availableToReturn: 0 });
    } else if (totalReturnedQty > 0) {
      outQty -= totalReturnedQty;
      totalReturnedQty = 0;
      outBatches.push({ ...stock, availableToReturn: outQty });
    } else {
      outBatches.push({ ...stock, availableToReturn: outQty });
    }
  }

  return outBatches.filter(b => b.availableToReturn > 0);
}

// ── CREATE INWARD ITEMS ───────────────────────────────────────────────────────
async function createReturnItems(
  tx,
  inwardItems,
  materialReturn,
  userId,
  storeId,
  issueId,
  branchId,
  orderId,
  departmentId,
  employeeId,
) {
  for (const stockDetail of inwardItems) {
    let returnQty = stockDetail?.returnQty ? Number(stockDetail.returnQty) : 0;
    if (returnQty <= 0) continue;

    const issueItemsId = stockDetail?.materialIssueItemsId || stockDetail?.id;
    const reversibleBatches = issueItemsId ? await calculateLIFOIssuedStock(tx, issueItemsId) : [];

    const firstBatchPrice = reversibleBatches.length > 0 && reversibleBatches[0].price ? reversibleBatches[0].price : (stockDetail?.price ? stockDetail.price : null);

    const createdItem = await tx.MaterialReturnItems.create({
      data: {
        materialReturnId: parseInt(materialReturn.id),
        itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
        itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
        sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
        colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
        uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
        hsnId: stockDetail?.hsnId ? parseInt(stockDetail.hsnId) : null,
        returnQty: String(returnQty),
        materialIssueId: issueId ? parseInt(issueId) : null,
        materialIssueItemsId: issueItemsId ? parseInt(issueItemsId) : null,
        price: firstBatchPrice,
      },
    });

    let remainingQty = returnQty;

    for (const batch of reversibleBatches) {
      if (remainingQty <= 0) break;
      const takeQty = Math.min(remainingQty, batch.availableToReturn);

      await tx.stock.create({
        data: {
          inOrOut: "In",
          processName: "MaterialReturn",
          createdById: parseInt(userId),
          storeId: parseInt(storeId),
          materialReturnItemsId: createdItem.id,
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          qty: takeQty,
          inwardType: "MaterialReturn",
          branchId: branchId ? parseInt(branchId) : null,
          orderId: orderId ? parseInt(orderId) : null,
          departmentId: departmentId ? parseInt(departmentId) : null,
          employeeId: employeeId ? parseInt(employeeId) : null,
          price: batch.price ? batch.price : firstBatchPrice,
        },
      });

      remainingQty -= takeQty;
    }

    if (remainingQty > 0) {
      await tx.stock.create({
        data: {
          inOrOut: "In",
          processName: "MaterialReturn",
          createdById: parseInt(userId),
          storeId: parseInt(storeId),
          materialReturnItemsId: createdItem.id,
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          qty: remainingQty,
          inwardType: "MaterialReturn",
          branchId: branchId ? parseInt(branchId) : null,
          orderId: orderId ? parseInt(orderId) : null,
          departmentId: departmentId ? parseInt(departmentId) : null,
          employeeId: employeeId ? parseInt(employeeId) : null,
          price: firstBatchPrice,
        },
      });
    }
  }
}

function findRemovedItemsGoods(dataFound, inwardItems) {
  return dataFound.MaterialReturnItems.filter(
    (oldItem) =>
      !inwardItems.find(
        (newItem) => parseInt(newItem.id) === parseInt(oldItem.id),
      ),
  );
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
async function update(id, body, files) {
  const {
    userId,
    branchId,
    storeId,
    docDate,
    supplierId,
    inwardItems: rawInwardItems,
    productionType,
    issueId,
    orderId,
    departmentId,
    employeeId,
  } = await body;

  const dataFound = await prisma.MaterialReturn.findUnique({
    where: { id: parseInt(id) },
    include: {
      MaterialReturnItems: true,
    },
  });
  if (!dataFound) return NoRecordFound("MaterialIssue ");

  const inwardItems =
    typeof rawInwardItems === "string"
      ? JSON.parse(rawInwardItems)
      : rawInwardItems;
  const removedItemsGoods = findRemovedItemsGoods(dataFound, inwardItems);
  const removeItemsGoodsIds = removedItemsGoods.map((item) =>
    parseInt(item.id),
  );

  let data;
  await prisma.$transaction(async (tx) => {
    if (removeItemsGoodsIds.length > 0) {
      await tx.stock.deleteMany({
        where: { materialReturnItemsId: { in: removeItemsGoodsIds } }
      });
      await tx.MaterialReturnItems.deleteMany({
        where: { id: { in: removeItemsGoodsIds } },
      });
    }

    data = await tx.MaterialReturn.update({
      where: { id: parseInt(id) },
      data: {
        docDate: docDate ? new Date(docDate) : null,
        createdById: parseInt(userId),
        branchId: parseInt(branchId),
        locationId: parseInt(storeId),
        supplierId: parseInt(supplierId),
        productionType,
        orderId: orderId ? parseInt(orderId) : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        employeeId: employeeId ? parseInt(employeeId) : null,
      },
    });

    await updateinwardItems(tx, inwardItems, data, userId, storeId, issueId, branchId, orderId, departmentId, employeeId);
  });

  return { statusCode: 0, data };
}

// ── UPDATE INWARD ITEMS ───────────────────────────────────────────────────────
async function updateinwardItems(
  tx,
  inwardItems,
  materialReturn,
  userId,
  storeId,
  issueId,
  branchId,
  orderId,
  departmentId,
  employeeId,
) {
  for (const stockDetail of inwardItems) {
    let returnQty = stockDetail?.returnQty ? Number(stockDetail.returnQty) : 0;
    if (returnQty <= 0) continue;

    if (stockDetail.id) {
      // Revert previous stock entries so LIFO calculation sees the full capacity
      await tx.stock.deleteMany({
        where: { materialReturnItemsId: parseInt(stockDetail.id) }
      });
    }

    // Identify the original Material Issue Item ID
    const issueItemsId = stockDetail?.materialIssueItemsId || (stockDetail.id ? null : stockDetail.id);
    const reversibleBatches = issueItemsId ? await calculateLIFOIssuedStock(tx, issueItemsId) : [];

    const firstBatchPrice = reversibleBatches.length > 0 && reversibleBatches[0].price ? reversibleBatches[0].price : (stockDetail?.price ? stockDetail.price : null);

    let createdOrUpdatedItem;
    if (stockDetail.id && stockDetail.materialIssueItemsId) {
      createdOrUpdatedItem = await tx.MaterialReturnItems.update({
        where: { id: parseInt(stockDetail.id) },
        data: {
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          hsnId: stockDetail?.hsnId ? parseInt(stockDetail.hsnId) : null,
          returnQty: String(returnQty),
          materialIssueId: issueId ? parseInt(issueId) : null,
          materialIssueItemsId: parseInt(issueItemsId),
          price: firstBatchPrice,
        },
      });
    } else {
      createdOrUpdatedItem = await tx.MaterialReturnItems.create({
        data: {
          materialReturnId: parseInt(materialReturn.id),
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          hsnId: stockDetail?.hsnId ? parseInt(stockDetail.hsnId) : null,
          returnQty: String(returnQty),
          materialIssueId: issueId ? parseInt(issueId) : null,
          materialIssueItemsId: issueItemsId ? parseInt(issueItemsId) : null,
          price: firstBatchPrice,
        },
      });
    }

    let remainingQty = returnQty;

    for (const batch of reversibleBatches) {
      if (remainingQty <= 0) break;
      const takeQty = Math.min(remainingQty, batch.availableToReturn);

      await tx.stock.create({
        data: {
          inOrOut: "In",
          processName: "MaterialReturn",
          createdById: parseInt(userId),
          storeId: parseInt(storeId),
          materialReturnItemsId: createdOrUpdatedItem.id,
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          qty: takeQty,
          inwardType: "MaterialReturn",
          branchId: branchId ? parseInt(branchId) : null,
          orderId: orderId ? parseInt(orderId) : null,
          departmentId: departmentId ? parseInt(departmentId) : null,
          employeeId: employeeId ? parseInt(employeeId) : null,
          price: batch.price ? batch.price : firstBatchPrice,
        },
      });

      remainingQty -= takeQty;
    }

    if (remainingQty > 0) {
      await tx.stock.create({
        data: {
          inOrOut: "In",
          processName: "MaterialReturn",
          createdById: parseInt(userId),
          storeId: parseInt(storeId),
          materialReturnItemsId: createdOrUpdatedItem.id,
          itemGroupId: stockDetail?.itemGroupId ? parseInt(stockDetail.itemGroupId) : null,
          itemId: stockDetail?.itemId ? parseInt(stockDetail.itemId) : null,
          sizeId: stockDetail?.sizeId ? parseInt(stockDetail.sizeId) : null,
          colorId: stockDetail?.colorId ? parseInt(stockDetail.colorId) : null,
          uomId: stockDetail?.uomId ? parseInt(stockDetail.uomId) : null,
          qty: remainingQty,
          inwardType: "MaterialReturn",
          branchId: branchId ? parseInt(branchId) : null,
          orderId: orderId ? parseInt(orderId) : null,
          departmentId: departmentId ? parseInt(departmentId) : null,
          employeeId: employeeId ? parseInt(employeeId) : null,
          price: firstBatchPrice,
        },
      });
    }
  }
}

// ── REMOVE ────────────────────────────────────────────────────────────────────
async function remove(id) {
  const data = await prisma.MaterialReturn.delete({
    where: {
      id: parseInt(id)
    },
  })
  return { statusCode: 0, data };
}

// ── Remaining functions unchanged ─────────────────────────────────────────────
async function getPurchaseDetail(req) {
  const { invNo } = req.query;
  let data = await prisma.purchaseInward.findFirst({
    where: { invNo },
    include: {
      fabricInwardItems: {
        select: {
          materialStocks: true,
          id: true,
          purchaseInwardId: true,
          styleNo: true,
          fabricId: true,
          styleItemId: true,
          styleId: true,
          hsnId: true,
          fabWidth: true,
          fabMeter: true,
          uomId: true,
          noOfPcs: true,
          accessoryId: true,
          accessoryGroupId: true,
          accessoryItemId: true,
          qty: true,
          price: true,
          Fabric: true,
          Color: true,
          StyleItem: true,
          Accessory: true,
          AccessoryGroup: true,
          Uom: true,
          Size: true,
          filePath: true,
        },
      },
    },
  });
  if (!data) return NoRecordFound("Purchase Inward");
  return { statusCode: 0, data };
}

async function getPurchaseDetailStock(req) {
  const { invNo, storeId, branchId, returnType } = req.query;
  let purchaseData = await prisma.purchaseInward.findFirst({
    where: { invNo, inwardType: returnType },
    include: { inwardItems: true },
  });
  if (!purchaseData || purchaseData.length === 0)
    return NoRecordFound("Invoice");

  const isMaterial =
    returnType?.toLowerCase().includes("fabric") ||
    returnType?.toLowerCase().includes("accessory");
  let data;

  if (isMaterial) {
    data = await prisma.materialStock.groupBy({
      by: [
        "fabricId",
        "hsnId",
        "fabWidth",
        "accessoryId",
        "accessoryGroupId",
        "uomId",
        "styleId",
        "invNo",
        "portionId",
      ],
      where: {
        branchId: branchId ? parseInt(branchId) : undefined,
        storeId: storeId ? parseInt(storeId) : undefined,
        invNo,
      },
      _sum: { qty: true, fabMeter: true },
    });
  } else {
    const rg =
      purchaseData.inwardItems.filter(
        (item) => item.styleId && item.styleItemId && item.uomId,
      ) || [];
    data = await prisma.stock.groupBy({
      by: ["fabricId", "hsnId", "uomId", "styleId", "styleItemId", "styleNo"],
      where: {
        branchId: branchId ? parseInt(branchId) : undefined,
        storeId: storeId ? parseInt(storeId) : undefined,
        OR: rg.map((item) => ({
          styleId: item.styleId,
          styleItemId: item.styleItemId,
          hsnId: item.hsnId,
          uomId: item.uomId,
        })),
      },
      _sum: { qty: true },
    });
  }

  if (!data || data.length === 0) return NoRecordFound("Invoice not found");

  return {
    statusCode: 0,
    data: isMaterial
      ? data.map((d) => ({
        invNo: d.invNo,
        styleItemId: d.styleItemId,
        fabricId: d.fabricId,
        hsnId: d.hsnId,
        uomId: d.uomId,
        fabWidth: d.fabWidth,
        fabMeter: d._sum.fabMeter,
        accessoryId: d.accessoryId,
        accessoryGroupId: d.accessoryGroupId,
        qty: d._sum.qty,
        styleId: d.styleId,
        portionId: d.portionId,
      }))
      : data.map((d) => ({
        invNo: purchaseData.invNo,
        styleItemId: d.styleItemId,
        fabricId: d.fabricId,
        hsnId: d.hsnId,
        uomId: d.uomId,
        stkQty: d._sum.qty,
        styleId: d.styleId,
        styleNo: d.styleNo,
      })),
    returnType: purchaseData.inwardType,
    supplierId: purchaseData.supplierId,
  };
}

function manualFilterSearchDataPurchaseInwardItems(
  searchDocDate,
  searchDcDate,
  returnType,
  data,
) {
  const returnTypeToSearch =
    returnType === "General Return"
      ? ["Direct Inward"]
      : ["Order Purchase Inward", "General Purchase Inward"];
  return data.filter(
    (item) =>
      (searchDocDate
        ? String(getDateFromDateTime(item.PurchaseInward.docDate)).includes(
          searchDocDate,
        )
        : true) &&
      (searchDcDate
        ? String(getDateFromDateTime(item.PurchaseInward.dcDate)).includes(
          searchDcDate,
        )
        : true) &&
      (returnTypeToSearch
        ? returnTypeToSearch.includes(item.PurchaseInward.inwardType)
        : true),
  );
}

async function getAllDataPurInwardItems(data) {
  const results = await Promise.all(
    data?.map(async (item) => {
      const res = await getPurInwardItemById(item.id);
      return res.data;
    }),
  );
  return results.filter((item) => item.balQty > 0);
}

async function getPurInwardItemById(id) {
  let data = await prisma.inwardItems.findUnique({
    where: { id: parseInt(id) },
    include: {
      PurchaseInward: { select: { docId: true, dcDate: true, docDate: true } },
      Uom: { select: { name: true } },
      StyleItem: { select: { name: true } },
      Hsn: { select: { name: true } },
      Itemgroup: { select: { name: true } },
      Size: { select: { name: true } },
      Color: { select: { name: true } },
      Gsm: { select: { name: true } },
    },
  });
  if (!data) return NoRecordFound("Purchase Inward");

  const [itemWithPoQty, returnItems] = await Promise.all([
    prisma.poItems.findFirst({
      where: {
        styleItemId: data.styleItemId,
        poId: data.poId,
        uomId: data.uomId,
        hsnId: data.hsnId,
        gsmId: data.gsmId,
      },
    }),
    prisma.purchaseReturnItems.findMany({
      where: {
        styleItemId: data.styleItemId,
        purchaseInwardId: data.purchaseInwardId,
        uomId: data.uomId,
        hsnId: data.hsnId,
        gsmId: data.gsmId,
      },
      select: { returnQty: true },
    }),
  ]);

  const returnQty = returnItems.reduce(
    (sum, item) => sum + (item.returnQty ?? 0),
    0,
  );
  return {
    statusCode: 0,
    data: {
      ...data,
      poQty: itemWithPoQty?.qty ?? 0,
      alreadyReturnQty: returnQty,
      balQty: data.inwardQty - returnQty,
    },
  };
}

async function getPurchaseInwardItems(req) {
  const {
    branchId,
    active,
    supplierId,
    pagination,
    searchDocId,
    searchDocDate,
    searchDcDate,
    returnType,
  } = req.query;

  let data;
  let totalCount;
  if (pagination) {
    data = await prisma.inwardItems.findMany({
      where: {
        PurchaseInward: {
          docId: Boolean(searchDocId) ? { contains: searchDocId } : undefined,
          supplierId: supplierId ? parseInt(supplierId) : undefined,
        },
      },
      include: {
        PurchaseInward: {
          select: {
            supplierId: true,
            docDate: true,
            dcDate: true,
            inwardType: true,
          },
        },
        Uom: { select: { name: true } },
      },
    });
    data = manualFilterSearchDataPurchaseInwardItems(
      searchDocDate,
      searchDcDate,
      returnType,
      data,
    );
    data = data?.filter((i) => i.PurchaseInward.supplierId == supplierId);
    data = await getAllDataPurInwardItems(data);
  } else {
    data = await prisma.inwardItems.findMany({
      where: {
        branchId: branchId ? parseInt(branchId) : undefined,
        active: active ? Boolean(active) : undefined,
      },
    });
  }
  return { statusCode: 0, data, totalCount };
}

async function getAllDataPoItems(data) {
  const results = await Promise.all(
    data?.map(async (item) => {
      const res = await getPoItemById(item.id);
      return res.data;
    }),
  );
  return results.filter((item) => item.balQty > 0);
}

async function getPoItemById(id) {
  const data = await prisma.inwardItems.findUnique({
    where: { id: parseInt(id) },
    include: {
      Po: { select: { docId: true, dueDate: true, docDate: true } },
      Uom: { select: { name: true } },
      StyleItem: { select: { name: true } },
      Hsn: { select: { name: true } },
    },
  });
  if (!data) return NoRecordFound("Purchase Order");

  const [inwardItems, cancelItems] = await Promise.all([
    prisma.inwardItems.findMany({
      where: {
        styleItemId: data.styleItemId,
        poId: data.poId,
        uomId: data.uomId,
        hsnId: data.hsnId,
      },
      select: { purchaseInwardId: true, inwardQty: true },
    }),
    prisma.purchaseCancelItems.findMany({
      where: {
        styleItemId: data.styleItemId,
        poId: data.poId,
        uomId: data.uomId,
        hsnId: data.hsnId,
      },
      select: { cancelQty: true },
    }),
  ]);

  const inwardQty = inwardItems.reduce(
    (sum, item) => sum + (item.inwardQty ?? 0),
    0,
  );
  const cancelQty = cancelItems.reduce(
    (sum, item) => sum + (item.cancelQty ?? 0),
    0,
  );
  const inwardIds = inwardItems.map((i) => i.purchaseInwardId).filter(Boolean);

  let returnQty = 0;
  if (inwardIds.length > 0) {
    const returnAgg = await prisma.purchaseReturnItems.aggregate({
      where: {
        styleItemId: data.styleItemId,
        uomId: data.uomId,
        hsnId: data.hsnId,
        purchaseInwardId: { in: inwardIds },
      },
      _sum: { returnQty: true },
    });
    returnQty = returnAgg._sum.returnQty ?? 0;
  }

  return {
    statusCode: 0,
    data: {
      ...data,
      poQty: data.qty,
      cancelQty,
      alreadyInwardQty: inwardQty,
      alreadyReturnQty: returnQty,
      balQty: data.qty - (inwardQty + cancelQty),
      balQtyCancel: data.qty - (inwardQty - returnQty),
    },
  };
}

function manualFilterSearchDataPIItems(searchPIDate, data) {
  return data.filter((item) =>
    searchPIDate
      ? String(getDateFromDateTime(item.PurchaseInward?.docDate)).includes(
        searchPIDate,
      )
      : true,
  );
}

async function getPurchaseInwardBillEntryItems(req) {
  const {
    branchId,
    active,
    supplierId,
    searchInvNo,
    pagination,
    dataPerPage,
    searchDocId,
    searchPIDate,
    searchDcNo,
    billType,
  } = req.query;

  let data;
  let totalCount;

  if (pagination) {
    const billedInwardItemIds = await prisma.purchaseBillEntryItems.findMany({
      where: { purchaseInwardId: { not: null } },
      select: {
        docId: true,
        styleItemId: true,
        sizeId: true,
        colorId: true,
        gsmId: true,
        purchaseInwardId: true,
      },
    });
    const billedKeys = new Set(
      billedInwardItemIds.map(
        (b) =>
          `${b.purchaseInwardId}_${b.styleItemId}_${b.sizeId}_${b.colorId}_${b.gsmId}`,
      ),
    );

    data = await prisma.inwardItems.findMany({
      where: {
        PurchaseInward: {
          docId: Boolean(searchDocId) ? { contains: searchDocId } : undefined,
          invNo: searchInvNo ? { contains: searchInvNo } : undefined,
          dcNo: Boolean(searchDcNo) ? { contains: searchDcNo } : undefined,
          AND: [
            {
              OR: [
                { receiptType: { not: "Against Invoice" } },
                { receiptType: null },
                { receiptType: "" },
              ],
            },
          ],
          supplierId: supplierId ? parseInt(supplierId) : undefined,
          inwardType: billType ? { contains: billType } : undefined,
        },
      },
      include: {
        PurchaseInward: {
          select: {
            supplierId: true,
            docDate: true,
            docId: true,
            invNo: true,
            dcNo: true,
            id: true,
          },
        },
        Hsn: { select: { name: true, tax: true } },
        StyleItem: { select: { name: true } },
        Uom: { select: { name: true } },
        Size: { select: { name: true } },
        Color: { select: { name: true } },
        Gsm: { select: { name: true } },
      },
    });

    data = manualFilterSearchDataPIItems(searchPIDate, data);
    data = data.filter((item) => {
      const key = `${item.purchaseInwardId}_${item.styleItemId}_${item.sizeId}_${item.colorId}_${item.gsmId}`;
      return !billedKeys.has(key);
    });
    data = data.filter((i) => i.PurchaseInward?.supplierId == supplierId);
  } else {
    data = await prisma.inwardItems.findMany({
      where: {
        branchId: branchId ? parseInt(branchId) : undefined,
        active: active ? Boolean(active) : undefined,
      },
    });
  }

  return { statusCode: 0, data, totalCount };
}

export {
  get,
  getOne,
  create,
  update,
  remove,
  getPurchaseDetail,
  getPurchaseDetailStock,
  getPurchaseInwardItems,
  getOneBillEntry,
  getPurchaseInwardBillEntryItems,
};
