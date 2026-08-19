import { Prisma } from "../lib/prisma.js";
import { prisma } from "../lib/prisma.js";

import { NoRecordFound } from "../configs/Responses.js";
import {
  getDateFromDateTime,
  getDateTimeRange,
  getStockProperty,
} from "../utils/helper.js";

const xprisma = prisma.$extends({
  result: {
    stock: {
      gross: {
        needs: { price: true, qty: true },
        compute(stock) {
          return stock.price * stock.qty;
        },
      },
    },
  },
});

export async function getPcsStock(req) {
  const {
    pagination = false,
    dataPerPage = 5,
    pageNumber = 1,
    storeId,
    prevProcessId,
    styleId,
    productionDeliveryId,
    isPacking,
    finishedGoodsSalesId,
  } = req.query;
  let processId;
  if (prevProcessId) {
    let processData = await prisma.process.findUnique({
      where: {
        id: parseInt(prevProcessId),
      },
    });
    processId = prevProcessId;
    if (processData?.isCutting) {
      processId = null;
    }
  }
  const storeFilter = Prisma.sql`stockForPcs.storeId = ${storeId}`;
  const processFilter = processId
    ? Prisma.sql`stockForPcs.prevProcessId = ${prevProcessId}`
    : Prisma.sql`stockForPcs.prevProcessId IS NULL`;
  const productionDeliveryIdFilter = Prisma.sql`(productionDelivery.id < ${productionDeliveryId} or productionDelivery.id IS NULL)`;
  const isPackingFilter = isPacking
    ? Prisma.sql`process.isPacking = true`
    : Prisma.sql`(process.isPacking = false OR process.isPacking IS NULL)`;
  let filterConditions = [];
  if (styleId) {
    filterConditions.push(Prisma.sql`stockForPcs.styleId = ${styleId}`);
  }
  if (productionDeliveryId) {
    filterConditions.push(productionDeliveryIdFilter);
  }
  if (finishedGoodsSalesId) {
    filterConditions.push(
      Prisma.sql`(finishedGoodsSales.id < ${finishedGoodsSalesId} or finishedGoodsSales.id IS NULL)`,
    );
  }
  if (!isPacking) {
    filterConditions.push(processFilter);
  }
  filterConditions = [...filterConditions, storeFilter, isPackingFilter];
  const where = Prisma.sql`where ${Prisma.join(filterConditions, " and ")}`;
  let data = await prisma.$queryRaw`
    select style.sku as styleName, stockForPcs.styleId,stockForPcs.portionId,portion.name as portionName, stockForPcs.sizeId,stockForPcs.colorId,color.name as colorName, stockForPcs.uomId, unitOfMeasurement.name as uomName, 
    size.name as sizeName, stockForPcs.prevProcessId, CASE WHEN stockForPcs.prevProcessId is null THEN 'Cutting' ELSE process.name END as processName, sum(stockforpcs.qty) as qty
    from stockforpcs
    left join productionDeliveryDetails on productionDeliveryDetails.id = stockforpcs.productionDeliveryDetailsId 
    left join productionDelivery on productionDelivery.id = productionDeliveryDetails.productionDeliveryId
    left join finishedGoodsSalesDetails on finishedGoodsSalesDetails.id = stockForPcs.finishedGoodsSalesDetailsId 
    left join finishedGoodsSales on finishedGoodsSales.id = finishedGoodsSalesDetails.finishedGoodsSalesId 
    left join style on style.id = stockForPcs.styleId
    left join size on size.id = stockForPcs.sizeId
    left join color on color.id = stockForPcs.colorId
    left join process on process.id = stockForPcs.prevProcessId 
    left join portion on portion.id = stockForPcs.portionId 
    left join unitOfMeasurement on unitOfMeasurement.id = stockForPcs.uomId 
    ${where}
    group by style.sku, stockForPcs.styleId, stockForPcs.portionId, portion.name, stockForPcs.sizeId, stockForPcs.colorId, color.name, stockForPcs.uomId, unitOfMeasurement.name, size.name, stockForPcs.prevProcessId, process.name
    having sum(stockforpcs.qty) > 0
    `;
  let totalCount = data.length;
  if (pagination) {
    data = data.slice(
      (pageNumber - 1) * parseInt(dataPerPage),
      pageNumber * dataPerPage,
    );
  }
  return { statusCode: 0, data, totalCount };
}
async function get(req) {
  const {
    branchId,
    fromDate,
    productId,
    searchProduct,
    pagination = false,
    dataPerPage = 5,
    pageNumber = 1,
    stockData,
    stockReport,
  } = req.query;

  let data;
  let totalCount;

  // Fetch QuatationStock data once
  const quatationStockData = await prisma.$queryRaw`
    SELECT
        sbi."productId",
        COALESCE(SUM(sbi.qty), 0) AS "totalQty"
    FROM "SalesBillItems" sbi
    JOIN "SalesBill" sb ON sbi."salesBillId" = sb.id
    WHERE sb."isOn" = false
    GROUP BY sbi."productId"
    `;
  console.log(quatationStockData, "quatationStockData");

  const quatationStockMap = new Map(
    quatationStockData.map((item) => [item.productId, item.totalQty]),
  );
  console.log(quatationStockMap, "quatationStockMap");

  if (stockData) {
    data = await prisma.$queryRaw`
        SELECT
            stock."productId",
            product.name,
            COALESCE(SUM(stock.qty), 0) AS sum
        FROM "Stock" stock
        LEFT JOIN "Product" product ON product.id = stock."productId"
        WHERE stock."branchId" = ${parseInt(branchId)}
        GROUP BY
            stock."productId", product.name;
        `;
    data = data.map((item) => ({
      ...item,
      QuatationStock: quatationStockMap.get(item.productId) || 0,
    }));

    totalCount = data.length;
    if (pagination) {
      data = data.slice(
        (pageNumber - 1) * parseInt(dataPerPage),
        pageNumber * parseInt(dataPerPage),
      );
    }
    return { statusCode: 0, data, totalCount };
  }

  if (stockReport) {
    data = await prisma.$queryRaw`
        SELECT
            stock."productId",
            product.name AS Product,
            COALESCE(SUM(stock.qty), 0) AS Stock,
            product.price AS "SaleRate",
            (product.price * COALESCE(SUM(stock.qty), 0)) AS "SaleValue"
        FROM "Stock" stock
        LEFT JOIN "Product" product ON product.id = stock."productId"
        GROUP BY
            stock."productId", product.name, product.price
        ORDER BY
            product.name;
        `;
    data = data.map((item) => ({
      ...item,
      QuatationStock: quatationStockMap.get(item.productId) || 0,
    }));

    totalCount = data.length;
    if (pagination) {
      data = data.slice(
        (pageNumber - 1) * parseInt(dataPerPage),
        pageNumber * parseInt(dataPerPage),
      );
    }
    return { statusCode: 0, data, totalCount };
  }

  data = await xprisma.stock.groupBy({
    by: ["productId"],
    _sum: {
      qty: true,
    },
    where: {
      productId: productId ? parseInt(productId) : undefined,
      Product: searchProduct
        ? {
          name: {
            contains: searchProduct,
          },
        }
        : undefined,
    },
  });

  const productIds = data.map((item) => item.productId);
  const products = await xprisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  data = data.map((item) => ({
    ...item,
    Product:
      products.find((product) => product.id === item.productId)?.name || null,
    QuatationStock: quatationStockMap.get(item.productId) || 0,
  }));

  data = data.filter((item) => item._sum.qty !== 0);
  totalCount = data.length;

  if (pagination) {
    data = data.slice(
      (pageNumber - 1) * parseInt(dataPerPage),
      pageNumber * parseInt(dataPerPage),
    );
  }

  return { statusCode: 0, data, totalCount };
}

