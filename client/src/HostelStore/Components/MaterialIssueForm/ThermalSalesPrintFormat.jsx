import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { createTw } from 'react-pdf-tailwind';
import moment from 'moment';

const tw = createTw({
  theme: {
    extend: {
      colors: {
        primary: '#000000',
      },
      fontSize: {
        'xxs': '7pt',
        'xs': '8pt',
        'sm': '9pt',
        'base': '10pt',
        'lg': '12pt',
      }
    },
  },
});

const styles = StyleSheet.create({
  page: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    width: '200pt', // Approx 72mm
  },
  dottedLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
});

const ThermalSalesPrintFormat = ({
  title = "MATERIAL ISSUE",
  docId,
  date,
  branchData,
  items = [],
  remarks,
  itemList = [],
  sizeList = [],
  colorList = [],
  supplierName,
  orderNo,
  department,
  inchargeName,
  processType,
}) => {

  const findFromList = (id, list, key) => {
    if (!id || !list) return "";
    const item = list.find(l => parseInt(l.id) === parseInt(id));
    return item ? item[key] : "";
  };

  const totalQty = items.reduce((acc, item) => acc + parseFloat(item.issueQty || item.qty || 0), 0);
  const totalAmount = items.reduce((acc, item) => acc + (parseFloat(item.issueQty || item.qty || 0) * parseFloat(item.price || 0)), 0);

  return (
    <Document title={`${title}_${docId}`}>
      <Page size={[216, 'auto']} style={tw('p-1 bg-white flex flex-col')}>
        {/* Header */}
        <View style={tw('flex flex-col items-center mb-1')}>
          <Text style={tw('font-bold text-xs')}>{branchData?.branchName || "WALRUS"}</Text>
          <Text style={tw('text-xxs')}>{branchData?.address || ""}</Text>
          <Text style={tw('text-xxs')}>Ph No.: {branchData?.contactPersonNumber || branchData?.phone || ""}</Text>
        </View>

        <View style={tw('flex flex-col items-center mb-1')}>
          <Text style={tw('font-bold text-xxs underline')}>{title}</Text>
        </View>

        <View style={tw('flex flex-row justify-between mb-1')}>
          <View style={tw('flex flex-col w-1/2')}>
            <Text style={tw('text-xxs')}>DocId: {docId}</Text>
            {supplierName && <Text style={tw('text-xxs font-bold mt-1')}>{supplierName}</Text>}
            {orderNo && <Text style={tw('text-xxs')}>Order: {orderNo}</Text>}
            {processType && <Text style={tw('text-xxs')}>Process: {processType}</Text>}
          </View>
          <View style={tw('flex flex-col items-end w-1/2')}>
            <Text style={tw('text-xxs')}>Date: {date ? moment(date).format('DD/MM/YYYY') : moment().format('DD/MM/YYYY')}</Text>
            <Text style={tw('text-xxs')}>Time: {moment().format('HH:mm A')}</Text>
            {department && <Text style={tw('text-xxs mt-1')}>Dept: {department}</Text>}
            {inchargeName && <Text style={tw('text-xxs')}>Incharge: {inchargeName}</Text>}
          </View>
        </View>

        {/* Items Table Header */}
        <View style={styles.dottedLine} />
        <View style={tw('flex flex-row justify-between py-1')}>
          <Text style={tw('text-xxs font-bold w-[10%]')}>S.No</Text>
          <Text style={tw('text-xxs font-bold w-[45%]')}>Name</Text>
          <Text style={tw('text-xxs font-bold w-[15%] text-right')}>Qty</Text>
          <Text style={tw('text-xxs font-bold w-[15%] text-right')}>Price</Text>
          <Text style={tw('text-xxs font-bold w-[15%] text-right')}>Amt</Text>
        </View>
        <View style={styles.dottedLine} />

        {/* Items */}
        {items.map((item, index) => {
          const itemName = findFromList(item.itemId, itemList, "name");
          const sizeName = findFromList(item.sizeId, sizeList, "name");
          const colorName = findFromList(item.colorId, colorList, "name");
          const qty = parseFloat(item.issueQty || item.qty || 0);
          const amount = qty * parseFloat(item.price || 0);

          return (
            <View key={index} style={tw('flex flex-col mb-1')}>
              <View style={tw('flex flex-row justify-between')}>
                <Text style={tw('text-xxs w-[10%]')}>{index + 1}</Text>
                <Text style={tw('text-xxs w-[45%]')}>{itemName} {sizeName} {colorName}</Text>
                <Text style={tw('text-xxs w-[15%] text-right')}>{qty.toFixed(2)}</Text>
                <Text style={tw('text-xxs w-[15%] text-right')}>{parseFloat(item.price || 0).toFixed(2)}</Text>
                <Text style={tw('text-xxs w-[15%] text-right')}>{amount.toFixed(2)}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.dottedLine} />

        {/* Totals */}
        <View style={tw('flex flex-row justify-between mb-1')}>
          <Text style={tw('text-xxs font-bold')}>Total Qty: {totalQty.toFixed(2)}</Text>
          <Text style={tw('text-xxs font-bold')}>Total Amt: Rs. {totalAmount.toFixed(2)}</Text>
        </View>

        {remarks && (
          <View style={tw('flex flex-col mt-1')}>
            <Text style={tw('text-xxs font-bold')}>Remarks:</Text>
            <Text style={tw('text-xxs')}>{remarks}</Text>
          </View>
        )}

        <View style={styles.dottedLine} />

        <View style={tw('flex flex-col items-center mt-2')}>
          <Text style={tw('text-xxs text-center')}>Authorized Signatory</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ThermalSalesPrintFormat;
