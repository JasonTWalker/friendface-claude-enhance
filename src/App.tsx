import Header from "./components/header-components/Header.tsx";
import Posts from "./components/post-display-components/Posts.tsx";
import PostForm from "./components/post-display-components/PostForm.tsx"
import { useAppSelector } from "./app/hooks.ts";
import { useEffect } from "react";

const App = () => {
  const title: string = "FriendFace";
  const subtitle: string = "all your friends are here";
// React Redux 

  const theme = useAppSelector(state => state.theme)

  useEffect(() => {
    switch(theme.value) {
      case "light":
      case "dark":
        document.body.setAttribute("data-theme", theme.value);
        break;
      default:
        console.error("Invalid theme value in Redux store: " + theme.value);
        console.log("Defaulting to light theme.");
        document.body.setAttribute("data-theme", "light");
        
    }
  }, [theme]);

  return(
  <>
  <Header title={title} subtitle={subtitle}/>
  <PostForm />
  <Posts />
  </>)
};

export default App
