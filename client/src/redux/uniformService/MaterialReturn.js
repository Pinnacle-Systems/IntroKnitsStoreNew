import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { MATERIAL_RETURN } from "../../Api";

const BASE_URL = process.env.REACT_APP_SERVER_URL;

const MaterilReturnApi = createApi({
  reducerPath: "MaterialReturn",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
  }),
  tagTypes: ["MaterialReturn"],
  endpoints: (builder) => ({
    getMaterialReturn: builder.query({
      query: ({ params, searchParams }) => {
        if (searchParams) {
          return {
            url: MATERIAL_RETURN + "/search/" + searchParams,
            method: "GET",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            params,
          };
        }
        return {
          url: MATERIAL_RETURN,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialReturn"],
    }),
    getPurchaseDetail: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_RETURN}/purchaseDetail`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["PurchaseReturn"],
    }),
    getMaterialReturnById: builder.query({
      query: (id) => {
        return {
          url: `${MATERIAL_RETURN}/${id}`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
        };
      },
      providesTags: ["MaterialReturn"],
    }),
    getMaterialReturnForBillById: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_RETURN}/MaterialReturnForBill`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialReturn"],
    }),
    getPurInwardItems: builder.query({
      query: ({ params }) => {
        return {
          url: `${MATERIAL_RETURN}/purInwardItemDetails`,
          method: "GET",
          headers: {
            "Content-type": "application/json; charset=UTF-8",
          },
          params,
        };
      },
      providesTags: ["MaterialReturn"],
    }),
    addMaterialReturn: builder.mutation({
      query: (payload) => ({
        url: MATERIAL_RETURN,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["MaterialReturn"],
    }),
    updateMaterialReturn: builder.mutation({
      query: ({ id, body }) => {
        return {
          url: `${MATERIAL_RETURN}/${id}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: ["MaterialReturn"],
    }),
    deleteMaterialReturn: builder.mutation({
      query: (id) => ({
        url: `${MATERIAL_RETURN}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["MaterialReturn"],
    }),
  }),
});

export const {
  useGetMaterialReturnQuery,
  useGetMaterialReturnByIdQuery,
  useLazyGetMaterialReturnByIdQuery,
  useAddMaterialReturnMutation,
  useUpdateMaterialReturnMutation,
  useDeleteMaterialReturnMutation,
  useLazyGetPurchaseDetailQuery,
  useGetPurInwardItemsQuery,
  useGetMaterialReturnForBillByIdQuery,
} = MaterilReturnApi;

export default MaterilReturnApi;
