
export const validateEmails = (emails) => {
    return emails.reduce((e, e1) => validateEmail(e) && validateEmail(e1))
}

export const validateEmail = (email) => {
    const validRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isValid = email.match(validRegex)
    if (!isValid) {
        return false
    }
    return true
}

export const validateStrings = (strings) => {

    const existingAndNonEmpty = strings.filter(s =>
        s !== null &&
        s !== undefined &&
        s !== ""
    )

    if (existingAndNonEmpty.length !== strings.length) {
        return false
    }

    return true
}