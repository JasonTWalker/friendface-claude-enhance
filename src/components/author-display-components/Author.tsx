import { useParams } from "react-router";

const Author = () => {
  let author = useParams();

  return (
  <h2 className="author-title">Author: {author.authorName}</h2>
);};

export default Author