async function getBoardQty(req) {
  const { processId, storeId, gsmId, sizeId, isLabel, styleItemId, colorId } =
    req.query;

  let stockQty = 0;
  if (isLabel) {
    stockQty = await prisma.stock.aggregate({
      where: {
        storeId: parseInt(storeId),
        styleItemId: parseInt(styleItemId),
        sizeId: parseInt(sizeId),
        colorId: parseInt(colorId),
      },
      _sum: {
        qty: true,
      },
    });
  } else {
    const boardData = await prisma.process.findFirst({
      where: {
        id: parseInt(processId),
      },
      select: {
        name: true,
      },
    });
    if (!boardData) {
      return { statusCode: 404, message: "Board not found" };
    }
    const itemData = await prisma.styleItem.findFirst({
      where: {
        name: boardData.name,
      },
      select: {
        id: true,
      },
    });

    if (!itemData) {
      return { statusCode: 404, message: "Board not found" };
    }

    stockQty = await prisma.stock.aggregate({
      where: {
        storeId: parseInt(storeId),
        styleItemId: itemData.id,
        gsmId: parseInt(gsmId),
        sizeId: parseInt(sizeId),
      },
      _sum: {
        qty: true,
      },
    });
  }

  return { statusCode: 0, stockQty: stockQty._sum.qty };
}

