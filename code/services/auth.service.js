import * as auth from "../services/auth.service.js"
import jwt from "jsonwebtoken"

/**
 * Authorization types enum
 */
export const AUTH_TYPE = {
    ADMIN: 'Admin',
    USER: 'User',
    GROUP: 'Group',
    SIMPLE: 'Simple'
}

/**
 * Wraps an authorized token
 */
export class AuthorizedTokenData {
    constructor(token, refresh) {
        this.token = token
        this.authorized = true
        this.refresh = refresh || false
    }
}


/**
 * Wraps an unauthorized token and the denial reason: represent the token authorization status
 */
export class UnAuthorizedTokenData {
    constructor(message) {
        this.authorized = false;
        this.message = message || "Unauthorized";
    }
}

/**
 * Wraps the status of the auth flow
 */
export class AuthStatus {
    constructor(success, message) {
        this.success = success
        this.message = message
    }
}

/**
 * Handle possible authentication modes depending on `authType`.
 * If the auth is performed with refresh token, this function will set appropriate cookies in the res object @see {@link refreshCookies}
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param authType specifies the `authType`, any other unmanaged types will default to Simple
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *         - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @see {@link authorizeUser}
 * @see {@link authorizeAdmin}
 * @see {@link authorizeGroup} 
 * @returns {*} {@link AuthStatus} success if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
*/
export const authorize = (req, res, info) => {
    // Token data obj (either authorized or not)
    const tokenAuthorizationStatus = auth.tokenAuthorize(req.cookies)
    const token = tokenAuthorizationStatus.token

    if (!tokenAuthorizationStatus.authorized) {
        return new AuthStatus(false, tokenAuthorizationStatus.message)
    }

    const authStatus = auth.authorizeType(token, info)

    if (tokenAuthorizationStatus.refresh && authStatus.success) {
        auth.refreshCookies(res, token)
    }

    return authStatus
}

// TO TEST
export const authorizeType = (token, info) => {

    switch (info.authType) {
        case AUTH_TYPE.USER:
            return auth.authorizeUser(token, info.username)

        case AUTH_TYPE.ADMIN:
            return auth.authorizeAdmin(token)

        case AUTH_TYPE.GROUP:
            return auth.authorizeGroup(token, info.emails)

        default:
            // Other unmanaged types will default to Simple auth
            return new AuthStatus(true)
    }
}


/**
 * Checks token validity and consistency independently from the current authorization type
 * @param res the http response object to be updated 
 * @param cookies the request cookie containing access tokens 
 * @returns true if the tokens are valid and consistent, false otherwise.
 * 
 */
export const tokenAuthorize = (cookies) => {
    const refreshToken = cookies && cookies.refreshToken
    const accessToken = cookies && cookies.accessToken

    if (!accessToken || !refreshToken) {
        return new UnAuthorizedTokenData("Unauthorized")
    }

    const {
        token: decodedAccessToken,
        expired: accessExpired,
        message: accessErr
    } = auth.decode(accessToken)

    const {
        token: decodedRefreshToken,
        expired: refreshExpired,
        message: refreshErr
    } = auth.decode(refreshToken)

    const jwtError = accessErr || refreshErr
    if (jwtError) {
        return new UnAuthorizedTokenData(jwtError)
    }

    if (auth.tokenMissingInformations(decodedAccessToken, decodedRefreshToken)) {
        return new UnAuthorizedTokenData("Token is missing information")
    }

    if (auth.tokensMismatch(decodedAccessToken, decodedRefreshToken)) {
        return new UnAuthorizedTokenData("Mismatched users")
    }

    if (!accessExpired) {
        return new AuthorizedTokenData(decodedAccessToken)
    }

    if (!refreshExpired) {
        return new AuthorizedTokenData(decodedRefreshToken, true)
    }

    return new UnAuthorizedTokenData("Perform login again")
}


/**
 * Sets the newly refreshed accessToken to the cookie object in res
 * @param res the HTTP res object 
 * @param refreshToken the refresh token with wich a new accessToken is signed 
 */
