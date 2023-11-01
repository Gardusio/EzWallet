import { categories, transactions } from '../models/model.js';
import * as utils from "../controllers/utils.js"
import * as controller from "../controllers/controller.js";

import * as CategoryService from "../services/category.service.js"
import * as UserService from "../services/user.service.js"
import * as TransactionService from "../services/transactions.service.js"

import * as UtilsValidator from "../validators/utils.validator.js"
import * as CategoryValidator from "../validators/category.validator.js"
import * as TransactionValidator from "../validators/transactions.validator.js"

let res = {}
beforeEach(() => {
    jest.restoreAllMocks()
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            refreshedTokenMessage: ""
        }
    }
})

/***************************** CATEGORIES ************************************ */
describe("createCategory", () => {

    // 1) se non admin  => res.status === 401 && res.json === { error: "Unauthorized" }
    it('Should set 401 with message if the user calling is not Authorized', async () => {

        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: "Unauthorized" })

        await controller.createCategory({ body: { type: "type" } }, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    });

    // 2) se i parametri in body non sono validi => res.status === 400 && res.json === {...}
    it('Should set 400 with message if the req.body is not valid', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: false, cause: "Validation error" })


        await controller.createCategory({ body: { type: "type" } }, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: "Validation error" })
    });

    // 3) se i parametri sono validi e autorizzato => res.status === 200 e res.json(categoria)
    it('Should set 200 and persist a new category if req.body is valid', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })

        const toBeCreated = {
            type: "newType",
            color: "aColor"
        }

        const req = {
            body: {
                type: "newType",
                color: "aColor"
            }
        }

        const saveSpy = jest.spyOn(categories.prototype, "save").mockImplementation(() => toBeCreated)
        await controller.createCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(saveSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: toBeCreated, refreshedTokenMessage: "" })
    });

    // 4) se i parametri sono validi e autorizzato, ma categoria non salvata => res.status === 500 e res.json === error:...
    it('Should return 500 if something went wrong saving the category', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })

        const req = {
            body: {
                type: "newType",
                color: "aColor"
            }
        }

        const saveSpy = jest
            .spyOn(categories.prototype, "save")
            .mockImplementation(() => { throw new Error("Something went wrong") })

        await controller.createCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(saveSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" })
    })
})

describe("updateCategory", () => {


    // 1) se non admin  => res.status === 401 && res.json === { error: "Unauthorized" }
    it('Should set 401 with message if the user calling is not Authorized', async () => {

        const verifySpy = jest
            .spyOn(utils, "verifyAuth")
            .mockReturnValue({ authorized: false, cause: "Unauthorized" })

        await controller.updateCategory({}, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    });

    // 2) se i parametri in body non sono validi => res.status === 400 && res.json === {...}
    it('Should set 400 with message if the req.body is not valid', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: false, cause: "Validation error" })

        await controller.updateCategory({ params: { type: "tye" }, body: { type: "type" } }, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: "Validation error" })
    });

    it('Should set 400 it the category to be updated is not found', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })
        const categorySpy = jest.spyOn(categories, "findOneAndUpdate").mockReturnValue(null)

        const req = {
            params: {
                type: "currentType"
            },
            body: {
                type: "newType",
                color: "newColor"
            }
        }

        await controller.updateCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Category not found" })
    });

    it('Should set 200 with message if the update is successfull', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })

        const updated = {
            type: "newType",
            color: "newColor"
        }
        const categorySpy = jest.spyOn(categories, "findOneAndUpdate").mockReturnValue(updated)

        const req = {
            params: {
                type: "currentType"
            },
            body: {
                type: "newType",
                color: "newColor"
            }
        }

        const transactionSpy = jest.spyOn(TransactionService, "updateByType").mockImplementation(() => ({ modifiedCount: 0 }))

        await controller.updateCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(transactionSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: "Successfully Updated", count: 0 }, refreshedTokenMessage: "" })
    });


    it('Should set 200 with message and correct count', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })

        const req = {
            params: {
                type: "currentType"
            },
            body: {
                type: "newType",
                color: "newColor"
            }
        }

        const updatedCategory = {
            type: "newType",
            color: "newColor",
        }
        const categorySpy = jest.spyOn(categories, "findOneAndUpdate").mockReturnValue(updatedCategory)
        const transactionSpy = jest.spyOn(TransactionService, "updateByType").mockImplementation(() => ({ modifiedCount: 1 }))

        await controller.updateCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(transactionSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: "Successfully Updated", count: 1 }, refreshedTokenMessage: "" })
    });


    it('Should return 500 if something went wrong updating the category', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(CategoryValidator, "validateCategoriesRequest").mockReturnValue({ valid: true })

        const req = {
            params: {
                type: "currentType"
            },
            body: {
                type: "newType",
                color: "newColor"
            }
        }

        const categorySpy = jest.spyOn(categories, "findOneAndUpdate")
            .mockImplementation(() => { throw new Error("Something went wrong") })

        await controller.updateCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
    })

})