async function getOne(id, query) {
  const { productId, salesBillItemsId, isOn } = query;
  isOn: typeof isOn === "undefined" ? undefined : JSON.parse(isOn);
  let data;

  try {
    if (isOn == "false") {
      data = await prisma.$queryRaw`
            SELECT
               COALESCE(SUM(qty), 0) AS "stockQty",
               "productId"
           FROM "Stock"
           WHERE "productId" = ${productId}
           GROUP BY "productId"
       `;
    } else if (salesBillItemsId) {
      data = await prisma.$queryRaw`
             SELECT
                COALESCE(SUM(qty), 0) AS "stockQty",
                "productId"
            FROM "Stock"
            WHERE "productId" = ${productId}
              AND (
                id < (
                    SELECT MAX(id)
                    FROM "Stock"
                    WHERE "salesBillItemsId" = ${salesBillItemsId}
                )
              )
            GROUP BY "productId"
        `;
    } else {
      data = await prisma.$queryRaw`
            SELECT
                COALESCE(SUM(qty), 0) AS "stockQty",
                "productId"
            FROM "Stock"
            WHERE "productId" = ${productId}
            GROUP BY "productId"
        `;
    }
  } catch (error) {
    console.error("Database query error: ", error);
    throw new Error("Failed to fetch stock data");
  }

  if (!data || data.length === 0) {
    return NoRecordFound("stock");
  }

  return { statusCode: 0, data };
}

async function getSearch(req) {
  const { companyId, active } = req.query;
  const { searchKey } = req.params;
  const data = await prisma.stock.findMany({
    where: {
      country: {
        companyId: companyId ? parseInt(companyId) : undefined,
      },
      active: active ? Boolean(active) : undefined,
      OR: [
        {
          aliasName: {
            contains: searchKey,
          },
        },
      ],
    },
  });
  return { statusCode: 0, data: data };
}

async function create(body) {
  const {
    aliasName,
    accessoryItemId,
    hsn,
    accessoryCategory,
    active,
    companyId,
  } = await body;
  const data = await prisma.stock.create({
    data: {
      aliasName,
      accessoryItemId: parseInt(accessoryItemId),
      hsn,
      accessoryCategory,
      active,
      companyId: parseInt(companyId),
    },
  });
  return { statusCode: 0, data };
}

async function update(id, body) {
  const {
    aliasName,
    accessoryItemId,
    hsn,
    accessoryCategory,
    active,
    companyId,
  } = await body;
  const dataFound = await prisma.stock.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!dataFound) return NoRecordFound("stock");
  const data = await prisma.stock.update({
    where: {
      id: parseInt(id),
    },
    data: {
      aliasName,
      accessoryItemId: parseInt(accessoryItemId),
      hsn,
      accessoryCategory,
      active,
      companyId: parseInt(companyId),
    },
  });
  return { statusCode: 0, data };
}

