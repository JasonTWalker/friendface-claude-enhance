import { createSlice} from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { PostModel } from '../components/post-display-components/Posts' 

// Define type for slice state. in this case, an array of PostModels
export interface PostsState {
    value: PostModel[]
}

let initialValue: PostModel[] = [] 

const initialState: PostsState = {
    value: initialValue,
}

export const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {
        addPost: (state, action: PayloadAction<PostModel>) => {
            state.value.push(action.payload)
        },

        deletePost: (state, action: PayloadAction<string>) => {
            let index = state.value.findIndex(post => post.id==action.payload)
            if(index === -1){
                console.log("In deletePost reducer, no post found with post id of: " + action.payload)
            }
            state.value.splice(index, 1)
        },

        // reducer to add a list of posts to the store
        addPosts: (state, action: PayloadAction<PostModel[]>) => {
            state.value = action.payload;
        },

        updateLikesOnPostById: (state, action: PayloadAction<{postId: string, newPostLikes: number}>) => {
            let index = state.value.findIndex(post => post.id===action.payload.postId)
            if(index === -1) {
                console.log("In updateLikesOnPostById reducer, no post found with id of: " + action.payload.postId)
            }
            state.value[index].likes = action.payload.newPostLikes;
        }
    }
})

export const { addPost, deletePost, addPosts, updateLikesOnPostById} = postsSlice.actions
export default postsSlice.reducer

