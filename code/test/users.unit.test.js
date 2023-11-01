import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import * as Validator from "../validators/user.validator.js"
import * as utils from '../controllers/utils.js'
import * as users from '../controllers/users.js'
import * as UserService from "../services/user.service.js"
import { verify } from 'jsonwebtoken';
/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock("../models/User.js")

/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
let res = {}
beforeEach(() => {
  User.find.mockClear()
  jest.restoreAllMocks()
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: { refreshedTokenMessage: "" }
  };
});


describe('getUsers', () => {
  let req;

  test("should return 401 if the user is not authorized", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.getGroups(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  ////////////has 2 error ////////////
  test('should retrieve list of all users', async () => {
    const mockAuthorizedResult = {
      authorized: true,
      cause: null,
    };
    const mockUsers = [
      { username: 'user1', email: 'user1@example.com', role: 'admin' },
      { username: 'user2', email: 'user2@example.com', role: 'user' },
    ];

    const verifySpy = jest.spyOn(utils, 'verifyAuth').mockResolvedValueOnce(mockAuthorizedResult);
    const getAllUsersMock = jest.spyOn(UserService, 'getAllUsers').mockResolvedValueOnce(mockUsers);

    await users.getUsers(req, res);

    expect(verifySpy).toHaveBeenCalledWith(req, res, { authType: "Admin" });
    expect(getAllUsersMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockUsers, refreshedTokenMessage: "" });
  });

  test("should return 500 if something went wrong", async () => {
    const getAllUsers = jest.spyOn(UserService, "getAllUsers").mockRejectedValue(new Error("Something went wrong"));

    await users.getUsers(req, res);

    expect(getAllUsers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });
});

describe("getUser", () => {
  test("should return 401 if the user is not authorized", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.getUser(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  test("should return user details for a valid user", async () => {
    const req = { params: { username: "user123" } };

    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const mockGetUserByUsername = jest.spyOn(UserService, "getUserByUsername").mockReturnValue({
      username: "user123",
      email: "user1@example.com",
      role: "user"
    });

    await users.getUser(req, res);

    expect(verifySharedAuth).toHaveBeenCalledWith(
      req,
      res,
      expect.objectContaining({ authTYpe: "User", username: "user123" })
    );
    expect(mockGetUserByUsername).toHaveBeenCalledWith("user123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        username: "user123",
        email: "user1@example.com",
        role: "user"
      },
      refreshedTokenMessage: ""
    }));

  });
  test('should return error because the user does not exist', async () => {
    const req = {
      params: {
        username: "usrer"
      }
    }
    const verifySpy = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const mockGetUserByUsername = jest.spyOn(UserService, "getUserByUsername").mockReturnValue(null); // Mocking the user not found scenario


    await users.getUser(req, res);

    expect(verifySpy).toHaveBeenCalled();
    expect(mockGetUserByUsername).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });

  });

  ///////////the code has error
  it("should return 500 if something went wrong", async () => {
    const mockGetUserByUsername = jest.spyOn(UserService, "getUserByUsername").mockRejectedValue(new Error("Something went wrong"));

    await users.getUser(req, res);

    expect(mockGetUserByUsername).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });

});