async function remove(id) {
  const data = await prisma.stock.delete({
    where: {
      id: parseInt(id),
    },
  });
  return { statusCode: 0, data };
}
// async function getStock(req) {
//   const {
//     locationId,
//     pagination,
//     pageNumber,
//     dataPerPage,
//     finYearId,
//     styleId,
//     sizeId,
//     styleItemId,
//     colorId,
//     barcodeId,
//     gsmId,
//     itemGroupId,
//     uomId,
//   } = req.query;

//   let finYearDate = await getFinYearStartTimeEndTime(finYearId);
//   let data;
//   let totalCount;
//   let totalQty;
//   data = await prisma.stock.groupBy({
//     where: {
//       branchId: locationId ? parseInt(locationId) : undefined,
//       styleId: styleId ? parseInt(styleId) : undefined,
//       sizeId: sizeId ? parseInt(sizeId) : undefined,
//       styleItemId: styleItemId ? parseInt(styleItemId) : undefined,
//       colorId: colorId ? parseInt(colorId) : undefined,
//       uomId: uomId ? parseInt(uomId) : undefined,
//       itemGroupId: itemGroupId ? parseInt(itemGroupId) : undefined,
//       gsmId: gsmId ? parseInt(gsmId) : undefined,
//       AND: finYearDate
//         ? [
//             {
//               createdAt: {
//                 gte: finYearDate.startTime,
//               },
//             },
//             {
//               createdAt: {
//                 lte: finYearDate.endTime,
//               },
//             },
//           ]
//         : undefined,
//     },
//     by: [
//       "styleId",
//       "sizeId",
//       "styleItemId",
//       "uomId",
//       "colorId",
//       "branchId",
//       "itemGroupId",
//       "gsmId",
//     ],
//     _sum: {
//       qty: true,
//     },
//   });
//   data = data.filter((item) => Number(item._sum?.qty) > 0);
//   totalCount = data.length;
//   totalQty = data?.reduce((sum, item) => sum + (item._sum?.qty || 0), 0);
//   // if (pagination) {
//   //   data = data.slice(
//   //     (pageNumber - 1) * parseInt(dataPerPage),
//   //     pageNumber * dataPerPage
//   //   );
//   // }
//   return {
//     statusCode: 0,
//     data: data.map((d) => ({
//       styleId: d.styleId,
//       sizeId: d.sizeId,
//       qty: d._sum.qty,

//       styleItemId: d.styleItemId,
//       colorId: d.colorId,
//       branchId: d.branchId,
//     })),
//     totalCount,
//     totalQty,
//   };
// }

async function getStock(req, res) {
  try {

    const { branchId, userRole, isShowStockPriceWise } = req.query;

    const isPriceWise = isShowStockPriceWise === "true" || isShowStockPriceWise === true || isShowStockPriceWise === "1";


    const stocks = await prisma.stock.findMany({
      where: {
        ...(branchId ? { branchId: parseInt(branchId) } : {}),
      },
      include: {
        Item: true,
        Itemgroup: true,
        Size: true,
        Color: true,
        Gsm: true,
        Uom: true,
        Store: true,
        Branch: true,
        Product: true,
      },
    });

    console.log(stocks, 'stocks')

    // ── group by unique combination ──────────────────────────────────────────
    const grouped = {};

    for (const s of stocks) {
      const price = s.price ? parseFloat(s.price) || 0 : 0;
      const keyParts = [
        s.storeId ?? "null",
        s.itemGroupId ?? "null",
        s.itemId ?? "null",
        s.sizeId ?? "null",
        s.colorId ?? "null",
        s.uomId ?? "null",
        s.gsmId ?? "null",
      ];

      if (isPriceWise) {
        keyParts.push(price);
      }

      const key = keyParts.join("-");

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          store: s.Store?.storeName ?? "—",
          itemGroup: s.Itemgroup?.name ?? "—",
          item: s.Item?.name ?? "—",
          size: s.Size?.name ?? "—",
          color: s.Color?.name ?? "—",
          uom: s.Uom?.name ?? "—",
          gsm: s.Gsm?.name ?? "—",
          branch: s.Branch?.name ?? "—",
          netQty: 0,
          ...(isPriceWise ? { price, totalValue: 0 } : {}),
        };
      }
      grouped[key].netQty += s.qty ?? 0;
      if (isPriceWise) {
        grouped[key].totalValue = grouped[key].netQty * grouped[key].price;
      }
    }

    const data = Object.values(grouped);

    // ── summary ──────────────────────────────────────────────────────────────
    const summary = {
      totalItems: data.length,
      negativeQty: data.filter((r) => r.netQty < 0).length,
      zeroQty: data.filter((r) => r.netQty === 0).length,
      positiveQty: data.filter((r) => r.netQty > 0).length,
      totalNetQty: data.reduce((s, r) => s + r.netQty, 0),
      ...(isPriceWise ? { totalValue: data.reduce((s, r) => s + (r.totalValue || 0), 0) } : {}),
    };

    return { data: data?.filter((r) => r.netQty > 0), summary };
  } catch (err) {
    console.error("Stock report error:", err);
    return res.status(500).json({ error: "Failed to generate stock report" });
  }
}


