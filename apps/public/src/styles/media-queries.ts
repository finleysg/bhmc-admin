export const extraLarge = "@media (min-width: 1201px)"
export const large = "@media (min-width: 993px) and (max-width: 1200px)"
export const medium = "@media (min-width: 769px) and (max-width: 992px)"
export const small = "@media (min-width: 577px) and (max-width: 768px)"
export const mobile = "@media (max-width: 576px)"

export const isMobile = () => {
	return window.innerWidth <= 576
}

export const isSmall = () => {
	return window.innerWidth > 576 && window.innerWidth <= 768
}

export const isMedium = () => {
	return window.innerWidth > 768 && window.innerWidth <= 992
}

export const isLarge = () => {
	return window.innerWidth > 992 && window.innerWidth <= 1200
}

export const isExtraLarge = () => {
	return window.innerWidth >= 1200
}