describe("deleteCategory", () => {


    const req = {
        body: { types: ["pippo", "franco"] }
    }

    // 1) se non admin  => res.status === 401 && res.json === { error: "Unauthorized" }
    it('Should set 401 with message if the user calling is not Authorized', async () => {

        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: "Unauthorized" })

        await controller.deleteCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    })

    // 2) se i parametri in body non sono validi => res.status === 400 && res.json === {...}
    it('Should set 400 with message if the req.body is not valid', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(false)

        await controller.deleteCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: "Missing informations" })
    });

    it('Should set 400 if some types to delete are not present', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)
        //const aggregate = jest.spyOn(categories)
        const countSpy = jest.spyOn(CategoryService, "getTotalAndMatchingCategoriesCounts")
            .mockImplementation(() => ({ matchingCount: 1, totalCount: 10 }))

        await controller.deleteCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalledWith(req.body.types)
        expect(countSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: "Some types doesn't exists" })


    });

    // check deletedCount to be less than totalCount if oldest is in types
    // TODO: test getOldestCategoryType
    it('Should set 200 but not delete the oldest category if type contains all the current categories', async () => {

        const modifiedCount = 1
        const deletedCount = 1
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)

        const countsSpy = jest.spyOn(CategoryService, "getTotalAndMatchingCategoriesCounts")
            .mockImplementation(() => ({ matchingCount: 2, totalCount: 2 }))

        const oldestSpy = jest.spyOn(CategoryService, "getOldestCategoryType").mockReturnValue("pippo")

        const removeCategoriesSpy = jest.spyOn(CategoryService, "removeCategoriesByType").mockReturnValue({ deletedCount: deletedCount })
        const aggregateSpy = jest.spyOn(TransactionService, "updateAllByType").mockReturnValue({ modifiedCount: modifiedCount })

        await controller.deleteCategory(req, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(countsSpy).toHaveBeenCalled()
        expect(oldestSpy).toHaveBeenCalled()
        expect(removeCategoriesSpy).toHaveBeenCalledWith(["franco"])
        expect(aggregateSpy).toHaveBeenCalledWith(["franco"], { type: "pippo" })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
            data: {
                message: deletedCount + " successfully Deleted",
                count: modifiedCount
            },
            refreshedTokenMessage: ""
        })
    });

    it('Should return 500 if something went wrong deleting categories', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { throw new Error("Something went wrong") })

        await controller.deleteCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" })
    }, 100000)
})

describe("getCategories", () => {


    // 1) se non autorizzato  => res.status === 401 && res.json === { error: "Unauthorized" }
    it('Should set 401 with message if the user calling is not Authorized', async () => {

        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: "Unauthorized" })

        await controller.getCategories({}, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
    });

    // 2) se sono autorizzato ma non ho categorie => res.status === 200 && res.json === {...}
    it('Should set 200 with un array vuoto se non ci sono categorie', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
        const serviceSpy = jest.spyOn(categories, "find").mockImplementation(() => [])

        await controller.getCategories({}, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(serviceSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "" })
    });

    //3) se sono autorizzato, mi mostra le categorie => res.status === 200 && res.json === {...}
    it('Should set 200 with un array con le categorie', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })

        const retrievedCategories = [
            {
                type: "type",
                color: "Color"
            }
        ]

        const serviceSpy = jest.spyOn(categories, "find").mockImplementation(() => retrievedCategories)

        await controller.getCategories({}, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(serviceSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({ data: retrievedCategories, refreshedTokenMessage: "" })
    });

    // 4) se sono autorizzato, ho delle categorie ma qualcosa va storto => res.status === 500 e res.json === error:...
    it('Should return 500 if something went wrong to show categories', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })

        const serviceSpy = jest.spyOn(categories, "find").mockImplementation(() => { throw new Error("Something went wrong") })
        await controller.getCategories({}, res)

        expect(verifySpy).toHaveBeenCalled()
        expect(serviceSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" })
    })
})


/* ------------------------------ TRANSACTIONS ------------------------------ */

