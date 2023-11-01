import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import * as utils from "../controllers/utils.js"
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Group, User } from '../models/User';
import * as transactionsValidators from '../validators/transactions.validator.js';
import * as TransactionService from '../services/transactions.service.js';
import { validateStrings } from '../validators/utils.validator';

dotenv.config();

beforeAll(async () => {
    const dbName = "testingDatabaseController";
    const url = `${process.env.MONGO_URI}/${dbName}`;

    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
});

const adminAccessToken = jwt.sign({
    email: "admin@email.com",
    username: "admin",
    role: "Admin"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const userAccessToken = jwt.sign({
    email: "mario@email.com",
    username: "Mario",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

/******* CATEGORIES ********/

describe("createCategory", () => {
    test('Dummy test, change it', () => {
        expect(true).toBe(true);
    });
})

describe("updateCategory", () => {
    test('Dummy test, change it', () => {
        expect(true).toBe(true);
    });
})

describe("deleteCategory", () => {
    test('Dummy test, change it', () => {
        expect(true).toBe(true);
    });
})

describe("getCategories", () => {
    test('Dummy test, change it', () => {
        expect(true).toBe(true);
    });
})

/******* TRANSACTIONS ********/

describe("createTransaction", () => {
    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})

        await User.create({
            username: "Mario",
            email: "mario@email.com",
            password: "password",
            refreshToken: userAccessToken,
            role: "Regular"
        })

        await categories.create({
            type: "Food",
            color: "green"
        })
    })

    // unauthorized
    test("should return unauthorized because the user is not logged in", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: false } })

        const response = await request(app)
            .post("/api/users/Mario/transactions")
            .send({ username: "Mario", type: "Food", amount: 100 })

        expect(response.status).toBe(401)
        expect(response.body.error).toEqual("Unauthorized")

    })

    // invalid
    test("should return invalid because body not valid", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return { valid: false, cause: "Invalid informations" } })

        const response = await request(app)
            .post("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request
        //.send({username : "", type : "Food" })

        expect(response.status).toBe(400)
        expect(response.body.error).toEqual("Invalid informations")

    })

    // successful creation
    test("should create the transaction and display it to the user", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return { valid: true } })
        const createSpy = jest.spyOn(TransactionService, "createTransaction").mockImplementation(() => { return { type: "Food", username: "Mario", amount: 100 } })

        const response = await request(app)
            .post("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request
            .send({ username: "Mario", type: "Food", amount: 100 })

        expect(response.status).toBe(200)
        expect(response.body.data.username).toEqual("Mario")
        expect(response.body.data.type).toEqual("Food")
        expect(response.body.data.amount).toEqual(100)

    })

    // server error 
    test("should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return { valid: true } })
        const createSpy = jest.spyOn(TransactionService, "createTransaction").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .post("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) // Setting cookies in the request
            .send({ username: "Mario", type: "Food", amount: 100 })


        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("getAllTransactions", () => {
    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Luigi",
                email: "luigi@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })
    })

    // empty list
    test("Admin: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })

        const response = await request(app)
            .get("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // list all transactions
    test("Admin: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
            },
            {
                username: "Mario",
                type: "House",
                amount: 400
            },
            {
                username: "Luigi",
                type: "House",
                amount: 1000
            }
        ])
        const response = await request(app)
            .get("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) // Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(3)
    })

    // server error
    test("Admin: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .get("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("getTransactionsByUser", () => {
    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })
    })

    // Regular User: empty list
    test("Regular User: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Regular User: full list
    test("Regular User: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100,
            },
            {
                username: "Mario",
                type: "House",
                amount: "400"
            }]
        }
        )


        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
            },
            {
                username: "Mario",
                type: "House",
                amount: "400"
            }])
        const response = await request(app)
            .get("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
    })

    // Admin: empty list
    test("Admin: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Admin" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Admin: full list
    test("Admin: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Admin" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100,
            },
            {
                username: "Mario",
                type: "House",
                amount: "400"
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
            },
            {
                username: "Mario",
                type: "House",
                amount: "400"
            }])
        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
    })

    // Regular User: error 500
    test("Regular User: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .get("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("getTransactionsByUserByCategory", () => {

    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })
    })

    // Regular User: empty list
    test("Regular User: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/users/Mario/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Regular User: full list
    test("Regular User: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100,
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
            }])
        const response = await request(app)
            .get("/api/users/Mario/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
    })

    // Admin: empty list
    test("Admin: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Admin" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/transactions/users/Mario/category/Food")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Admin: full list
    test("Admin: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Admin" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100,
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
            }])
        const response = await request(app)
            .get("/api/transactions/users/Mario/category/Food")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
    })

    // server error 500
    test("Regular User: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true, role: "Regular" } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .get("/api/users/Mario/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("getTransactionsByGroup", () => {
    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})
        await Group.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })

        await Group.create({
            name: "Group1",
            members: {
                email: "mario@email.com"
            }
        })


    })

    // Regular User: empty list
    test("Regular User: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/groups/Group1/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Regular User: full list ERROR
    test("Regular User: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100
            },
            {
                type: "House",
                username: "Mario",
                amount: 500
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100
            },
            {
                type: "House",
                username: "Mario",
                amount: 500
            }
        ])
        const response = await request(app)
            .get("/api/groups/Group1/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
    })


    // Admin: empty list
    test("Admin: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/transactions/groups/Group1")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Admin: full list ERROR
    test("Admin: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100
            },
            {
                type: "House",
                username: "Mario",
                amount: 500
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100
            },
            {
                type: "House",
                username: "Mario",
                amount: 500
            }])
        const response = await request(app)
            .get("/api/transactions/groups/Group1")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
    })

    // server error 500
    test("Regular User: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .get("/api/groups/Group1/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("getTransactionsByGroupByCategory", () => {
    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})
        await Group.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })

        await Group.create({
            name: "Group1",
            members: {
                email: "mario@email.com"
            }
        })


    })

    // Regular User: empty list
    test("Regular User: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/groups/Group1/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Regular User: full list ERROR
    test("Regular User: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100
            }
        ])
        const response = await request(app)
            .get("/api/groups/Group1/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
    })


    // Admin: empty list
    test("Admin: should return empty list if there are no transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { return [] })

        const response = await request(app)
            .get("/api/transactions/groups/Group1/category/Food")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)

    })

    // Admin: full list 
    test("Admin: should retrieve list of all transactions", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => {
            return [{
                type: "Food",
                username: "Mario",
                amount: 100
            }]
        }
        )

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100
            }])
        const response = await request(app)
            .get("/api/transactions/groups/Group1/category/Food")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
    })

    // server error 500
    test("Regular User: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })
        const getSpy = jest.spyOn(TransactionService, "getTransactions").mockImplementation(() => { throw new Error("Something went wrong...") })

        const response = await request(app)
            .get("/api/groups/Group1/transactions/category/Food")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")

    })
})

