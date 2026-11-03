import AuthForm from "./AuthForm";
import { useLoginMutation } from "../../services/auth";

const Login = () => {
    const [login] = useLoginMutation()
    return <AuthForm heading="Log in" submitLabel="Log in" onSubmit={(credentials) => login(credentials).unwrap()} />
}

export default Login
