import { transactions } from "../models/model.js";

export const getTransactionById = async (id) => {
    return await transactions.findOne({ _id: id })
}

export const getTransactions = async (match) => {
    const matching = match || {};
    const pipeline = [
        {
            $match: matching
        },
        {
            $lookup: {
                from: "categories",
                localField: "type",
                foreignField: "type",
                as: "categories_info"
            }
        },
        { $unwind: "$categories_info" }
    ];

    const retrievedTransactions = await transactions.aggregate(pipeline);
    const data = retrievedTransactions.map(v => ({
        username: v.username,
        type: v.type,
        amount: v.amount,
        date: v.date,
        color: v.categories_info.color,
    }))

    return data;
}

export const createTransaction = async (username, amount, type) => {
    const newTransaction = await new transactions({ username, amount, type }).save()
    return {
        username: newTransaction.username,
        amount: newTransaction.amount,
        type: newTransaction.type,
        date: newTransaction.date
    }
}

export const removeById = async (id) => {
    return await transactions.deleteOne({ _id: id })
}

export const removeAllByUsername = async (username) => {
    return await transactions.deleteMany({ username: username })
}

export const updateAllByType = async (types, updates) => {
    return await transactions.updateMany(
        { type: { $in: types } },
        updates
    )
}

export const updateByType = async (type, updates) => {
    return await transactions.updateOne(
        { type: type },
        updates
    )
}