describe("deleteTransaction", () => {

    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})
        await Group.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
                _id: "646ca0947b8e5443f350e21d"
            }
        ])
    })

    // invalid 
    test("Regular User: should return invalid informations", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return { valid: false, cause: "Invalid informations" } })

        const response = await request(app)
            .delete("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request

        expect(response.status).toBe(400)
        expect(response.body.error).toBe("Invalid informations")
    })

    // successful deletion
    test("Regular User: should delete the transaction", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() => { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return { valid: true } })
        const deleteSpy = jest.spyOn(TransactionService, "removeById").mockImplementation(() => { return 1 })

        const response = await request(app)
            .delete("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request
            .send({ _id: "646ca0947b8e5443f350e21d" })

        expect(response.status).toBe(200)
        expect(response.body.data).toBe("Successful deletion")
    })

    // server error 500
    test("Regular User: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifySharedAuth").mockImplementation(() =>  { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() =>  { return { valid: true } })
        const deleteSpy = jest.spyOn(TransactionService, "removeById").mockImplementation(() =>  {throw new Error("Something went wrong...") })

        const response = await request(app)
            .delete("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${userAccessToken}; refreshToken=${userAccessToken}`) //Setting cookies in the request
            .send({_id: "646ca0947b8e5443f350e21d"})
    
        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")
    })


})

describe("deleteTransactions", () => {

    beforeEach(async () => {
        await transactions.deleteMany({})
        await User.deleteMany({})
        await categories.deleteMany({})

        await User.create([
            {
                username: "Mario",
                email: "mario@email.com",
                password: "password",
                refreshToken: userAccessToken,
                role: "Regular"
            },
            {
                username: "Admin",
                email: "admin@email.com",
                password: "password",
                refreshToken: adminAccessToken,
                role: "Admin"
            }
        ])

        await categories.create({
            type: "Food",
            color: "green"
        },
            {
                type: "House",
                color: "red"
            })

        await transactions.create([
            {
                type: "Food",
                username: "Mario",
                amount: 100,
                _id: "646ca0947b8e5443f350e21d"
            },
            {
                type: "House",
                username: "Luigi",
                amount: 1000,
                _id: "647e367591e1d39f7df35c0e"
            }
        ])
    })

    // invalid
    test("Admin: should return error because invalid body", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() =>  { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return {valid: false}})
        
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request
            .send({_ids: ["", ""] })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe("Invalid informations")
    })

    // id not found
    test("Admin: should return error because there's no transaction with the id specified ", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() =>  { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return {valid: true}})
        const getSpy = jest.spyOn(TransactionService, "getTransactionById").mockImplementation(() =>  {return false })
        
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request
            .send({_ids: ["646ca0947b8e5443f350e21d", "647e367591e1d39f7df35c0e"] })

        expect(response.status).toBe(400)
        expect(response.body.error).toBe("id not found")
    })

    // successful deletion
    test("Admin: should delete all transactions", async () => {

        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() =>  { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return {valid: true}})
        const getSpy = jest.spyOn(TransactionService, "getTransactionById").mockImplementation(() =>  {return true })
        const deleteSpy = jest.spyOn(TransactionService, "removeById").mockImplementation(() =>  {return true })

        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request
            .send({ _ids: ["646ca0947b8e5443f350e21d", "647e367591e1d39f7df35c0e"] })

        expect(response.status).toBe(200)
        expect(response.body.data).toBe("Successful deletion")
    })

    // server error 500
    test("Admin: should return error 500", async () => {
        const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() =>  { return { authorized: true } })
        const validateSpy = jest.spyOn(transactionsValidators, "validateTransactionRequest").mockImplementation(() => { return {valid: true}})
        const getSpy = jest.spyOn(TransactionService, "getTransactionById").mockImplementation(() =>  {return true })
        const deleteSpy = jest.spyOn(TransactionService, "removeById").mockImplementation(() =>  {throw new Error("Something went wrong...")} ) 

        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`) //Setting cookies in the request
            .send({_ids: ["646ca0947b8e5443f350e21d", "647e367591e1d39f7df35c0e"] })

        expect(response.status).toBe(500)
        expect(response.body.error).toBe("Error: Something went wrong...")
    })
})

