"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { signIn } from "../../lib/auth-client"

export default function SignInPage() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState("")
	const router = useRouter()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		void handleSignIn()
	}

	const handleSignIn = async () => {
		setIsLoading(true)
		setError("")

		try {
			const result = await signIn(email, password)

			if (result.error) {
				setError(result.error.message || "Sign-in failed")
			} else {
				// Redirect to dashboard or home page on success
				router.push("/")
			}
		} catch (err) {
			setError("An unexpected error occurred")
			console.error("Sign-in error:", err)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
			<div className="w-full max-w-md">
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body">
						<h2 className="card-title justify-center text-2xl mb-4">Sign In</h2>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="form-control">
								<label className="label">
									<span className="label-text">Email</span>
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email"
									className="input input-bordered w-full"
									required
								/>
							</div>

							<div className="form-control">
								<label className="label">
									<span className="label-text">Password</span>
								</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter your password"
									className="input input-bordered w-full"
									required
								/>
							</div>

							{error && (
								<div className="alert alert-error">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="stroke-current shrink-0 h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<span>{error}</span>
								</div>
							)}

							<div className="form-control mt-6">
								<button type="submit" disabled={isLoading} className="btn btn-primary w-full">
									{isLoading ? (
										<>
											<span className="loading loading-spinner loading-sm"></span>
											Signing in...
										</>
									) : (
										"Sign In"
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	)
}