describe('createTransaction', () => {

    // not authorized --> 401
    it('should return unauthorized if authentication fails', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        const req = {
            params: {
                username: ""
            }
        }

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // username is required --> 401
    it('should return error with username inserted in body', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const req = {
            params: {
                username: ""
            },
            body: {
                username: ""
            }
        }

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
    });

    // type is required --> 401
    it('should return error with category type inserted in body', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: ""
            }

        }

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
    });

    // amount is required --> 401
    it('should return error with amount inserted in body', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: "Food",
                amount: "pippo"
            }

        }

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
    });

    // user does not exist
    it('should return error because the user does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(null)

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: "Food",
                amount: 100
            }
        }
        // Call the createTransaction function
        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(userSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "User does not exist" });
    });

    // category does not exist
    it('should return error because the category does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true)
        const categorySpy = jest.spyOn(categories, "findOne").mockReturnValue(null)

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: "Food",
                amount: 100
            }
        }

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(userSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({ error: "Category does not exist" })
    });

    // transaction saved --> 200
    it('should return the transaction saved', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const validateSpy = jest.spyOn(TransactionValidator, "validateTransactionRequest").mockReturnValue({ valid: true })

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: "Food",
                amount: 100
            }
        }

        const toBeCreated = {
            username: "Mario",
            amount: 100,
            type: "Food",
        }

        const createSpy = jest.spyOn(TransactionService, "createTransaction").mockImplementation(() => toBeCreated)

        await controller.createTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: req.body, refreshedTokenMessage: "" });

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(createSpy).toHaveBeenCalled()
    });

    // error 500
    it('should return error in creating the transaction', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const validateSpy = jest.spyOn(TransactionValidator, "validateTransactionRequest").mockReturnValue({ valid: true })

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                username: "Mario",
                type: "Food",
                amount: 100
            }
        }
        const createSpy = jest.spyOn(TransactionService, "createTransaction").mockImplementation(() => { throw new Error("Something went wrong...") })

        await controller.createTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(createSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ "error": "Error: Something went wrong..." })
    });
});

describe("getAllTransactions", () => {

    const req = {
        params: {},
        body: {}
    }

    // not admin -----------------
    it('should return unauthorized', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockResolvedValue({ authorized: false, cause: 'Unauthorized' });

        const req = {
            params: {}
        }

        await controller.getAllTransactions(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // get transactions -----------------
    it('should return all the transactions stored', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const toBeReturned = [
            {
                username: "Mario",
                type: "food",
                amount: 10,
                date: undefined,
                color: "#fcbe44"
            },
            {
                username: "Luigi",
                type: "house",
                amount: 100,
                date: undefined,
                color: "#fcbe49"
            },
        ]

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions").mockResolvedValue(toBeReturned); // Mock the aggregate call inside getTransactions

        await controller.getAllTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled();
        expect(aggregateSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: toBeReturned, refreshedTokenMessage: "" });
    });

    it('should return error in getting all the transactions stored', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions")
            .mockImplementation(() => { throw new Error("Something went wrong...") }); // Mock the aggregate call inside getTransactions

        await controller.getAllTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(aggregateSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong..." });
    });
});

describe("getTransactionsByUser", () => {


    const req = {
        params: {
            username: "Mario"
        }
    }

    it('Should set 401 if authentication fails', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        await controller.getTransactionsByUser(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // user does not exist
    it('should return error because the user does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(null); // Mocking the user not found scenario

        await controller.getTransactionsByUser(req, res);

        expect(verifySpy).toHaveBeenCalled();
        expect(userSpy).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "user does not exist" });
    });

    it('should return all the transactions stored by the user', async () => {

        const transactions = [{ username: "Mario", amount: 12 }]
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const getUserByUsernameSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue({ username: "Mario" })
        const getTransactionsSpy = jest.spyOn(TransactionService, "getTransactions").mockReturnValue(transactions)

        await controller.getTransactionsByUser(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(getTransactionsSpy).toHaveBeenCalled()
        expect(getUserByUsernameSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: transactions, refreshedTokenMessage: "" });
    });

    it('should return error in getting the transactions', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { throw new Error("Something went wrong...") });

        await controller.getTransactionsByUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong..." });
    });

    // mock handleDateFilterParams to return { }
    // mock role to be USER
    // check if getTransactionsSpy.haveBeenCalledWIth(mockedMatch)
    it('Regular user: should get transactions with filters', async () => {
        const transactions = [{ username: "Mario", amount: 12 }]
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true, role: "User" });
        const getUserByUsernameSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue({ username: "Mario" })
        const getTransactionsSpy = jest.spyOn(TransactionService, "getTransactions").mockReturnValue(transactions)
        const dateFilterSpy = jest.spyOn(utils, "handleDateFilterParams").mockReturnValue({})
        const amountFilterSpy = jest.spyOn(utils, "handleAmountFilterParams").mockReturnValue({ amount: 100 })

        const mockedMatch = {
            username: "Mario",
            amount: 100
        }

        await controller.getTransactionsByUser(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(getTransactionsSpy).toHaveBeenCalledWith(mockedMatch)
        expect(getUserByUsernameSpy).toHaveBeenCalled()
        expect(dateFilterSpy).toHaveBeenCalled()
        expect(amountFilterSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: transactions, refreshedTokenMessage: "" });
    })

    // mock handleDateFilterParams to return { }
    // mock role not to be USRE
    // check if getTransactionsSpy.haveBeenCalledWIth(just the username match)
    it('Admin: should not get transactions with filters', async () => {
        const transactions = [{ username: "Mario", amount: 12 }]
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true, role: "Admin" });
        const getUserByUsernameSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue({ username: "Mario" })
        const getTransactionsSpy = jest.spyOn(TransactionService, "getTransactions").mockReturnValue(transactions)
        const dateFilterSpy = jest.spyOn(utils, "handleDateFilterParams").mockReturnValue({})
        const amountFilterSpy = jest.spyOn(utils, "handleAmountFilterParams").mockReturnValue({ amount: 100 })

        await controller.getTransactionsByUser(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(getTransactionsSpy).toHaveBeenCalledWith({ username: "Mario" })
        expect(getUserByUsernameSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: transactions, refreshedTokenMessage: "" });
    })
});

