import { createSlice} from '@reduxjs/toolkit'

export interface ShowPostFormState {
    value: boolean
}


const initialState: ShowPostFormState = {
    value: false,
}

export const showPostCreationFormSlice = createSlice({
    name: 'showPostCreationForm',
    initialState,
    reducers: {
        showPostCreationForm: (state) => {
            state.value = true;
        },
        hidePostCreationForm: (state) => {
            state.value = false;
        },
        togglePostCreationForm: (state) => {
            state.value = !state.value
        }
    }
})

export const { showPostCreationForm, hidePostCreationForm, togglePostCreationForm } = showPostCreationFormSlice.actions
export default showPostCreationFormSlice.reducer