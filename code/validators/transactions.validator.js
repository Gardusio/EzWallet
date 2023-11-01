import { validateStrings } from "./utils.validator.js"
import { categories } from "../models/model.js"
import { getUserByUsername } from "../services/user.service.js"

export const validateTransactionRequest = async (transaction, pathUser) => {
    const { username, amount, type } = transaction


    const parsedAmount = parseFloat(amount)
    if (!validateStrings([username, type, amount]) ||
        pathUser !== username ||
        isNaN(parsedAmount)) {

        return { valid: false, cause: "Invalid informations" }
    }

    // check user exists
    const user = await getUserByUsername(username)
    if (!user) {
        return { valid: false, cause: "User does not exist" }
    }
    // check category exists
    const category = await categories.findOne({ type: type })
    if (!category) {
        return { valid: false, cause: "Category does not exist" }
    }

    return { valid: true }
}