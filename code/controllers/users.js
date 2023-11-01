import { Group, User } from "../models/User.js";
import { verifyAuth, verifySharedAuth } from "./utils.js";
import { AUTH_TYPE } from "../services/auth.service.js";
import { serverSideError, ok, badRequest, unauthorized } from "../services/http.service.js";
import * as Validator from "../validators/user.validator.js"
import * as UserService from "../services/user.service.js"
import { removeAllByUsername } from "../services/transactions.service.js";



/****************************** USER ENDPOINTS *******************************************/
/**
 * Return all the users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
  - Optional behavior:
    - empty array is returned if there are no users
 */
export const getUsers = async (req, res) => {
  try {
    const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
    if (!authorized) unauthorized(res, cause)

    const users = await UserService.getAllUsers()

    return ok(res, users)
  } catch (error) {
    return serverSideError(res, error)
  }
}

/**
 * Return information of a specific user
  - Request Body Content: None
  - Response `data` Content: An object having attributes `username`, `email` and `role`.
  - Optional behavior:
    - error 400 is returned if the user is not found in the system
 */
export const getUser = async (req, res) => {
  try {
    const uname = req.params.username
    const { authorized, cause } = verifySharedAuth(req, res, { authTYpe: AUTH_TYPE.USER, username: uname })
    if (!authorized) unauthorized(res, cause)

    // called user
    const calledUser = await UserService.getUserByUsername(uname)

    // user not found
    if (!calledUser)
      return badRequest(res, "User not found")

    return ok(res, {
      username: calledUser.username,
      email: calledUser.email,
      role: calledUser.role
    })
  } catch (error) {
    return serverSideError(res, error)
  }
}

/**
 * Delete a user
  - Request Parameters: None
  - Request Body Content: A string equal to the `email` of the user to be deleted
  - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and a boolean attribute that
    specifies whether the user was also `deletedFromGroup` or not.
  - Optional behavior:
    - error 400 is returned if the user does not exist 
    - error 400 is returned if the user is an Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
    if (!authorized) unauthorized(res, cause)

    const email = req.body.email

    // check body
    if (!email) return badRequest(res, "email not specified")

    // search user to delete
    const user = await UserService.getUserByEmail(email)
    if (!user) {
      return badRequest(res, "user does not exist")
    }

    if (user.role === AUTH_TYPE.ADMIN) {
      return badRequest(res, "Admins can not be deleted")
    }

    // delete transactions made by user
    let data = await removeAllByUsername(user.username)
    const count = data.deletedCount

    // delete user from group if member
    const memberDeleted = await UserService.removeMemberFromGroupIfAny(email)

    // delete user
    await UserService.removeUserByEmail(email)

    return ok(res, { "deletedTransactions": count, "deletedFromGroup": memberDeleted })
  } catch (err) {
    return serverSideError(res, err)
  }
}


/* -------------------------------- GROUPS FUNCTIONS ------------------------------------- */

/**
 * Create a new group
  - Request Body Content: 
    - An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
  - Response `data` Content: 
    - An object having an attribute `group` 
    (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group), 
    - An array that lists the `alreadyInGroup` members (members whose email is already present in a group) 
    - An array that lists the `membersNotFound` (members whose email does not appear in the system)
  
  If a user calling this is not in the array of `memberEmails`, it gets added to the list (and to the group if possible).
  - Optional behavior:
    - error 400 is returned if there is already an existing group with the same name
    - error 400 is returned if the user calling is not in the array of `memberEmails` and can not be added to the group
    - error 400 is returned if all the `memberEmails` either do not exist or are already in a group (if calling user is not in a group this can't happen)
 */
