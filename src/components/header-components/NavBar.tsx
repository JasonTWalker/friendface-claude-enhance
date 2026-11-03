import { NavLink } from "react-router";
import "../../styles/navbar.scss"
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/authSlice";

const NavBar = () => {
  const user = useAppSelector(state => state.auth.user)
  const dispatch = useAppDispatch()

  return (
  <div>
    <nav>
    <NavLink to="/">Home</NavLink>
    <NavLink to="/authors">Authors</NavLink>
    {user ? (
      <>
        <span className="nav__user">Logged in as {user.username}</span>
        <button type="button" className="nav__logout" onClick={() => dispatch(logout())}>Log out</button>
      </>
    ) : (
      <>
        <NavLink to="/login">Log in</NavLink>
        <NavLink to="/register">Register</NavLink>
      </>
    )}
    </nav>
  </div>
);};

export default NavBar