describe("deleteUser", () => {
  test("should return 401 if the user is not authorized", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.deleteUser(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
  test("should return 400 if email to delete is not specified", async () => {
    const req = {
      body: {},
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await users.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "email not specified" });
  });

  /////////////////has error username undefined
  test("should delete a user and associated data when admin deletes a user who is the last member of a group", async () => {
    const req = {
      body: {
        email: "user1@example.com",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const verifyAuthSpy = jest.spyOn(utils, "verifyAuth").mockResolvedValue({ authorized: true });
    const userFindOneSpy = jest.spyOn(User, "findOne").mockResolvedValue({ username: "user123" });
    const transactionsDeleteManySpy = jest.spyOn(transactions, "deleteMany").mockResolvedValue({ deletedCount: 2 });
    const isAlreadyInGroupSpy = jest.spyOn(UserService, "isAlreadyInGroup").mockResolvedValue(true);
    const groupFindOneSpy = jest.spyOn(Group, "findOne").mockResolvedValue({ name: "group123", members: [{ email: "user1@example.com" }] });
    const groupFindOneAndDeleteSpy = jest.spyOn(Group, "findOneAndDelete").mockResolvedValue({});

    await users.deleteUser(req, res);

    expect(verifyAuthSpy).toHaveBeenCalledWith(req, res, { authType: "Admin" });
    expect(userFindOneSpy).toHaveBeenCalledWith({ email: "user1@example.com" });
    expect(transactionsDeleteManySpy).toHaveBeenCalledWith({ username: "user123" });
    expect(isAlreadyInGroupSpy).toHaveBeenCalledWith("user1@example.com");
    expect(groupFindOneSpy).toHaveBeenCalledWith({ "members.email": "user1@example.com" });
    expect(groupFindOneAndDeleteSpy).toHaveBeenCalledWith({ name: "group123" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deletedTransactions: 2, deletedFromGroup: true });
  });

  test("Admin delete himself, error ", async () => {

    const req = {

      role: 'Admin',
    }
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    await users.deleteUser(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  });

  test("user delete a user, error ", async () => {

    const req = {

      role: 'Regular',
    }
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    await users.deleteUser(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  });
  test("should return 500 if something went wrong", async () => {
    const req = {
      body: {
        email: "user1@example.com"
      },
    };
    const deleteusers = jest.spyOn(UserService, "getUserByEmail").mockRejectedValue(new Error("Something went wrong"));

    await users.deleteUser(req, res);

    expect(deleteusers).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });
})

/********************************* GROUPS ******************************* */

const req = {
  params: {
    name: "example-group",
  },
  body: {}
};

describe("getGroup", () => {
  it("should return 400 if the group is not found", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(null);

    await users.getGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Group not found" })
  });

  it("should return 401 if the user is not authorized", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false });

    await users.getGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  });

  it("should return 200 if the user is authorized", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "admin@example.com", role: "admin" },
        { email: "user1@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    await users.getGroup(req, res);

    const expectedGroup = UserService.mapToGroupResponse(group)

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: expectedGroup, refreshedTokenMessage: "" })
  });

  it("should return 500 if something went wrong", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockRejectedValue(new Error("Something went wrong"));

    await users.getGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });
});

describe("getGroups", () => {

  it("should return 401 if the user is not authorized", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.getGroups(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("should return 200 and the groups if the user is authorized", async () => {
    const members = [{ email: "user1@example.com" }, { email: "user2@example.com" }]
    const groups = [
      { name: "group1", members: members },
      { name: "group2", members: [{ email: "user3@example.com" }] },
    ];

    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const groupFindMock = jest.spyOn(Group, "find").mockResolvedValue(groups);

    await users.getGroups(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(groupFindMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: groups, refreshedTokenMessage: "" });
  });

  it("should return 500 if something went wrong", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const groupFindMock = jest.spyOn(Group, "find").mockRejectedValue(new Error("Something went wrong"));

    await users.getGroups(req, res);

    expect(verifyAuth).toHaveBeenCalled();
    expect(groupFindMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });
});

describe("createGroup", () => {

  it("should return 401 if the user is not authenticated", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.createGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("should return 400 if the req body is invalid", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const validateSpy = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(false)
    await users.createGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
  });

  it("should return 400 if a group with the provided name already exists", async () => {
    const name = "example-group";
    req.body = {
      name: name,
      memberEmails: ["user1@example.com", "user2@example.com"],
    };

    const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const validateSpy = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true)
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue({ name: "example-group" });

    await users.createGroup(req, res);

    expect(verifySpy).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalled();
    expect(getGroupByName).toHaveBeenCalledWith(name);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "A group with this name already exists, aborting..." });
  });

  it("should return 400 if the calling user is not in the provided list of members and cannot be added to the group", async () => {
    const name = "example-group";

    req.body = {
      name: name,
      memberEmails: ["user1@example.com", "user2@example.com"]
    };
    req.cookies = { refreshToken: "example-refresh-token" };

    const verifySpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const validateSpy = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true)
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockReturnValue(null);

    const find = jest.spyOn(User, "findOne").mockReturnValue({ email: "calling@example.com" })
    const isAlreadyInGroup = jest.spyOn(UserService, "isAlreadyInGroup").mockResolvedValue(true);

    const expectedErrorMessage = "Calling user can't be added to this group, aborting...";

    await users.createGroup(req, res);

    expect(verifySpy).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalled();
    expect(getGroupByName).toHaveBeenCalledWith(name);
    expect(find).toHaveBeenCalled()
    expect(isAlreadyInGroup).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expectedErrorMessage });
  });

  it("should return 500 if something went wrong", async () => {

    const goesWrong = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { throw new Error("Something went wrong") });

    await users.createGroup(req, res);

    expect(goesWrong).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });

  it("should return 200 with the newly created group", async () => {
    req.body = {
      name: "example-group",
      memberEmails: ["user1@example.com", "user2@example.com", "user3@example.com"]
    };
    req.cookies = { refreshToken: "example-refresh-token" };

    const callingUser = { email: "calling@example.com" }
    const existingUser1 = { email: "user1@example.com" }
    const existingUser2 = { email: "user2@example.com" }
    const existingUser3 = { email: "user3@example.com" }

    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const validate = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(null);

    const find = jest.spyOn(User, "findOne").mockReturnValue(callingUser)
    const getAllUsersByEmails = jest.spyOn(UserService, "getAllUsersByEmails").mockReturnValue([callingUser, existingUser1, existingUser2]);

    const isAlreadyInGroup = jest.spyOn(UserService, "isAlreadyInGroup").mockResolvedValue(false);
    const getEmailsAlreadyInAGroup = jest.spyOn(UserService, "getEmailsAlreadyInAGroup").mockReturnValue([existingUser2.email])

    const newGroup = {
      name: "example-group",
      members: [callingUser, existingUser1]
    };

    const groupSaveMock = jest.spyOn(Group.prototype, "save").mockResolvedValue(newGroup);

    await users.createGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(find).toHaveBeenCalled();
    expect(validate).toHaveBeenCalled();
    expect(getAllUsersByEmails).toHaveBeenCalled();
    expect(getGroupByName).toHaveBeenCalled();
    expect(isAlreadyInGroup).toHaveBeenCalled();
    expect(getEmailsAlreadyInAGroup).toHaveBeenCalled();
    expect(groupSaveMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        group: newGroup,
        alreadyInGroup: [existingUser2.email],
        membersNotFound: [existingUser3.email],
      },
      refreshedTokenMessage: ""
    });
  });

})