async function getStockforMaterialIssue(req, res) {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId) : undefined;


    const { searchItemGroup, searchItem, searchSize, searchColor, searchUom } = req.query

    const stocks = await prisma.stock.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        Itemgroup: { name: searchItemGroup ? { contains: searchItemGroup } : undefined },
        Item: { name: searchItem ? { contains: searchItem } : undefined },
        Size: { name: searchSize ? { contains: searchSize } : undefined },
        Color: { name: searchColor ? { contains: searchColor } : undefined },
        Uom: { name: searchUom ? { contains: searchUom } : undefined },

      },
      include: {
        Item: true,
        Itemgroup: true,
        Size: true,
        Color: true,
        Gsm: true,
        Uom: true,
        Store: true,
        Branch: true,
        Product: true,
      },
    });

    console.log(stocks, 'stocks')

    // ── group by unique combination ──────────────────────────────────────────
    const grouped = {};

    for (const s of stocks) {
      const key = [
        s.storeId ?? "null",
        s.itemGroupId ?? "null",
        s.itemId ?? "null",
        s.sizeId ?? "null",
        s.colorId ?? "null",
        s.uomId ?? "null",

      ].join("-");

      if (!grouped[key]) {
        grouped[key] = {
          ...s,
          uniquekey: key,
          id: s.id,
          store: s.Store?.storeName ?? "—",
          itemGroup: s.Itemgroup?.name ?? "—",
          item: s.Item?.name ?? "—",
          size: s.Size?.name ?? "—",
          color: s.Color?.name ?? "—",
          uom: s.Uom?.name ?? "—",
          branch: s.Branch?.name ?? "—",
          netQty: 0,
        };
      }
      grouped[key].netQty += s.qty ?? 0;
    }

    const data = Object.values(grouped);

    // ── summary ──────────────────────────────────────────────────────────────
    const summary = {
      totalItems: data.length,
      negativeQty: data.filter((r) => r.netQty < 0).length,
      zeroQty: data.filter((r) => r.netQty === 0).length,
      positiveQty: data.filter((r) => r.netQty > 0).length,
      totalNetQty: data.reduce((s, r) => s + r.netQty, 0),
    };

    return { data, summary };
  } catch (err) {
    console.error("Stock report error:", err);
    return res.status(500).json({ error: "Failed to generate stock report" });
  }
}

