import { getUserByUsername, getGroupByName } from "../services/user.service.js"
import { verifyAuth, verifySharedAuth } from "./utils.js"
import { serverSideError, ok, badRequest, unauthorized } from "../services/http.service.js"
import { AUTH_TYPE } from "../services/auth.service.js";
import { handleDateFilterParams, handleAmountFilterParams } from "./utils.js";
import { validateCategoriesRequest } from "../validators/category.validator.js"
import { validateStrings } from "../validators/utils.validator.js";
import { validateTransactionRequest } from "../validators/transactions.validator.js";

import * as CategoryService from "../services/category.service.js";
import * as TransactionService from "../services/transactions.service.js";


/**
- Request Parameters: None
- Request Body Content: An object having attributes `type` and `color`
  - Example: `{type: "food", color: "red"}`
- Response `data` Content: An object having attributes `type` and `color`
  - Example: `res.status(200).json({data: {type: "food", color: "red"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the type of category passed in the request body represents an already existing category in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const createCategory = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
        if (!authorized) return unauthorized(res, cause)

        const { type, color } = req.body;
        const { valid: valid, cause: invalidCause } = await validateCategoriesRequest(req.body, type)
        if (!valid) {
            return badRequest(res, invalidCause)
        }

        const category = await CategoryService.createCategory(type, color)

        return ok(res, category)

    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
- Request Parameters: A string equal to the `type` of the category that must be edited
  - Example: `api/categories/food`
- Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Example: `{type: "Food", color: "yellow"}`
- Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Example: `res.status(200).json({data: {message: "Category edited successfully", count: 2}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- In case any of the following errors apply then the category is not updated, and transactions are not changed
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the type of category passed as a route parameter does not represent a category in the database
- Returns a 400 error if the type of category passed in the request body as the new type represents an already existing category in the database and that category is not the same as the requested one
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
*/
export const updateCategory = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
        if (!authorized) return unauthorized(res, cause)

        const currentType = req.params.type
        const { valid, cause: invalidCause } = await validateCategoriesRequest(req.body, currentType)
        if (!valid) {
            return badRequest(res, invalidCause)
        }

        const { type: newType, color: newColor } = req.body

        const updatedCategory = await CategoryService.updateCategoryByType(currentType, { type: newType, color: newColor })

        if (!updatedCategory) {
            return badRequest(res, "Category not found")
        }

        let count = 0
        if (currentType !== newType) {
            const { modifiedCount } = await TransactionService.updateByType(currentType, { type: newType })
            count = modifiedCount
        }

        return ok(res, { message: "Successfully Updated", count: count })

    } catch (error) {
        return serverSideError(res, error)
    }
}


/**
- Request Parameters: None
- Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Example: `types: ["health"]`
- Response `data` Content: 
    - An object with an attribute `message` that confirms successful deletion 
    - An attribute `count` that specifies the number of transactions that have had their category type changed
  - Example: `res.status(200).json({data: {message: "Categories deleted", count: 1}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Given N = categories in the database and T = categories to delete:
  - If N > T then all transactions with a category to delete must have their category set to the oldest category that is not in T
  - If N = T then the oldest created category cannot be deleted and all transactions must have their category set to that category
- In case any of the following errors apply then no category is deleted
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if called when there is only one category in the database
- Returns a 400 error if at least one of the types in the array is an empty string
- Returns a 400 error if at least one of the types in the array does not represent a category in the database
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const deleteCategory = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
        if (!authorized) return unauthorized(res, cause)

        let types = req.body && req.body.types
        const valid = validateStrings(types);
        if (!valid) {
            return badRequest(res, "Missing informations")
        }

        const { matchingCount, totalCount } = await CategoryService.getTotalAndMatchingCategoriesCounts(types)

        if (matchingCount < types.length) {
            return badRequest(res, "Some types doesn't exists")
        }

        const deletingAll = matchingCount === totalCount
        const oldestCategoryType = await CategoryService.getOldestCategoryType(types, deletingAll);

        if (deletingAll) {
            types = types.filter(t => t !== oldestCategoryType)
        }

        const { deletedCount } = await CategoryService.removeCategoriesByType(types)

        const { modifiedCount } = await TransactionService.updateAllByType(types, { type: oldestCategoryType })

        return ok(res, { message: deletedCount + " successfully Deleted", count: modifiedCount })

    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Example: `res.status(200).json({data: [{type: "food", color: "red"}, {type: "health", color: "green"}], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by a user who is not authenticated (authType = Simple)
 */

export const getCategories = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.SIMPLE })
        if (!authorized) return unauthorized(res, cause)

        let cat = await CategoryService.getAllCategories()

        let data = cat.map(dbc => Object.assign({}, { type: dbc.type, color: dbc.color }))

        return ok(res, data)
    } catch (error) {
        return serverSideError(res, error)
    }

}


/* -------------------------------- TRANSACTIONS FUNCTIONS ------------------------------------- */
/** 

- Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario/transactions`
- Request Body Content: An object having attributes `username`, `type` and `amount`
  - Example: `{username: "Mario", amount: 100, type: "food"}`
- Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Example: `res.status(200).json({data: {username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the type of category passed in the request body does not represent a category in the database
- Returns a 400 error if the username passed in the request body is not equal to the one passed as a route parameter
- Returns a 400 error if the category passed in the request body does not represent a category in the database
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 400 error if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route parameter (authType = User)
 */