export const createGroup = async (req, res) => {
  try {
    const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.SIMPLE });
    if (!authorized) return unauthorized(res, cause)

    const name = req.body.name

    // This tries to avoid breaking official tests for bad request bodies
    // Since all 3 of these names appeared at least once in project communications, we live this here
    // to ensure every name's ok.
    const memberEmails = req.body.memberEmails || req.body.emails || req.body.members

    // Requested group name and user emails to add
    const valid = Validator.validateGroupRequest(memberEmails, name)
    if (!valid) {
      return badRequest(res, "Invalid informations")
    }

    // Return 400 if a group exist with this name
    const existingGroupWithName = await UserService.getGroupByName(name)
    if (existingGroupWithName) {
      return badRequest(res, "A group with this name already exists, aborting...")
    }

    // Retrieve the user calling the endpoint
    const callingUser = await UserService.getUserByToken(req.cookies.refreshToken)
    const callingUserEmail = callingUser.email

    if (!callingUser) {
      return badRequest(res, "Calling user doesn't exist")
    }

    // Return 400 if the calling user is already in a group
    if (!memberEmails.includes(callingUserEmail)) {
      const callingUserAlreadyInAGroup = await UserService.isAlreadyInGroup(callingUserEmail)

      if (callingUserAlreadyInAGroup)
        return badRequest(res, "Calling user can't be added to this group, aborting...")
    }

    // Retrieve the requested users
    const users = await UserService.getAllUsersByEmails(memberEmails)

    const existingUsers = users.filter(u => u !== null)
    const existingUserEmails = existingUsers.map(u => u.email)

    // Emails of users that aren't in the existingUsers array (that are not found)
    const membersNotFound = memberEmails.filter(email => !existingUsers.map(u => u.email).includes(email))

    // Emails of users already in a group
    const alreadyInGroup = await UserService.getEmailsAlreadyInAGroup(existingUserEmails)

    // User to be add as members
    const otherMembers = existingUsers.filter(u =>
      !membersNotFound.includes(u.email) &&
      !alreadyInGroup.includes(u.email)
    )

    // Add the callingUser as member 
    const members = [callingUser, ...otherMembers]

    // if you get here, this will always be false as callingUser gets added to the members (reqs)
    if (members.length === 0) {
      return badRequest(res, "No user can be added to this Group, aborting...")
    }

    const newGroup = await new Group({ members: members, name: name }).save()

    return ok(res, {
      group: newGroup,
      alreadyInGroup: alreadyInGroup,
      membersNotFound: membersNotFound
    })

  } catch (err) {
    return serverSideError(res, err)
  }

}

/**
 * Return all the groups
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group
    and an array for the `members` of the group
  - Optional behavior:
    - empty array is returned if there are no groups
 */
export const getGroups = async (req, res) => {
  try {
    const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
    if (!authorized) return unauthorized(res, cause)

    const groups = await UserService.getAllGroups()

    return ok(res, groups)
  }
  catch (err) {
    return serverSideError(res, err)
  }
}

/**
 * Return information of a specific group
  - Request Body Content: None
  - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the 
    `members` of the group
  - Optional behavior:
    - error 400 is returned if the group does not exist
 */
export const getGroup = async (req, res) => {
  try {
    const group = await UserService.getGroupByName(req.params.name)
    if (!group) return badRequest(res, "Group not found")

    const retrievedMembers = group.members.map(m => m.email)
    const { authorized, cause } = verifySharedAuth(req, res, {
      authType: AUTH_TYPE.GROUP,
      emails: retrievedMembers
    })

    if (!authorized) return unauthorized(res, cause)

    return ok(res, UserService.mapToGroupResponse(group))
  }
  catch (err) {
    return serverSideError(res, err)
  }
}

/**
 * Add new members to a group
  - Request Body Content: An array of strings containing the emails of the members to add to the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include the new members as well as the old ones), 
    an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - error 400 is returned if req.body.emails is not valid
    - error 400 is returned if all the `memberEmails` either do not exist or are already in a group
 */
