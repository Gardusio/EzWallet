import { categories } from "../models/model.js";

export const createCategory = async (type, color) => {
    const category = new categories({ type, color });
    return await category.save()
}

export const getCategoryByType = async (type) => await categories.findOne({ type: type })

// TO TEST
export const getOldestCategoryType = async (types, deletingAll) => {
    const sortPipeline = [
        { $sort: { createdAt: 1 } },
        { $limit: 1 }
    ];

    const oldestCategory = deletingAll ?
        await categories.aggregate(sortPipeline) :
        await categories.aggregate([
            { $match: { type: { $nin: types } } },
            ...sortPipeline
        ])

    return oldestCategory[0].type;
}

//TO TEST
export const getTotalAndMatchingCategoriesCounts = async (types) => {
    // Retrieves the total count of categories and the count of the "types" categories
    const totalAndMatchingCounts = await categories.aggregate([
        {
            $facet: {
                totalCount: [{ $count: "count" }],
                matchingCount: [
                    { $match: { type: { $in: types } } },
                    { $count: "count" }
                ]
            }
        },
        {
            $project: {
                totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
                matchingCount: { $arrayElemAt: ["$matchingCount.count", 0] }
            }
        }
    ])

    const { matchingCount, totalCount } = totalAndMatchingCounts[0]
    return { matchingCount, totalCount }
}

export const removeCategoriesByType = async (types) => {
    return await categories.deleteMany({ type: { $in: types } })
}

export const getAllCategories = async () => {
    return await categories.find({})
}

export const updateCategoryByType = async (type, updates) => {
    return await categories.findOneAndUpdate(
        { type: type },
        updates,
        { new: true }
    )
}