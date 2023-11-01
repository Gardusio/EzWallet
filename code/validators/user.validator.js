
import { validateStrings, validateEmails } from "./utils.validator.js"

export const validateGroupRequest = (emails, name) => {
    const strings = name ? [...emails, name] : emails

    if (!validateStrings(strings) ||
        !validateEmails(emails)) {
        return false
    }

    return true
}