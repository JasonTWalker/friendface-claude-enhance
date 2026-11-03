import "../../styles/post.scss"
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { deletePost, updateLikesOnPostById } from "../../features/postsSlice";
import { useDeletePostByIdMutation, useUpdateLikesOnPostByIdMutation } from "../../services/posts";
import avatarUrl from "../../media/user-avatar.svg"

// postId passed from Posts.tsx, postId used to find the index of the Post within the redux store, and use this to propagate the array
const Post = ( { postId } : { postId : string }) => {

  // selector = PostModel in Redux State with ID equal to propped
  const selector = useAppSelector(state => state.posts.value.find( (post) => 
    post.id === postId
  ))

  // logged in user decides whether the like/delete actions are available
  const user = useAppSelector(state => state.auth.user)

  // Define hooks to API slice for deletion and updating likes
  // done before early return to avoid React "rendered fewer hooks than expected error"
  // for more info see comments: https://stackoverflow.com/questions/53472795/uncaught-error-rendered-fewer-hooks-than-expected-this-may-be-caused-by-an-acc
  const [deletePostFromDB //, 
    //{isLoading}
  ] = useDeletePostByIdMutation();

  const [updateLikesOnPost] = useUpdateLikesOnPostByIdMutation();
  

  // Validate that the selector PostModel is not undefined, i.e. a matching Post to propped ID has been found.
  // otherwise, early return
  if(selector === undefined) return null;
  
    
    // API slice actions to remove posts from database and update likes.
    const dispatch = useAppDispatch();
    
    
  // upon clicking the delete post button, attempt to delete the post from the database
  // if this promise is resolved (successful), then remove the post from the Redux store
  // otherwise, throw error
  const handleDeletePostClick = async (postId: string) => {
    deletePostFromDB(postId).unwrap().then(() => {
      dispatch(deletePost(postId));
      return;
      }).catch((error) => {
      console.error("Failed to delete post from database.", error)
    })
  }

  // as above, but for mutating the likes field on a post.
  function handleLikePostClick(postId: string) {
      let newLikes = selector.likes + 1;;
      updateLikesOnPost({postId, newPostLikes: newLikes}).unwrap().then((response) => {
          dispatch(updateLikesOnPostById({postId, newPostLikes: response.likes}))
      }).catch((err) => {
          console.error(`Failed to increment post likes in database. Target post id: ${postId}`, err)
      });
  }
  
  // as date field is stored as string, convert back to Date object for string conversions for HTML readability
  const dateAsDate: Date =  new Date(selector.date);

  // return HTML with references to store values for the propped postId
  // this allows for dynamic updating, but I'm curious about what errors will arise
  // if ordering changes and the index calculations at the top of this class are not recalculated.
  return (
<article
    key={selector.id}
    className={`post`}
  >
    <header className="post__header">
      <img
        src={avatarUrl}
        className="post__avatar"
        alt=""
      />

      <div className="post__author-info">
        <p className="post__author">{selector.author}</p>
        <time className="post__date" dateTime={dateAsDate.toISOString()}>
          {dateAsDate.toDateString()}
        </time>
      </div>
    </header>

    <div className="post__content">
      {selector.content}
    </div>

    <footer className="post__footer">
      <span className="post__likes">
        {selector.likes} {selector.likes === 1 ? 'like' : 'likes'}
      </span>

      <span className="post__id">Post #{selector.id}</span>
    </footer>

    <div className="post__actions">
      {user && (
        <button
          type="button"
          data-testid="like-button"
          className="post__button post__button--like"
          onClick={() => handleLikePostClick(selector.id)}
        >
          Like post
        </button>
      )}

      {/* only the post's owner can delete it */}
      {user && selector.authorId === user.id && (
        <button
          type="button"
          data-testid="delete-button"
          className="post__button post__button--delete"
          onClick={() => handleDeletePostClick(selector.id)}
        >
          Delete
        </button>
      )}
    </div>
  </article>
);};
export default Post;