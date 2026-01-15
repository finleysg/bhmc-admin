import { CardElement } from "@stripe/react-stripe-js"

import * as colors from "../../styles/colors"

export function StyledCardElement() {
	return (
		<CardElement
			className="form-control"
			options={{
				style: {
					base: {
						color: colors.dark,
						fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
						fontSmoothing: "antialiased",
						fontSize: "16px",
						"::placeholder": {
							color: colors.gray200,
						},
					},
					invalid: {
						color: colors.danger,
						iconColor: colors.danger,
					},
				},
			}}
		/>
	)
}
