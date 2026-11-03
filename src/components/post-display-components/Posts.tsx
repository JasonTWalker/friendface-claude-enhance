import "../../styles/posts.scss"
import Post from "./Post"
import ContrastToggle from "../button-components/ContrastToggle";
import { useEffect } from "react";

// React Redux 
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { addPost, addPosts } from '../../features/postsSlice'

// React redux for showing/hiding the form to create a post. 
import { togglePostCreationForm } from "../../features/showPostCreationFormSlice"
// for toggling light/dark mode
import { setTheme } from "../../features/themeSlice"

// postsApi !
import { useGetPostsQuery, useAddPostMutation } from "../../services/posts"

export interface PostModel {
  id: string;
  author: string;
  // id of the user who created the post; absent on legacy posts, which nobody owns
  authorId?: string;
  content: string;
  date: string;
  likes: number;
}

const Posts = () => {
  // assign reference to posts state and dispatch
  const posts = useAppSelector(state => state.posts.value)  // will later rename to simply 'posts' once conflicts can be avoided.  
  
  const theme = useAppSelector(state => state.theme)
  const user = useAppSelector(state => state.auth.user)
  const dispatch = useAppDispatch()
  
  // useEffect hook to put posts from db into posts state/store
  const {data,  error, isLoading} = useGetPostsQuery();

  // addPost hook
  const [addPostToDB] = useAddPostMutation(); 


  useEffect(() => {
    if (data){
      dispatch(addPosts(data))
    }
  }, [data, dispatch])
  
  function handleChange() {
    let stringTheme = theme.value === "light" ? "dark" : "light";
    dispatch(setTheme(stringTheme));
  }

  function handleAddPostClick() {
    if (!user) return;
    let postToAdd: PostModel =
    {
      id: crypto.randomUUID(),
      author: user.username,
      authorId: user.id,
      content: 'Hello !',
      date: new Date(Date.UTC(2026, 9, 4)).toISOString(),
      likes: 1,
    }

    // to resolve errors where the Redux State posts ID was differing from the database ID,
    // now the UI/Redux will only update if the database successfully adds the post and returns the PostModel with the correct matching ID.
    addPostToDB(postToAdd).unwrap().then((response) => {
      dispatch(addPost(response))
    }).catch((error) => {
      console.error("Failed to add post to database.", error)
    })
  }

  function handleCreatePostClick() {
    dispatch(togglePostCreationForm())
  }

  return (
    <div className="posts_container">
      <div className="button-bar">
        <ContrastToggle label="Dark Mode" onChange={handleChange} />
        {user ? (
          <>
            <button onClick={handleAddPostClick} className="add-post-button">Add Post</button>
            <button onClick={handleCreatePostClick} className="add-post-button">Create Postt</button>
          </>
        ) : (
          <span>Log in to create posts and like them.</span>
        )}
      </div>
      {/* logic to display different results in the posts div based on getPostsQuery results */}
      {error ? (
        <>There was an error loading posts data</>
      ) : isLoading ? (
        console.log("loading posts"),
        <>Loading posts...</>
      ) : typeof data === 'undefined' ? (
        <>Posts data from database is undefined.</>
      ) : posts? (
        posts.length > 0 ? (
          posts.map(post =>
            <Post postId = {post.id} key={post.id} />)
          ) : (
              <b>No matching posts to display.</b>
          )
      ) : null}
    </div>
);};

export default Posts
