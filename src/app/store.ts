import { configureStore } from '@reduxjs/toolkit';
import postsReducer from '../features/postsSlice'
import  showPostFormStateReducer from '../features/showPostCreationFormSlice';

// json-server !
import { postsApi } from '../services/posts';
import { authApi } from '../services/auth';
import  themeReducer  from '../features/themeSlice';
import authReducer, { saveAuthState } from '../features/authSlice';

export const store = configureStore({
    reducer: {
        posts: postsReducer,
        showPostCreationForm: showPostFormStateReducer,
        [postsApi.reducerPath]: postsApi.reducer,
        [authApi.reducerPath]: authApi.reducer,
        theme: themeReducer,
        auth: authReducer
    },

    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(postsApi.middleware, authApi.middleware)

})

// persist login to localStorage, only writing when the auth slice actually changes
let previousAuth = store.getState().auth
store.subscribe(() => {
    const currentAuth = store.getState().auth
    if (currentAuth !== previousAuth) {
        previousAuth = currentAuth
        saveAuthState(currentAuth)
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store

// LOOK INTO SET UP LISTENERS DOCS !