async function getOrdersReport(req, res) {
  try {
    const { branchId, orderNo, orderId, searchOrderNo, departmentId, employeeId, fromDate, toDate } = req.query;

    const targetOrderNo = orderNo || searchOrderNo;
    const parsedOrderId = orderId ? parseInt(orderId) : (targetOrderNo && !isNaN(targetOrderNo) ? parseInt(targetOrderNo) : undefined);
    const parsedDeptId = departmentId ? parseInt(departmentId) : undefined;
    const parsedEmpId = employeeId ? parseInt(employeeId) : undefined;

    const whereClause = {
      ...(branchId ? { branchId: parseInt(branchId) } : {}),
      ...(parsedDeptId ? { departmentId: parsedDeptId } : {}),
      ...(parsedEmpId ? { employeeId: parsedEmpId } : {}),
    };

    if (parsedOrderId) {
      whereClause.OR = [
        { orderId: parsedOrderId },
        { Order: { docId: { contains: String(targetOrderNo) } } },
        { docId: { contains: String(targetOrderNo) } },
      ];
    } else if (targetOrderNo) {
      whereClause.OR = [
        { Order: { docId: { contains: String(targetOrderNo) } } },
        { docId: { contains: String(targetOrderNo) } },
      ];
    }

    if (fromDate || toDate) {
      whereClause.createdAt = {};
      if (fromDate) {
        whereClause.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = toDateEnd;
      }
    }

    const materialIssues = await prisma.materialIssue.findMany({
      where: whereClause,
      include: {
        Order: true,
        Branch: true,
        Location: true,
        Department: true,
        Employee: true,
        MaterialIssueItems: {
          include: {
            Itemgroup: true,
            Item: true,
            Size: true,
            Color: true,
            Uom: true,
            MaterialReturnItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const grouped = {};

    for (const issue of materialIssues) {
      const orderNumber = issue.Order?.docId || issue.docId || "N/A";
      const orderIdVal = issue.orderId || issue.id;
      const deptName = issue.Department?.name || "—";
      const empName = issue.Employee?.name || "—";

      for (const item of issue.MaterialIssueItems || []) {
        const issuedQty = parseFloat(item.issueQty) || 0;
        const price = parseFloat(item.price) || 0;

        const returnedQty = (item.MaterialReturnItems || []).reduce(
          (sum, ret) => sum + (parseFloat(ret.returnQty) || 0),
          0
        );

        const usedQty = Math.max(0, issuedQty - returnedQty);
        const usedValue = usedQty * price;

        const key = `${orderIdVal}-${issue.departmentId || 0}-${issue.employeeId || 0}-${item.itemGroupId || 0}-${item.itemId || 0}-${item.sizeId || 0}-${item.colorId || 0}-${item.uomId || 0}-${price}`;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            orderId: orderIdVal,
            orderNo: orderNumber,
            department: deptName,
            employee: empName,
            docDate: issue.docDate ? new Date(issue.docDate).toISOString().split("T")[0] : (issue.createdAt ? new Date(issue.createdAt).toISOString().split("T")[0] : "—"),
            store: issue.Location?.storeName || "—",
            branch: issue.Branch?.branchName || "—",
            itemGroup: item.Itemgroup?.name || "—",
            item: item.Item?.name || "—",
            size: item.Size?.name || "—",
            color: item.Color?.name || "—",
            uom: item.Uom?.name || "—",
            issuedQty: 0,
            returnedQty: 0,
            usedQty: 0,
            price: price,
            usedValue: 0,
          };
        }

        grouped[key].issuedQty += issuedQty;
        grouped[key].returnedQty += returnedQty;
        grouped[key].usedQty += usedQty;
        grouped[key].usedValue += usedValue;
      }
    }

    const data = Object.values(grouped);

    const summary = {
      totalRecords: data.length,
      totalOrders: new Set(data.map((d) => d.orderNo)).size,
      totalIssuedQty: data.reduce((acc, curr) => acc + curr.issuedQty, 0),
      totalReturnedQty: data.reduce((acc, curr) => acc + curr.returnedQty, 0),
      overallUsedQty: data.reduce((acc, curr) => acc + curr.usedQty, 0),
      overallUsedValue: data.reduce((acc, curr) => acc + curr.usedValue, 0),
    };

    return { statusCode: 0, data, summary };
  } catch (err) {
    console.error("Orders report error:", err);
    return { statusCode: 1, error: "Failed to generate orders report", data: [], summary: {} };
  }
}

export {
  get,
  getOne,
  getSearch,
  create,
  update,
  remove,
  getStock,
  getBoardQty,
  getStockforMaterialIssue,
  getOrdersReport,
};
