import { useEffect } from "react"

import { MdAccountCircle } from "react-icons/md"
import { useNavigate, useParams } from "react-router-dom"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { FidgetSpinner } from "../../components/spinners/spinner"
import { useAuth } from "../../hooks/use-auth"

export function ActivateAccountScreen() {
	const { uid, token } = useParams()
	const {
		activate: { mutate, isPending, isError, isSuccess, error },
	} = useAuth()
	const navigate = useNavigate()

	useEffect(() => {
		if (!uid || !token) {
			// Handle missing params - could set an error state or navigate away
			return
		}
		mutate({ uid, token })
	}, [mutate, uid, token])

	const handleLogin = () => {
		navigate("/session/login")
	}

	return (
		<div className="login">
			<div className="login__block active">
				<div className="login__header bg-success">
					<i>
						<MdAccountCircle />
					</i>
					Account Activation
				</div>
				{isPending && (
					<div className="login__body">
						<h3 className="text-green">
							<FidgetSpinner />
						</h3>
						<p>Activating your account...</p>
					</div>
				)}
				{!isPending && isError && (
					<div className="login__body">
						<h3>Activation Failed</h3>
						{error && (
							<ErrorDisplay
								error={error instanceof Error ? error.message : String(error)}
								delay={3000}
							/>
						)}
					</div>
				)}
				{isSuccess && (
					<div className="login__body">
						<h3>Your Account is Active</h3>
						<p>
							Thank you! Log in now to sign up for an event or update your profile. If you
							don&apos;t have a GHIN, you will receive one when you join us for the current golf
							season.
						</p>
						<button className="btn btn-success" onClick={handleLogin}>
							Login
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
