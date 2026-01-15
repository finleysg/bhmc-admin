import React from "react"

import { toast } from "react-toastify"

import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "../../hooks/use-auth"
import { useMyCards } from "../../hooks/use-my-cards"
import { SavedCard } from "../../models/saved-card"
import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { CardContent } from "../card/content"
import { ConfirmDialog } from "../dialog/confirm"
import { ErrorDisplay } from "../feedback/error-display"
import { ManageCreditCards } from "../payment/manage-credit-cards"
import { StyledCardElement } from "../payment/styled-card-element"
import { LoadingSpinner } from "../spinners/loading-spinner"

export function MyCards() {
	const [action, setAction] = React.useState("idle")
	const [setupError, setSetupError] = React.useState<string>()
	const [isBusy, setIsBusy] = React.useState(false)
	const [showConfirm, setShowConfirm] = React.useState(false)
	const [currentCard, setCurrentCard] = React.useState<SavedCard>()

	const { user } = useAuth()
	const { data: myCards } = useMyCards()
	const stripe = useStripe()
	const elements = useElements()
	const queryClient = useQueryClient()

	const handleCardSetup = async () => {
		setIsBusy(true)
		setSetupError(undefined)

		try {
			const card = elements?.getElement(CardElement)
			if (card) {
				const intent = await httpClient(apiUrl("save-card"), { method: "POST" })
				const result = await stripe?.confirmCardSetup(intent.client_secret, {
					payment_method: {
						card: card,
						billing_details: {
							email: user.email,
							name: `${user.firstName} ${user.lastName}`,
						},
					},
				})

				if (result?.error) {
					handleError(result.error)
					toast.error("💣 Failed to save new card.")
				} else {
					queryClient.invalidateQueries({ queryKey: ["my-cards"] })
					toast.success("💳 Your card has been saved for future use.")
				}
			}
		} catch (err) {
			handleError(err)
			toast.error("💣 Failed to save new card.")
		}
		setIsBusy(false)
		setAction("idle")
	}

	const confirmRemoveCard = (card: SavedCard) => {
		setCurrentCard(card)
		setShowConfirm(true)
	}

	const handleRemoveCard = async (result: boolean) => {
		if (result === false) {
			setShowConfirm(false)
			return // cancel
		}
		setShowConfirm(false)
		await httpClient(apiUrl(`remove-card/${currentCard?.paymentMethod}`), {
			method: "DELETE",
		})
		queryClient.invalidateQueries({ queryKey: ["my-cards"] })
		toast.success("💳 Your card has been removed.")
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleError = (err: any) => {
		if (typeof err === "string") {
			setSetupError(err)
		} else if (err.message) {
			setSetupError(err.message)
		} else {
			setSetupError(JSON.stringify(err))
		}
	}

	return (
		<React.Fragment>
			<CardContent contentKey="my-cards">
				<React.Fragment>
					<div className="row" style={{ marginBottom: "1rem", marginTop: "2rem" }}>
						<div className="col-12">
							<ManageCreditCards
								cards={myCards ?? []}
								onAdd={() => setAction("add")}
								onRemove={confirmRemoveCard}
							/>
						</div>
					</div>
					{action === "add" && (
						<React.Fragment>
							<div className="row" style={{ marginBottom: "1rem" }}>
								<div className="col-12">
									<StyledCardElement />
								</div>
							</div>
						</React.Fragment>
					)}
					<div className="row">
						<div className="col-12">
							{setupError && <ErrorDisplay error={setupError} delay={5000} onClose={() => 0} />}
							<LoadingSpinner loading={isBusy} paddingTop="10px" />
						</div>
					</div>
					<hr />
					<div className="row" style={{ textAlign: "right" }}>
						<div className="col-12">
							<button
								className="btn btn-primary"
								disabled={action === "idle" || isBusy}
								style={{ marginLeft: ".5rem" }}
								onClick={handleCardSetup}
							>
								Save
							</button>
						</div>
					</div>
				</React.Fragment>
			</CardContent>
			<ConfirmDialog show={showConfirm} message="Remove this card?" onClose={handleRemoveCard} />
		</React.Fragment>
	)
}
