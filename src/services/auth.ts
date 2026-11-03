import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthUser } from "../features/authSlice";

export interface Credentials {
    username: string
    password: string
}

export interface AuthResponse {
    user: AuthUser
    token: string
}

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:3000/" }),
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, Credentials>({
            query: (credentials) => ({
                url: '/login',
                method: 'POST',
                body: credentials
            })
        }),

        // creating an account also signs the user in, so it returns the same shape as login
        register: builder.mutation<AuthResponse, Credentials>({
            query: (credentials) => ({
                url: '/users',
                method: 'POST',
                body: credentials
            })
        })
    })
})

export const { useLoginMutation, useRegisterMutation } = authApi;