export const createTransaction = async (req, res) => {
    try {
        const pathUser = req.params.username
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.USER, username: pathUser })
        if (!authorized) {
            return unauthorized(res, cause)
        }

        const { valid: valid, cause: invalidCause } = await validateTransactionRequest(req.body, pathUser)
        if (!valid) {
            return badRequest(res, invalidCause)
        }

        const { username: username, amount: amount, type: type } = req.body
        const parsedAmount = parseFloat(amount)

        const data = await TransactionService.createTransaction(username, parsedAmount, type)

        return ok(res, data)
    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"}, {username: "Luigi", amount: 20, type: "food", date: "2023-05-19T10:00:00", color: "red"} ], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const getAllTransactions = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
        if (!authorized) return unauthorized(res, cause)

        const transactions = await TransactionService.getTransactions()

        return ok(res, transactions)
    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
- Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario/transactions` (user route)
  - Example: `/api/transactions/users/Mario` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`
- Can be filtered by date and amount if the necessary query parameters are present and if the route is `/api/users/:username/transactions`
 */
export const getTransactionsByUser = async (req, res) => {
    try {
        const username = req.params.username
        const { authorized, cause, role } = verifySharedAuth(req, res, {
            authType: AUTH_TYPE.USER,
            username: username
        })
        if (!authorized) return unauthorized(res, cause)

        const callingUser = await getUserByUsername(username)
        // check user exists
        if (!callingUser) return badRequest(res, "user does not exist")

        let match = { username: username }
        if (role === AUTH_TYPE.USER) {
            match = {
                ...match,
                ...handleDateFilterParams(req.query),
                ...handleAmountFilterParams(req.query)
            }
        }

        const userTransactions = await TransactionService.getTransactions(match)

        return ok(res, userTransactions);
    } catch (error) {
        return serverSideError(res, error);
    }
}

/**
- The behavior defined below applies only for the specified route
- Request Parameters: A string equal to the `username` of the involved user, a string equal to the requested `category`
  - Example: `/api/users/Mario/transactions/category/food` (user route)
  - Example: `/api/transactions/users/Mario/category/food` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 400 error if the category passed as a route parameter does not represent a category in the database
- Returns a 401 error if call...
 */
export const getTransactionsByUserByCategory = async (req, res) => {
    try {
        const username = req.params.username
        const { authorized, cause } = verifySharedAuth(req, res, { authType: AUTH_TYPE.USER, username: username })
        if (!authorized) return unauthorized(res, cause)

        // check user exists
        const retrievedUser = await getUserByUsername(username)
        if (!retrievedUser) return badRequest(res, "user does not exist")

        const type = req.params.category

        // check category exists
        const category = await CategoryService.getCategoryByType(type)
        if (!category) return badRequest(res, "category does not exist")

        const userCategoryTransactions = await TransactionService.getTransactions({
            username: username,
            type: type
        })

        return ok(res, userCategoryTransactions)
    } catch (error) {
        return serverSideError(res, error)
    }

}

/**
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
    try {
        const group = await getGroupByName(req.params.name)
        if (!group) return badRequest(res, "Group not found")

        const retrievedMembers = group.members.map(m => m.email)
        const { authorized, cause } = verifySharedAuth(req, res, {
            authType: AUTH_TYPE.GROUP,
            emails: retrievedMembers
        })
        if (!authorized) return unauthorized(res, cause)

        // get members' usernames from that group
        const memberUsernames = group.members.map(m => m.username)

        const groupTransactions = await TransactionService.getTransactions({ username: { $in: memberUsernames } })

        return ok(res, groupTransactions)
    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 401 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
    try {
        const group = await getGroupByName(req.params.name)
        if (!group) return badRequest(res, "Group not found")

        const retrievedMembers = group.members.map(m => m.email)
        const { authorized, cause } = verifySharedAuth(req, res, {
            authType: AUTH_TYPE.GROUP,
            emails: retrievedMembers
        })
        if (!authorized) return unauthorized(res, cause)

        const type = req.params.category

        // get members' usernames from that group        
        const memberUsernames = group.members.map(m => m.username)

        const groupCategoryTransactions = await TransactionService.getTransactions({
            username: { $in: memberUsernames },
            type: type
        })

        return ok(res, groupCategoryTransactions)
    } catch (error) {
        return serverSideError(res, error)
    }

}

/** 
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
    - error 400 is returned if the user or the transaction does not exist 
 */
export const deleteTransaction = async (req, res) => {
    try {
        const uname = req.params.username
        const { authorized, cause } = verifySharedAuth(req, res, {
            authType: AUTH_TYPE.USER,
            username: uname
        })
        if (!authorized) return unauthorized(res, cause)

        const id = req.body && req.body._id

        if (!validateStrings([id])) {
            return badRequest(res, "Invalid informations")
        }

        // check user exists
        const user = await getUserByUsername(uname)
        if (!user) return badRequest(res, "user does not exist")

        const { deletedCount } = await TransactionService.removeById(id)

        if (deletedCount === 0) return badRequest(res, "Transaction does not exist")

        return ok(res, "Successful deletion")
    } catch (error) {
        return serverSideError(res, error)
    }

}

/** 
 * Delete multiple transactions identified by their ids
  - Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 401 is returned if at least one of the `_ids` does not have a corresponding transaction. Transactions that have an id are not deleted in this case 
 */
export const deleteTransactions = async (req, res) => {
    try {
        const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
        if (!authorized) return unauthorized(res, cause)

        const ids = req.body && req.body._ids
        if (!validateStrings(ids)) {
            return badRequest(res, "Invalid informations")
        }

        // check every id
        for (let i in ids) {
            const transaction = await TransactionService.getTransactionById(ids[i])

            if (!transaction) {
                return badRequest(res, "id not found")
            }

            await TransactionService.removeById(ids[i])
        }

        return ok(res, "Successful deletion")
    } catch (error) {
        return serverSideError(res, error)
    }
}
