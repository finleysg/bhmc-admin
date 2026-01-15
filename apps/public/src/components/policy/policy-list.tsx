import React, { useEffect, useRef } from "react"

import { useLocation } from "react-router-dom"

import { usePolicies } from "../../hooks/use-policies"
import { PolicyType } from "../../models/codes"
import { FullPageSpinner } from "../spinners/full-screen-spinner"
import { PolicyDetail } from "./policy-detail"

const policyCode = (stub: string) => {
	switch (stub) {
		case "policies-and-procedures":
			return PolicyType.Policy
		case "local-rules":
			return PolicyType.LocalRule
		case "scoring-and-handicaps":
			return PolicyType.Scoring
		case "new-member-faqs":
			return PolicyType.NewMembers
		case "payment-faqs":
			return PolicyType.Paymnts
		default:
			return PolicyType.Policy
	}
}

interface PolicyListProps {
	stub: string
}

export function PolicyList({ stub }: PolicyListProps) {
	const { data: policies, isLoading } = usePolicies(policyCode(stub))
	const location = useLocation()
	const lastHashRef = useRef<string>("")

	useEffect(() => {
		if (location.hash) {
			lastHashRef.current = location.hash.slice(1)
		}

		if (!isLoading && lastHashRef.current && document.getElementById(lastHashRef.current)) {
			document.getElementById(lastHashRef.current)?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			})
		}
	}, [isLoading, location])

	return (
		<React.Fragment>
			{isLoading ? (
				<FullPageSpinner />
			) : (
				<div className="mt-4">
					{policies?.map((policy) => {
						return <PolicyDetail key={policy.id} policy={policy} />
					})}
				</div>
			)}
		</React.Fragment>
	)
}
