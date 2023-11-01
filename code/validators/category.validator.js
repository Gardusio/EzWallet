import { validateStrings } from "./utils.validator.js"
import { getCategoryByType } from "../services/category.service.js"

// TO TEST
export const validateCategoriesRequest = async (request, requestedType) => {
    const { type: type, color: color } = request

    if (!validateStrings([type, color])) {
        return { valid: false, cause: "Missing informations" }
    }

    const newTypeExists = await getCategoryByType(type)
    if (newTypeExists && requestedType !== type) {
        return { valid: false, cause: "Category with this type exists already" }
    }

    return { valid: true }
}