describe("addToGroup", () => {
  const req = {
    params: { name: "example-group" },
    body: { emails: [] }
  }

  it("should return 400 if the group is not found", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(null);

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Group not found" });
  });

  it("should return 401 if the user is not authorized", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false });

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("should return 400 if emails to add are invalid", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(false);

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid informations" });
  });

  it("should return 400 if there are no members to add", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);

    req.body.emails = [];

    const toAdd = ["user3@example.com", "user4@example.com"];
    req.body.emails = toAdd;

    const usersToAdd = [
      { email: "user3@example.com", _id: "user3-id" },
      { email: "user4@example.com", _id: "user4-id" },
    ];

    const getAllUsersByEmails = jest.spyOn(UserService, "getAllUsersByEmails").mockReturnValue(usersToAdd)
    const getEmailsAlreadyInAGroup = jest.spyOn(UserService, "getEmailsAlreadyInAGroup").mockReturnValue(usersToAdd);

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalled();
    expect(getAllUsersByEmails).toHaveBeenCalled();
    expect(getEmailsAlreadyInAGroup).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Nothing to add" });
  });

  it("should return 200 and the updated group", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);

    const toAdd = ["user3@example.com", "user4@example.com"];
    req.body.emails = toAdd;

    const usersToAdd = [
      { email: "user3@example.com", _id: "user3-id" },
      { email: "user4@example.com", _id: "user4-id" },
    ];

    const getAllUsersByEmails = jest.spyOn(UserService, "getAllUsersByEmails").mockReturnValue(usersToAdd)
    const getEmailsAlreadyInAGroup = jest.spyOn(UserService, "getEmailsAlreadyInAGroup").mockReturnValue(["user2@example.com"]);
    const findOneAndUpdate = jest.spyOn(Group, "findOneAndUpdate").mockResolvedValue({ name: "example-group", members: [...group.members, ...usersToAdd] });

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(getAllUsersByEmails).toHaveBeenCalled();
    expect(getEmailsAlreadyInAGroup).toHaveBeenCalledWith(["user3@example.com", "user4@example.com"]);
    expect(findOneAndUpdate).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        group: { name: "example-group", members: [...group.members, ...usersToAdd] },
        alreadyInGroup: ["user2@example.com"],
        membersNotFound: [],
      },
      refreshedTokenMessage: "",
    });
  });

  it("should return 500 if something went wrong", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockRejectedValue(new Error("Something went wrong"));

    await users.addToGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });
});

