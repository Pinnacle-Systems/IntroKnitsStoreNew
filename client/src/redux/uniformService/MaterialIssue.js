import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { MATERIAL_ISSUE } from "../../Api";

const BASE_URL = process.env.REACT_APP_SERVER_URL;

const MaterialIssueApi = createApi({
  reducerPath: "MaterialIssue",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
  }),
  tagTypes: ["MaterialIssue"],
  endpoints: (builder) => ({
    getMaterialIssue: builder.query({
      query: ({ params, searchParams }) => {
        if (searchParams) {
          return {
            url: MATERIAL_ISSUE + "/search/" + searchParams,
            method: "GET",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            params,
          };
        }
        return {
          url: MATERIAL_ISSUE,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialIssue"],
    }),
    getPurchaseDetail: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_ISSUE}/purchaseDetail`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["PurchaseReturn"],
    }),
    getMaterialIssueById: builder.query({
      query: (id) => {
        return {
          url: `${MATERIAL_ISSUE}/${id}`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        };
      },
      providesTags: ["MaterialIssue"],
    }),
    getMaterialIssueForBillById: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_ISSUE}/MaterialIssueForBill`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialIssue"],
    }),
    getPurInwardItems: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_ISSUE}/purInwardItemDetails`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialIssue"],
    }),
    addMaterialIssue: builder.mutation({
      query: (payload) => ({
        url: MATERIAL_ISSUE,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["MaterialIssue"],
    }),
    updateMaterialIssue: builder.mutation({
      query: ({ id, body }) => {
        return {
          url: `${MATERIAL_ISSUE}/${id}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: ["MaterialIssue"],
    }),
    deleteMaterialIssue: builder.mutation({
      query: (id) => ({
        url: `${MATERIAL_ISSUE}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MaterialIssue"],
    }),
  }),
});

export const {
  useGetMaterialIssueQuery,
  useGetMaterialIssueByIdQuery,
  useLazyGetMaterialIssueByIdQuery,
  useAddMaterialIssueMutation,
  useUpdateMaterialIssueMutation,
  useDeleteMaterialIssueMutation,
  useLazyGetPurchaseDetailQuery,
  useGetPurInwardItemsQuery,
  useGetMaterialIssueForBillByIdQuery,
} = MaterialIssueApi;

export default MaterialIssueApi;
