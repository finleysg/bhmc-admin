import { useParams } from "react-router-dom"

import { PolicyList } from "../components/policy/policy-list"
import { Tab } from "../components/tab/tab"
import { Tabs } from "../components/tab/tabs"

export function PolicyScreen() {
	const { policyType } = useParams()

	const urlStub = policyType ?? "policies-and-procedures"

	return (
		<div className="content__inner">
			<Tabs>
				<Tab to="/policies/policies-and-procedures">Policies & Procedures</Tab>
				<Tab to="/policies/local-rules">Local Rules</Tab>
				<Tab to="/policies/scoring-and-handicaps">Scoring & Handicaps</Tab>
				<Tab to="/policies/payment-faqs">Online Payment FAQs</Tab>
				<Tab to="/policies/new-member-faqs">New Member FAQs</Tab>
			</Tabs>
			<PolicyList stub={urlStub} />
		</div>
	)
}
