import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface AuthUser {
    id: string
    username: string
}

export interface AuthState {
    user: AuthUser | null
    token: string | null
}

export const AUTH_STORAGE_KEY = "friendface-auth"

// Storage can throw (private windows, blocked site data) or contain junk, so always fall back to logged out.
function loadAuthState(): AuthState {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed?.token && parsed?.user?.id && parsed?.user?.username) {
                return { token: parsed.token, user: parsed.user }
            }
        }
    } catch (err) {
        console.error("Failed to read saved login from localStorage.", err)
    }
    return { user: null, token: null }
}

export function saveAuthState(state: AuthState): void {
    try {
        if (state.token && state.user) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY)
        }
    } catch (err) {
        console.error("Failed to save login to localStorage.", err)
    }
}

export const authSlice = createSlice({
    name: 'auth',
    initialState: loadAuthState(),
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: AuthUser, token: string }>) => {
            state.user = action.payload.user
            state.token = action.payload.token
        },
        logout: (state) => {
            state.user = null
            state.token = null
        }
    }
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
