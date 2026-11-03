import { useParams } from "react-router";

const Author = () => {
  let author = useParams();

  return (
  <h2>Author: {author.authorName}</h2>
);};

export default Author