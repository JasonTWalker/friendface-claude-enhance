import "../../styles/PostForm.scss"
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { addPost } from "../../features/postsSlice";
import { hidePostCreationForm } from "../../features/showPostCreationFormSlice";
import type { PostModel }  from "./Posts"
import { useAddPostMutation } from "../../services/posts";

const PostForm = () => {
    // Fetch states from store
    const showForm = useAppSelector(state => state.showPostCreationForm.value)
    const user = useAppSelector(state => state.auth.user)
    const dispatch = useAppDispatch()

    const [addPostToDB, {isLoading}] = useAddPostMutation();

    // 
    function handleCancel() {
        dispatch(hidePostCreationForm())
    }

    // custom "submit" logic 
    function handleCreatePost(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {

        let form = event.currentTarget.form;
        if(!form || !user) return;

        if(!validateFormData(form.content.value)) return;

        let postToAdd: PostModel = {
          id: crypto.randomUUID(),
          author: user.username,
          authorId: user.id,
          content: form.content.value,
          date: new Date(Date.now()).toISOString(),
          likes: 0,
        };

        addPostToDB(postToAdd).unwrap().then((response) => {
            dispatch(addPost(response))
        }).catch((err) => {
            console.error("Failed to add post to database from Form.", err)
        });

        // clear form after submission
        form.reset();
    }

    function validateFormData(content: string) {
        if(!content){
            alert("You must provide some content!")
            return false;
        }

        // ADDITIONAL CONDITIONS FOR BANNED CHARS ETC.
        return true;
    }

    if(showForm && user) {
        return(
            <div className="post-form-container">
            <form className="post-form">
                <p>Posting as {user.username}</p>
                <label htmlFor="contentField">Content: </label> 
                <input name="content" /> <br />
                <button type="button" onClick={handleCreatePost} disabled={isLoading}>Create Post</button>
                <button type="button" onClick={handleCancel}>Cancel</button>      
                
            </form>
        </div>
        )
    } else {
        return
    }
}
export default PostForm