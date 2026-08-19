import { prisma } from "../lib/prisma.js";

import { NoRecordFound } from "../configs/Responses.js";

async function get(req) {
  const { companyId, active } = req.query;
  const data = await prisma.Order.findMany({

    // include: {
    //   _count: {
    //     select: {
    //       inwardItems: true,
    //       purchaseReturnItems: true
    //     },
    //   },
    // },
  });
  return {
    statusCode: 0,
    data: data.map((item) => {
      return {
        ...item,
        // childRecord:
        //   item._count.purchaseReturnItems +
        //   item._count.inwardItems,
      };
    }),
  };
}

async function getOne(id) {
  const childRecordPo = await prisma.purchaseReturnItems.count({
    where: {
      sizeId: parseInt(id),
    },
  });
  const childRecordInward = await prisma.inwardItems.count({
    where: {
      sizeId: parseInt(id),
    },
  });
  const data = await prisma.Order.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!data) return NoRecordFound("size");
  return {
    statusCode: 0,
    data: { ...data, ...{ childRecord: childRecordPo + childRecordInward } },
  };
}

async function getSearch(req) {
  const { searchKey } = req.params;
  const { companyId, active } = req.query;
  const data = await prisma.Order.findMany({
    where: {
      companyId: companyId ? parseInt(companyId) : undefined,
      active: active ? Boolean(active) : undefined,
      OR: [
        {
          name: {
            contains: searchKey,
          },
        },
      ],
    },
  });
  return { statusCode: 0, data: data };
}

async function create(body) {
  const { name, companyId, active } = await body;
  const data = await prisma.Order.create({
    data: {
      docId: name,
      active,
    },
  });
  return { statusCode: 0, data };
}

async function update(id, body) {
  const { name, active } = await body;
  const dataFound = await prisma.Order.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!dataFound) return NoRecordFound("size");
  const data = await prisma.Order.update({
    where: {
      id: parseInt(id),
    },
    data: {
      docId: name,
      active,
    },
  });
  return { statusCode: 0, data };
}

async function remove(id) {
  const data = await prisma.Order.delete({
    where: {
      id: parseInt(id),
    },
  });
  return { statusCode: 0, data };
}

export { get, getOne, getSearch, create, update, remove };
