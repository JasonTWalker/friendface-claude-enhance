import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppDispatch } from "../../app/hooks";
import { setCredentials } from "../../features/authSlice";
import type { AuthResponse, Credentials } from "../../services/auth";

interface AuthFormProps {
    heading: string
    submitLabel: string
    // performs the login/register API call, resolving with the user and token
    onSubmit: (credentials: Credentials) => Promise<AuthResponse>
}

// shared by Login and Register: collects a username and password, stores the result in Redux, then returns home
const AuthForm = ({ heading, submitLabel, onSubmit }: AuthFormProps) => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const username = String(formData.get("username") ?? "").trim()
        const password = String(formData.get("password") ?? "")

        if (!username || !password) {
            setError("You must provide a username and password!")
            return
        }

        setError(null)
        setIsSubmitting(true)
        try {
            const { user, token } = await onSubmit({ username, password })
            dispatch(setCredentials({ user, token }))
            navigate("/")
        } catch (err) {
            // RTK Query rejects with { status, data: { message } } for HTTP errors
            const message = (err as { data?: { message?: string } })?.data?.message
            setError(message ?? "Something went wrong, please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="auth-form" onSubmit={handleSubmit}>
            <h2>{heading}</h2>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
                autoComplete={submitLabel === "Register" ? "new-password" : "current-password"} />
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={isSubmitting}>{submitLabel}</button>
        </form>
    )
}

export default AuthForm
