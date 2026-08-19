import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ORDER_MASTER_API } from "../../Api";

const BASE_URL = process.env.REACT_APP_SERVER_URL;

const OrderMasterApi = createApi({
    reducerPath: "OrderMaster",
    baseQuery: fetchBaseQuery({
        baseUrl: BASE_URL,
    }),
    tagTypes: ["OrderMaster"],
    endpoints: (builder) => ({
        getOrderMaster: builder.query({
            query: ({ params, searchParams }) => {
                if (searchParams) {
                    return {
                        url: ORDER_MASTER_API + "/search/" + searchParams,
                        method: "GET",
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                        },
                        params
                    };
                }
                return {
                    url: ORDER_MASTER_API,
                    method: "GET",
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                    },
                    params
                };
            },
            providesTags: ["OrderMaster"],
        }),
        getOrderMasterById: builder.query({
            query: (id) => {
                return {
                    url: `${ORDER_MASTER_API}/${id}`,
                    method: "GET",
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                    },
                };
            },
            providesTags: ["OrderMaster"],
        }),
        addOrderMaster: builder.mutation({
            query: (payload) => ({
                url: ORDER_MASTER_API,
                method: "POST",
                body: payload,
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            }),
            invalidatesTags: ["OrderMaster"],
        }),
        updateOrderMaster: builder.mutation({
            query: (payload) => {
                const { id, ...body } = payload;
                return {
                    url: `${ORDER_MASTER_API}/${id}`,
                    method: "PUT",
                    body,
                };
            },
            invalidatesTags: ["OrderMaster"],
        }),
        deleteOrderMaster: builder.mutation({
            query: (id) => ({
                url: `${ORDER_MASTER_API}/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["OrderMaster"],
        }),
    }),
});

export const {
    useGetOrderMasterQuery,
    useGetOrderMasterByIdQuery,
    useLazyGetOrderMasterByIdQuery,
    useAddOrderMasterMutation,
    useUpdateOrderMasterMutation,
    useDeleteOrderMasterMutation,
} = OrderMasterApi;

export default OrderMasterApi;
