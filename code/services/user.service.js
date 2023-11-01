import { User, Group } from "../models/User.js"

/****************************** USER SERVICES ********************************************/

export const removeUserByEmail = async (email) => {
    await User.deleteOne({ email: email })
}

export const createUser = async (username, email, pwd) => {
    return await User.create({
        username,
        email,
        password: hashedPassword,
    })
}
export const getUserByToken = async (token) => {
    return await User.findOne({ refreshToken: token })
}

export const getAllUsersByEmails = async (emails) => {
    const users = await Promise.all(emails.map(getUserByEmail))
    return users
}
export const getUserByEmail = async (email) => await User.findOne({ email: email })

export const getAllUsers = async () => {
    const users = await User.find()

    // array of objs: username, email, role
    return users.map(u => ({
        username: u.username,
        email: u.email,
        role: u.role
    }))
}

export const mapToGroupResponse = (groupModel) => {
    return {
        name: groupModel.name,
        members: groupModel.members.map(m => ({ email: m.email }))
    }
}

export const getAllGroups = async () => {
    const groups = await Group.find({})
    return groups.map(mapToGroupResponse)
}

export const getUserByUsername = async (uname) => await User.findOne({ username: uname })


// group services
export const getGroupByName = async (name) => await Group.findOne({ name: name })

export const isAlreadyInGroup = async (email) => await Group.countDocuments({ "members.email": email }) > 0

/**
 * Return a subset of given emails. An email is included if is related to a member of any given group.
@param emails an array of emails
*/
export const getEmailsAlreadyInAGroup = async (emails) => {
    return await Group.find({ "members.email": { $in: emails } })
        .distinct("members.email")
        .exec();
}

export const removeGroupByName = async (name) => {
    return await Group.deleteOne({ name: name })
}

/**
 * Remove the given member from its group if any, if the member is the last one, remove the group.
 */
export const removeMemberFromGroupIfAny = async (email) => {
    const group = await Group.findOne({ "members.email": email })

    if (!group) {
        return false
    }

    // if last member, delete group
    if (group.members.length === 1) {
        await Group.findOneAndDelete({ name: group.name })
    }
    else {
        await Group.findOneAndUpdate(
            { name: group.name },
            { $pull: { members: { email: email } } },
            { new: true }
        )
    }

    return true;
}