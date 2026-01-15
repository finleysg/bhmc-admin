import { IconBaseProps } from "react-icons"
import { ImSpinner2 } from "react-icons/im"
import { TbFidgetSpinner } from "react-icons/tb"

export function FidgetSpinner() {
	return <TbFidgetSpinner className="spinner" aria-label="loading" />
}
export function Spinner(props: IconBaseProps) {
	return <ImSpinner2 className="spinner" aria-label="loading" {...props} />
}