export const refreshCookies = (res, refreshToken) => {
    const newAccessToken = jwt.sign({
        username: refreshToken.username,
        email: refreshToken.email,
        id: refreshToken.id,
        role: refreshToken.role
    }, process.env.ACCESS_KEY, { expiresIn: '1h' })

    res.cookie('accessToken', newAccessToken, { httpOnly: true, path: '/api', maxAge: 60 * 60 * 1000, sameSite: 'none', secure: true })
    res.locals.refreshedTokenMessage = 'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls'
}


/********************** AUTH TYPES CRITERIA SERVICES ************************/
/**
 * Handles the "Admin" authorization type
 * @param token since access and refresh token must be valid (authorized) for all authorization types, this can be either one or the other.
 * @see {@link tokenAuthorized}, to have an understanding of what "valid tokens" means
 * @returns AuthStatus(true) if the user is an admin
*/
export const authorizeAdmin = (token) => {

    if (token.role !== AUTH_TYPE.ADMIN) {
        return new AuthStatus(false, "Not an Admin")
    }

    return new AuthStatus(true)
}

/**
 * Handles the "Group" authorization type
 * @param token since access and refresh token must be valid (authorized) for all authorization types, this can be either one or the other.
 * @see {@link tokenAuthorized}, to have an understanding of what "valid tokens" means
 * @returns true if the token email matches in the required group 
*/
export const authorizeGroup = async (token, groupEmails) => {
    const userIsInGroup = groupEmails && groupEmails.some(memberEmail => memberEmail === token.email)

    return userIsInGroup ? new AuthStatus(true, "Authorized") : new AuthStatus(false, "You can't access this group");
}

/**
 * Handles the User authorization type
 * @param token since access and refresh token must be valid (authorized) for all authorization types, this can be either one or the other.
 * @see {@link tokenAuthorized}, to have an understanding of what "valid tokens" means
 * @returns true if the token username matches the requested one
*/
export const authorizeUser = (token, username) => {

    const userEmailMatchesUsername = token && username && token.username === username
    if (!userEmailMatchesUsername) {
        return new AuthStatus(false, "Usernames mismatch")
    }

    return new AuthStatus(true, "Authorized")
}


/********************** JWT TOKENS VALIDATION UT2ILS ************************/
/**
 * 
 * @param  token the token to decode
 * @returns an object that represent the decodification status (token, isExpired, jwt.Error)
 */
export const decode = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_KEY)
        return { token: decoded, expired: false }
    }
    catch (err) {
        if (err.name === "TokenExpiredError") {
            return { token: jwt.decode(token), expired: true }
        }

        return { expired: false, message: err.name }
    }
}

/**
 * Checks if the user information inside the tokens are complete
 * @param decodedAccessToken a decoded access token
 * @param decodedRefreshToken a decoded refresh token
 * @returns true if the informations are complete for both tokens
 */
export const tokenMissingInformations = (decodedAccessToken, decodedRefreshToken) => {
    const invalidAccessToken = !decodedAccessToken.username || !decodedAccessToken.email || !decodedAccessToken.role
    const invalidRefreshToken = !decodedRefreshToken.username || !decodedRefreshToken.email || !decodedRefreshToken.role

    return invalidRefreshToken || invalidAccessToken
}

/**
 * Checks if the user information inside tokens are the same
 * @param decodedAccessToken a decoded access token
 * @param decodedRefreshToken a decoded refresh token
 * @returns true if the token are consistent, false otherwise
 */
export const tokensMismatch = (decodedAccessToken, decodedRefreshToken) => {

    const usernamesMismatch = decodedAccessToken.username !== decodedRefreshToken.username
    const emailsMismatch = decodedAccessToken.email !== decodedRefreshToken.email
    const rolesMismatch = decodedAccessToken.role !== decodedRefreshToken.role

    return usernamesMismatch || emailsMismatch || rolesMismatch
}