describe("removeFromGroup", () => {
  const req = {
    params: { name: "example-group" },
    body: { emails: [] }
  };

  it("should return 400 if the group is not found", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(null);

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Group doesn't exist" });
  });

  it("should return 400 if emails to remove are invalid", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(false);

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid emails" });
  });

  it("should return 400 if user is the only group member", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);

    req.body.emails = ["user1@example.com"];;

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "User is the only group member" });
  });


  it("should return 401 if the user is not authorized", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: false });

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("should return 500 if something went wrong", async () => {
    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockRejectedValue(new Error("Something went wrong"));

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });

  it("should return 200 and the updated group", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" },
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);

    const toRemove = ["user2@example.com"];
    req.body.emails = toRemove;

    const usersToRemove = [
      { email: "user2@example.com", _id: "user2-id" },
    ];

    const getAllUsersByEmails = jest.spyOn(UserService, "getAllUsersByEmails").mockReturnValue(usersToRemove);

    const findOneAndUpdate = jest.spyOn(Group, "findOneAndUpdate").mockResolvedValue({ name: "example-group", members: [group.members[0]] });

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(getAllUsersByEmails).toHaveBeenCalled();
    expect(findOneAndUpdate).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        group: { name: "example-group", members: [group.members[0]] },
        notInGroup: [],
        membersNotFound: [],
      },
      refreshedTokenMessage: "",
    });
  });

  it("should return 200 and users already in a group or not found", async () => {
    const group = {
      name: "example-group",
      members: [
        { email: "user1@example.com" },
        { email: "user2@example.com" }
      ],
    };

    const getGroupByName = jest.spyOn(UserService, "getGroupByName").mockResolvedValue(group);
    const verifySharedAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true });
    const validateGroupRequest = jest.spyOn(Validator, "validateGroupRequest").mockReturnValue(true);

    const toRemove = ["user2@example.com", "user3@example.com"];
    req.body.emails = toRemove;

    const usersToRemove = [
      { email: "user2@example.com", _id: "user2-id" },
    ];

    const getAllUsersByEmails = jest.spyOn(UserService, "getAllUsersByEmails").mockReturnValue(usersToRemove);

    const findOneAndUpdate = jest.spyOn(Group, "findOneAndUpdate").mockResolvedValue({ name: "example-group", members: [group.members[0]] });

    await users.removeFromGroup(req, res);

    expect(getGroupByName).toHaveBeenCalledWith(req.params.name);
    expect(verifySharedAuth).toHaveBeenCalled();
    expect(validateGroupRequest).toHaveBeenCalledWith(req.body.emails);
    expect(getAllUsersByEmails).toHaveBeenCalled();
    expect(findOneAndUpdate).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        group: { name: "example-group", members: [group.members[0]] },
        notInGroup: [],
        membersNotFound: ["user3@example.com"],
      },
      refreshedTokenMessage: "",
    });
  });
});

describe("deleteGroup", () => {
  const req = {
    body: {
      name: "example-group",
    },
  };

  it("should return 401 if the user is not an admin", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: false });

    await users.deleteGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("should return 400 if the group is not found", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const groupDeleteMock = jest.spyOn(Group, "deleteOne").mockResolvedValue({ deletedCount: 0 });

    await users.deleteGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled()
    expect(groupDeleteMock).toHaveBeenCalledWith({ name: req.body.name });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Group not found" });
  });

  it("should return 200 with successful message", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const groupDeleteMock = jest.spyOn(Group, "deleteOne").mockResolvedValue({ deletedCount: 1 });

    await users.deleteGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled();
    expect(groupDeleteMock).toHaveBeenCalledWith({ name: req.body.name });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { message: "Successfully Deleted" }, refreshedTokenMessage: "" });
  });

  it("should return 500 if something went wrong", async () => {
    const verifyAuth = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true });
    const groupDeleteMock = jest.spyOn(Group, "deleteOne").mockRejectedValue(new Error("Something went wrong"));

    await users.deleteGroup(req, res);

    expect(verifyAuth).toHaveBeenCalled();
    expect(groupDeleteMock).toHaveBeenCalledWith({ name: req.body.name });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Error: Something went wrong" });
  });

})
