import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { PostModel } from "../components/post-display-components/Posts"
import type { RootState } from "../app/store"

export const postsApi = createApi({
    reducerPath: 'postsApi',
    baseQuery: fetchBaseQuery( {
        baseUrl: "http://localhost:3000/",
        // attach the logged in user's token to every request
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token
            if (token) {
                headers.set("Authorization", `Bearer ${token}`)
            }
            return headers
        }
    }),
    endpoints: (builder) => ({
        getPosts: builder.query<PostModel[], void>({
            query: () => '/posts'
            // look into adding tags to improve performance and caching
            // e.g. ['Posts'], or if authors become an object ['Authoors']
            // this way say, only authors will be refetched if only authors are modified and this doesnt effect Posts
        }),

        deletePostById: builder.mutation<void, string>  ({
            query: (postId) => ({
                url: `/posts/${postId}`,
                method: 'DELETE'
            })
        }),

        // return type of <PostModel>, this way the new post creation can use this to get the PostModel to add to the Redux store
        addPost: builder.mutation<PostModel, PostModel> ({
            query: (postToAdd) => ({
                url: `/posts`,
                method: 'POST',
                body: postToAdd
            }),
        }),

        // update post likes by paramrters of postId and newPostLikes.
        // calculation of incrementing post likes should be done before calling this mutation, so that the backend can just update the post with the new number of likes.
        updateLikesOnPostById: builder.mutation<PostModel, {postId: string, newPostLikes: number}> ({
            query: ( {postId, newPostLikes} ) => ({
                url: `/posts/${postId}`,
                method: 'PATCH',
                body: { likes : newPostLikes }  })
        })
    })
})

// export hook
export const { useGetPostsQuery, useDeletePostByIdMutation, useAddPostMutation, useUpdateLikesOnPostByIdMutation } = postsApi;