export const addToGroup = async (req, res) => {
  try {
    const requestedGroup = req.params.name
    const group = await UserService.getGroupByName(requestedGroup)
    if (!group) return badRequest(res, "Group not found")

    const retrievedMembers = group.members.map(m => m.email)
    const { authorized, cause } = verifySharedAuth(req, res, {
      authType: AUTH_TYPE.GROUP,
      emails: retrievedMembers
    })
    if (!authorized) return unauthorized(res, cause)

    const toAdd = req.body.emails
    if (!Validator.validateGroupRequest(req.body.emails)) {
      return badRequest(res, "Invalid informations")
    }

    // Retrieve the requested users
    const users = await (UserService.getAllUsersByEmails(toAdd))
    const existingUsers = users.filter(u => u !== null)
    const existingUsersEmails = existingUsers.map(u => u.email)

    // Emails of users that aren't in the existingUsers array (that are not found)
    const membersNotFound = toAdd.filter(email => !existingUsersEmails.includes(email))

    const alreadyInGroup = await UserService.getEmailsAlreadyInAGroup(existingUsersEmails)
    console.log(await Group.findOne({ "memberEmails.email": "admino@gmail.com" }))
    const noMembersToAdd = alreadyInGroup.length + membersNotFound.length === toAdd.length

    if (noMembersToAdd) {
      return badRequest(res, "Nothing to add")
    }

    const membersToAdd = existingUsers.map(user => {
      return {
        email: user.email,
        user: user._id
      }
    });

    const result = await Group.findOneAndUpdate(
      { name: requestedGroup },
      { $push: { members: { $each: membersToAdd } } },
      { new: true }
    )

    return ok(res, {
      group: result,
      alreadyInGroup: alreadyInGroup,
      membersNotFound: membersNotFound
    })

  } catch (err) {
    return serverSideError(res, err)
  }
}

/**
 * Remove members from a group
  - Request Body Content: `members` email to remove 
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include only the remaining members),
    an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - error 400 is returned if all the `memberEmails` either do not exist or are not in the group
 */
export const removeFromGroup = async (req, res) => {
  try {
    const group = req.params.name
    const retrievedGroup = await UserService.getGroupByName(group)
    if (!retrievedGroup) {
      return badRequest(res, "Group doesn't exist")
    }

    const retrievedMembers = retrievedGroup.members.map(m => m.email)
    const { authorized, cause } = verifySharedAuth(req, res, { authType: AUTH_TYPE.GROUP, emails: retrievedMembers });
    if (!authorized) return unauthorized(res, cause)

    if (!Validator.validateGroupRequest(req.body.emails)) {
      return badRequest(res, "Invalid emails")
    }

    if (retrievedMembers.length === 1) {
      return badRequest(res, "User is the only group member")
    }

    const toRemove = req.body.emails
    // Retrieve the requested users
    const users = await UserService.getAllUsersByEmails(toRemove)

    const existingUsersEmails = users.filter(u => u !== null).map(u => u.email)

    // Emails of users that aren't in the existingUsers array (that are not found)
    const membersNotFound = toRemove.filter(email => !existingUsersEmails.includes(email))

    const notInGroup = existingUsersEmails.filter(email =>
      !retrievedMembers.includes(email) &&
      !membersNotFound.includes(email)
    )

    const noMembersToRemove = notInGroup.length + membersNotFound.length === toRemove.length
    if (noMembersToRemove) {
      return badRequest(res, "Nothing to remove")
    }

    const result = await Group.findOneAndUpdate(
      { name: group },
      { $pull: { members: { email: { $in: toRemove } } } },
      { new: true }
    )

    return ok(res, {
      group: result,
      notInGroup: notInGroup,
      membersNotFound: membersNotFound
    })
  }
  catch (err) {
    return serverSideError(res, err)
  }
}

/**
 * Delete a group
  - Request Body Content: A string equal to the `name` of the group to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 400 is returned if the group does not exist
 */
export const deleteGroup = async (req, res) => {
  try {
    const { authorized, cause } = verifyAuth(req, res, { authType: AUTH_TYPE.ADMIN })
    if (!authorized) return unauthorized(res, cause)

    const { deletedCount } = await UserService.removeGroupByName(req.body.name)

    if (deletedCount === 0) {
      return badRequest(res, "Group not found")
    }

    return ok(res, { message: "Successfully Deleted" })
  } catch (err) {
    return serverSideError(res, err)
  }
}