describe("getTransactionsByUserByCategory", () => {

    // not authorized
    it('should return unauthorized if authentication fails', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        const req = {
            params: {
                username: "Mario"
            }
        }


        await controller.getTransactionsByUserByCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // user does not exist
    it('should return error because the user does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(false);

        const req = {
            params: {
                username: "Mario"
            }
        }

        await controller.getTransactionsByUserByCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(userSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "user does not exist" });
    });

    // category does not exist
    it('should return error because category does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);
        const categorySpy = jest.spyOn(categories, "findOne").mockReturnValue(false);

        const req = {
            params: {
                username: "Mario",
                type: "Food"
            }
        }

        await controller.getTransactionsByUserByCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(userSpy).toHaveBeenCalled()
        expect(categorySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "category does not exist" });
    });

    // get transactions
    it('should return all the transactions stored by the user in the category specified', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);
        const categorySpy = jest.spyOn(categories, "findOne").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario",
                type: "Food"
            }
        }

        const toBeReturned = [
            {
                username: "Mario",
                type: "food",
                amount: 10,
                date: undefined,
                color: "#fcbe44"
            }
        ]

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions").mockResolvedValue(toBeReturned);

        await controller.getTransactionsByUserByCategory(req, res);


        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: toBeReturned, refreshedTokenMessage: "" });
    });

    // error in getting transactions
    it('should return error in getting the transactions ', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);
        const categorySpy = jest.spyOn(categories, "findOne").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario",
                type: "Food"
            }
        }

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        await controller.getTransactionsByUserByCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ "error": "Error: Something went wrong..." });
    });
})

describe("getTransactionsByGroup", () => {


    const groupToReturn = {
        name: 'group1',
        members: []
    }

    const req = {
        params: {
            name: "group1",
            category: "Food"
        }
    }

    // group not found
    it('should return error because group not found', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(false);
        await controller.getTransactionsByGroup(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Group not found" });
    });

    // not authorized
    it('should return unauthorized if authentication fails', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(groupToReturn);
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        await controller.getTransactionsByGroup(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // get transactions
    it('should return all the transactions ', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(groupToReturn);
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });

        const toBeReturned = [
            {
                username: "Mario",
                type: "food",
                amount: 10,
                date: undefined,
                color: "#fcbe44"
            },
            {
                username: "Luigi",
                type: "house",
                amount: 100,
                date: undefined,
                color: "#fcbe49"
            },
        ]

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions").mockReturnValue(toBeReturned); // Mock the aggregate call inside getTransactions

        await controller.getTransactionsByGroup(req, res);

        expect(groupSpy).toHaveBeenCalled()
        expect(verifySpy).toHaveBeenCalled()
        expect(aggregateSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: toBeReturned, refreshedTokenMessage: "" });
    });

    // error
    it('should return error because some error happens', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(groupToReturn);
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });

        const aggregateSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        await controller.getTransactionsByGroup(req, res);

        expect(aggregateSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong..." });

    });
})

