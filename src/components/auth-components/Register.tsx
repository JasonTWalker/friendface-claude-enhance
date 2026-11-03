import AuthForm from "./AuthForm";
import { useRegisterMutation } from "../../services/auth";

const Register = () => {
    const [register] = useRegisterMutation()
    return <AuthForm heading="Register" submitLabel="Register" onSubmit={(credentials) => register(credentials).unwrap()} />
}

export default Register
