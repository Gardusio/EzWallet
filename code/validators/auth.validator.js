import { User } from "../models/User.js"
import { getUserByEmail, getUserByUsername } from "../services/user.service.js"
import { validateEmail, validateStrings } from "./utils.validator.js"
import bcrypt from 'bcryptjs'

export const validateLogoutRequest = async (request, callingUser) => {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
        return { valid: false, cause: "Refresh token missing" }
    }

    if (!callingUser) {
        return { valid: false, cause: "User does not exist" }
    }
    return { valid: true }
}

export const validateLoginRequest = async (request, callingUser) => {
    const { email, password } = request

    if (
        !validateStrings([email, password]) ||
        !validateEmail(email)
    ) {
        return { valid: false, cause: "Invalid credentials" }
    }

    if (!callingUser) {
        return { valid: false, cause: "User does not exist" }
    }

    const match = await bcrypt.compare(password, callingUser.password)
    if (!match) {
        return { valid: false, cause: "Wrong credentials" }
    }

    return { valid: true }
}

export const validateRegisterRequest = async (request) => {
    const { username, email, password } = request
    if (!validateStrings([username, email, password])) {
        return { valid: false, cause: "Missing informations" }
    }

    // check on email format
    if (!validateEmail(email)) {
        return { valid: false, cause: "Email inserted is not valid" }
    }

    // check on email and username existence
    const existingEmail = await getUserByEmail(email)
    if (existingEmail) {
        return { valid: false, cause: "Email inserted already in use" }
    }

    const existingUsername = await getUserByUsername(username)
    if (existingUsername) {
        return { valid: false, cause: "Username inserted already in use" }
    }

    return { valid: true }
}
