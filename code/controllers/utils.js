import { AUTH_TYPE } from '../services/auth.service.js'

/*
    Since we are forced to maintain this repo structure, 
    in order to be able to mock dependencies inside our test, this import is needed
    
    Have a look at : https://github.com/jestjs/jest/issues/936#issuecomment-659597840
    To reproduce, have a look at the "sameModuleJest" branch
*/
import * as utils from "../controllers/utils.js"
import { authorize } from '../services/auth.service.js'



/********************** AUTHORIZATION *************************/
/**
 * Authorization entry point for shared routes. If a route can be called by more than one role, it should check auth with this.
 * If the user is authorized, caller can go on. No response header is set here.
 * @param req the HTTP request object
 * @param res the HTTP response object
 * @param type the required authorization type on the route
 * @returns an object { authorized, cause } 
 */
export const verifySharedAuth = (req, res, info) => {

    const typeAuthorizationStatus = utils.verifyAuth(req, res, info)
    if (typeAuthorizationStatus.authorized) {
        return { authorized: true, cause: "Authorized", role: info.authType }
    }

    const adminAuthorizationStatus = utils.verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
    if (adminAuthorizationStatus.authorized) {
        return { authorized: true, cause: "Authorized", role: AUTH_TYPE.ADMIN }
    }

    return { authorized: false, cause: typeAuthorizationStatus.cause || adminAuthorizationStatus.cause }
}

/**
 * Authorization entry point. If the user is authorized, caller can go on. No response header is set here.
 * @param req the HTTP request object
 * @param res the HTTP response object
 * @param type the required authorization type on the route
 * @returns an object { authorized, cause } 
 */
export const verifyAuth = (req, res, info) => {

    const authStatus = authorize(req, res, info)

    if (!authStatus.success) {
        return { authorized: false, cause: authStatus.message || "Unauthorized" }
    }

    return { authorized: true }
}


/********************** HANDLE FILTERING ************************/

class BadFilteringError extends Error {
    constructor(message) {
        super(message)
        this.name = 'BadFilteringError'
    }
}

// TO TEST
/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (query) => {
    let match = {}

    if (!query) {
        return match
    }
    const { from: from, upTo: upTo, date: date } = query

    if (date && (from || upTo)) throw new BadFilteringError("Cannot use 'date' with 'from' or 'upTo'.")

    if (date) {
        const day = new Date(date)
        const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
        match.date = { $gte: day, $lte: endOfDay }
    }

    if (from) {
        match.date = { $gte: new Date(from) }
    }

    if (upTo) {
        match.date = { ...match.date, $lte: new Date(upTo) }
    }

    return match
}

/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 */
export const handleAmountFilterParams = (query) => {
    let match = {}

    if (!query) {
        return match
    }

    const { min: min, max: max } = query

    if (min) {
        match.amount = { $gte: parseFloat(min) }
    }
    if (max) {
        match.amount = { ...match.amount, $lte: parseFloat(max) }
    }

    return match
}
