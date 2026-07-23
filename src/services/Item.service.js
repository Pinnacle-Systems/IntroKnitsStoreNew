import { prisma } from "../lib/prisma.js";
import { NoRecordFound } from "../configs/Responses.js";

async function get(req) {
  const { companyId, active } = req.query;

  let data = await prisma.item.findMany({
    where: {
      active: active ? Boolean(active) : undefined,
    },

  });
  return {
    statusCode: 0,
    data: data,
  };
}

async function getOne(id) {
  const childRecordPo = await prisma.poItems.count({
    where: { styleItemId: parseInt(id) },
  });
  const childRecordInward = await prisma.inwardItems.count({
    where: { styleItemId: parseInt(id) },
  });
  const childRecordPI = await prisma.proformaInvoiceItem.count({
    where: { styleItemId: parseInt(id) },
  });
  const data = await prisma.item.findUnique({
    where: {
      id: parseInt(id),
    },
    include: {
      Hsn: true,
    },
  });
  if (!data) return NoRecordFound("styleItem");
  return {
    statusCode: 0,
    data: {
      ...data,
      ...{ childRecord: childRecordPo + childRecordInward + childRecordPI },
    },
  };
}

async function getSearch(req) {
  const { searchKey } = req.params;
  const { companyId, active } = req.query;
  const data = await prisma.styleItem.findMany({
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
  const {
    name,
    aliasName,
    active,
    code,
    hsnId,
    uomId,
    sizeTemplateId,
    itemGroupId,
    itemSubGroupId,
    gsmId,
  } = await body;
  const data = await prisma.item.create({
    data: {
      name,
      aliasName,
      active,
      code,
      hsnId: parseInt(hsnId) || null,
      itemGroupId: parseInt(itemGroupId) || null,
      active: active ? Boolean(active) : false
    },
  });
  return { statusCode: 0, data };
}

async function update(id, body) {
  const {
    name,
    active,
    aliasName,
    code,
    hsnId,
    uomId,
    sizeTemplateId,
    itemGroupId,
    itemSubGroupId,
    gsmId,
  } = await body;

  const dataFound = await prisma.item.findUnique({
    where: {
      id: parseInt(id),
    },
  });
  if (!dataFound) return NoRecordFound("styleItem");
  const data = await prisma.item.update({
    where: {
      id: parseInt(id),
    },
    data: {
      name,
      aliasName,
      active,
      code,
      hsnId: parseInt(hsnId) || null,
      itemGroupId: parseInt(itemGroupId) || null,
      active: active ? Boolean(active) : false
    },
  });
  return { statusCode: 0, data };
}

async function remove(id) {
  const data = await prisma.item.delete({
    where: {
      id: parseInt(id),
    },
  });
  return { statusCode: 0, data };
}

export { get, getOne, getSearch, create, update, remove };
