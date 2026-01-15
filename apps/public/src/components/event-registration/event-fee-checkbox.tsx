import { Checkbox, CheckboxProps } from "../forms/checkbox"

interface EventFeeCheckboxProps extends Omit<CheckboxProps, "onChange"> {
	isRequired: boolean
	isSelected: boolean
	onChange: (selected: boolean) => void
}

export function EventFeeCheckbox({
	isRequired,
	isSelected,
	onChange,
	...rest
}: EventFeeCheckboxProps) {
	const handleChange = () => {
		if (!isRequired) {
			onChange(!isSelected)
		}
	}

	const getTitle = () => {
		if (isSelected) {
			return "Remove from registration"
		}
		return "Add to registration"
	}

	return <Checkbox title={getTitle()} checked={isSelected} onChange={handleChange} {...rest} />
}