describe("getTransactionsByGroupByCategory", () => {


    const groupToReturn = {
        name: 'group1',
        members: []
    }
    const req = {
        params: {
            name: "group1",
            category: "Food"
        }
    }

    // group not found
    it('should return error because group not found', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(false);

        await controller.getTransactionsByGroupByCategory(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Group not found" });
    });

    // not authorized
    it('should return unauthorized if authentication fails', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName").mockReturnValue(groupToReturn);
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await controller.getTransactionsByGroupByCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(groupSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // get transactions
    it('should return all the transactions ', async () => {
        const getGroupSpu = jest.spyOn(UserService, "getGroupByName").mockReturnValue(groupToReturn)
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const getTransactionsSpy = jest.spyOn(TransactionService, "getTransactions").mockReturnValue([])

        await controller.getTransactionsByGroupByCategory(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(getTransactionsSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: "" });
    });

    // error in getting transactions
    it('should set 500 with error because some error happens', async () => {
        const groupSpy = jest.spyOn(UserService, "getGroupByName")
            .mockImplementation(() => { throw new Error("Something went wrong...") })

        await controller.getTransactionsByGroupByCategory(req, res);

        expect(groupSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong..." });
    });
})

describe("deleteTransaction", () => {


    // not authorized ---------------
    it('should return unauthorized if authentication fails', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        const req = {
            params: {
                username: "Mario"
            }
        }

        await controller.deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // body params not valid ---------------
    it('should return error because body params not valid', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(false)
        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _id: ""
            }
        }

        await controller.deleteTransaction(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalledWith([""])
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
    });

    // user does not exist ---------------
    it('should return error because user does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(false);
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _id: "328hedh1379r184"
            }
        }

        await controller.deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "user does not exist" });
    });

    // delete transaction ---------------
    it('should return the successful deletion', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _id: "328hedh1379r184"
            }
        }

        const deleteSpy = jest.spyOn(transactions, "deleteOne").mockReturnValue({ acknowledged: true, deletedCount: 1 })

        await controller.deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: "Successful deletion", refreshedTokenMessage: "" });
    });

    // error transaction does not exist ---------------
    it('should return error because transaction does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _id: "328hedh1379r184"
            }
        }

        const deleteSpy = jest.spyOn(transactions, "deleteOne").mockReturnValue({ acknowledged: true, deletedCount: 0 })

        await controller.deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Transaction does not exist" });
    });

    // error in deletion ---------------
    it('should return error because some error happens', async () => {
        const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
        const userSpy = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _id: "328hedh1379r184"
            }
        }

        const deleteSpy = jest.spyOn(transactions, "deleteOne").mockImplementation(() => { throw new Error("Something went wrong...") });

        await controller.deleteTransaction(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ "error": "Error: Something went wrong..." });
    });
})

describe("deleteTransactions", () => {
    // not authorized ---------------
    it('should return unauthorized if authentication fails', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false, cause: 'Unauthorized' });

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _ids: []
            }
        }

        await controller.deleteTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    // ids not inserted
    it('should return invalid informations if ids not inserted', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _ids: [""]
            }
        }

        await controller.deleteTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
    });

    // id does not exist ---------------
    it('should return error because one of the ids does not exist', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const transactionSpy = jest.spyOn(transactions, "findOne").mockReturnValue(false);

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _ids: ["dd3edfc43hwuhfq", "32819rdw1"]
            }
        }

        await controller.deleteTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(transactionSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "id not found" });
    });

    // delete transaction ---------------
    it('should return the successful deletion', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const transactionSpy = jest.spyOn(transactions, "findOne").mockReturnValue(true);

        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _ids: ["3847204317491431djeqi", "enjqofh831i3e1321nd2w435"]
            }
        }

        const deleteSpy = jest.spyOn(transactions, "deleteOne").mockReturnValue({})

        await controller.deleteTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(transactionSpy).toHaveBeenCalled()
        expect(deleteSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: "Successful deletion", refreshedTokenMessage: "" });
    });

    // error in deletion ---------------
    it('should return error because some error happens', async () => {
        const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
        const validateSpy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)
        const transactionSpy = jest.spyOn(TransactionService, "getTransactionById").mockImplementation(() => { throw new Error("Something went wrong...") });
        const req = {
            params: {
                username: "Mario"
            },
            body: {
                _ids: ["pippo"]
            }
        }

        await controller.deleteTransactions(req, res);

        expect(verifySpy).toHaveBeenCalled()
        expect(validateSpy).toHaveBeenCalled()
        expect(transactionSpy).toHaveBeenCalled()
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ "error": "Error: Something went wrong..." });
    });
});
