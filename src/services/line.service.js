import { prisma } from "../lib/prisma.js";

import { NoRecordFound } from "../configs/Responses.js";

async function get(req) {
  const { companyId, active } = req.query;
  const data = await prisma.LineMaster.findMany({


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
  const data = await prisma.LineMaster.findUnique({
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
  const data = await prisma.LineMaster.findMany({
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
  const data = await prisma.LineMaster.create({
    data: {
      name,
      active,
    },
  });
  return { statusCode: 0, data };
}

async function update(id, body) {
  const { name, active } = await body;
  const dataFound = await prisma.LineMaster.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!dataFound) return NoRecordFound("size");
  const data = await prisma.LineMaster.update({
    where: {
      id: parseInt(id),
    },
    data: {
      name,
      active,
    },
  });
  return { statusCode: 0, data };
}

async function remove(id) {
  const data = await prisma.LineMaster.delete({
    where: {
      id: parseInt(id),
    },
  });
  return { statusCode: 0, data };
}

export { get, getOne, getSearch, create, update, remove };
