import NavBar from "./NavBar"
import "../../styles/header.scss"

const Header = ( {title, subtitle} : {title: string, subtitle: string}) => {
  return (
  <div className="friendface_header">
    <h1>{title}</h1>
    <h2>{subtitle}</h2>

    <NavBar />
  </div>
);};

export default Header