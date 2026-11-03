import { createSlice} from '@reduxjs/toolkit';

export interface ThemeState {
    value: string
}

const initialState: ThemeState = {
    value: "light",
}
export const themeSlice = createSlice({
    name: 'theme',
    initialState: initialState,
    reducers: {
        setTheme: (state, action) => {
            state.value = action.payload;
        }
    }
})

export const { setTheme } = themeSlice.actions
export default themeSlice.reducer
