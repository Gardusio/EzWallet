import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import * as utils from "../controllers/utils.js"
import * as UserService from "../services/user.service.js"
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */
dotenv.config();
beforeAll(async () => {
  const dbName = "testingDatabaseUsers";
  const url = `${process.env.MONGO_URI}/${dbName}`;

  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

});

/**
 * After all test cases have been executed the database is deleted.
 * This is done so that subsequent executions of the test suite start with an empty database.
 */
afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe("getUsers", () => {
  /**
   * Database is cleared before each test case, in order to allow insertion of data tailored for each specific test case.
   */
  beforeEach(async () => {
    await User.deleteMany({})
  })

  it("should return empty list if there are no users", (done) => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })

    request(app)
      .get("/api/users")
      .then((response) => {
        expect(authSpy).toHaveBeenCalled()
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(0)
        done()
      })
      .catch((err) => done(err))
  })

  it("should retrieve list of all users", (done) => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })

    User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    }).then(() => {
      request(app)
        .get("/api/users")
        .then((response) => {
          expect(authSpy).toHaveBeenCalled()
          expect(response.status).toBe(200)
          expect(response.body.data).toHaveLength(1)
          expect(response.body.data[0].username).toEqual("tester")
          expect(response.body.data[0].email).toEqual("test@test.com")
          expect(response.body.data[0].role).toEqual("Regular")
          done() // Notify Jest that the test is complete
        })
        .catch((err) => done(err))
    })
  })
})

describe("getUser", () => {

  beforeEach(async () => {
    await User.deleteMany({})
  })

  it("should retrieve the user correctly", (done) => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockImplementation(() => { return { authorized: true } })

    User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    }).then(() => {
      request(app)
        .get("/api/users/tester")
        .then((response) => {
          expect(authSpy).toHaveBeenCalled()
          expect(response.status).toBe(200)
          expect(response.body.data.username).toEqual("tester")
          expect(response.body.data.email).toEqual("test@test.com")
          expect(response.body.data.role).toEqual("Regular")
          done() // Notify Jest that the test is complete
        })
        .catch((err) => done(err))
    })
  })
})

describe("createGroup", () => {
  let user1
  let user2
  let group
  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})

    user1 = await User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    })

    user2 = await User.create({
      username: "bla",
      email: "bla@test.com",
      password: "tester",
    })

    group = {
      name: "group",
      members: [
        { email: user1.email, user: user1._id },
        { email: user2.email, user: user2._id }
      ]
    }
  })

  it("should create the group correctly", async () => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const getCallingUser = jest.spyOn(UserService, "getUserByToken").mockImplementation(() => ({ email: "email" }))

    const response = await (request(app).post("/api/groups").send({
      name: "group",
      memberEmails: [user1.email, user2.email]
    }))

    expect(authSpy).toHaveBeenCalled()
    expect(getCallingUser).toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(response.body.data.group.id).not.toEqual(null)
    expect(response.body.data.group.members.length).toEqual(3)
    expect(response.body.data.alreadyInGroup).toEqual([])
    expect(response.body.data.membersNotFound).toEqual([])
  })

  it("should return alreadyInGroup", async () => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const getCallingUser = jest.spyOn(UserService, "getUserByToken").mockImplementation(() => ({ email: "email" }))

    const existingGroup = await Group.create({
      name: "existingGroup",
      members: [{ email: user2.email, user: user2._id }]
    })

    const response = await (request(app).post("/api/groups").send({
      name: "group",
      memberEmails: [user1.email, user2.email]
    }))

    expect(authSpy).toHaveBeenCalled()
    expect(getCallingUser).toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(response.body.data.group.id).not.toEqual(null)
    expect(response.body.data.group.members.length).toEqual(2)
    expect(response.body.data.alreadyInGroup).toEqual([user2.email])
    expect(response.body.data.membersNotFound).toEqual([])
  })

  it("should return memberNotFound", async () => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const getCallingUser = jest.spyOn(UserService, "getUserByToken").mockImplementation(() => ({ email: "email" }))

    const response = await (request(app).post("/api/groups").send({
      name: "group",
      memberEmails: [user1.email, "notFound@email.com"]
    }))

    expect(authSpy).toHaveBeenCalled()
    expect(getCallingUser).toHaveBeenCalled()
    expect(response.status).toBe(200)
    expect(response.body.data.group.id).not.toEqual(null)
    expect(response.body.data.group.members.length).toEqual(2)
    expect(response.body.data.alreadyInGroup).toEqual([])
    expect(response.body.data.membersNotFound).toEqual(["notFound@email.com"])
  })

  it("should return 400 if a group with the provided name already exists", async () => {
    const authSpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const getCallingUser = jest.spyOn(UserService, "getUserByToken").mockImplementation(() => ({ email: "email" }))

    await Group.create(group)

    const requestGroup = {
      name: group.name,
      memberEmails: [user1.email]
    }

    const response = await request(app)
      .post('/api/groups')
      .send(requestGroup);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("A group with this name already exists, aborting...");
  });

  it("should return 400 if the calling user is not in the provided list of members and cannot be added to the group", async () => {
    // Set up test data: create a calling user who is already in a group
    const authSpy = jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })
    const getCallingUser = jest.spyOn(UserService, "getUserByToken").mockReturnValue({ email: user1.email })

    await Group.create(group)

    const requestGroup = {
      name: "testGroup",
      memberEmails: ["user3@gmail.com"]
    }

    const response = await request(app)
      .post('/api/groups')
      .send(requestGroup);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Calling user can't be added to this group, aborting...");
  });

});

describe("getGroups", () => {
  beforeEach(async () => {
    await User.deleteMany({})
    await Group.deleteMany({})
  })

  it("should return all groups", async () => {
    const user2 = await User.create({
      email: "email@gmail.com",
      password: "pwd",
      username: "user4"
    })

    const existingGroup = await Group.create({
      name: "existingGroup",
      members: [{ email: user2.email, user: user2._id }]
    })

    const expected = UserService.mapToGroupResponse(existingGroup)

    const response = await request(app).get("/api/groups")

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([expected])
  })

  it("should return empty list", async () => {
    jest.spyOn(utils, "verifyAuth").mockReturnValue({ authorized: true })

    const response = await request(app).get("/api/groups")

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })
})

describe("getGroup", () => {
  let user1;
  let user2;
  let group;

  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});

    user1 = await User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    });

    user2 = await User.create({
      username: "bla",
      email: "bla@test.com",
      password: "tester",
    });

    group = {
      name: "group",
      members: [
        { email: user1.email, user: user1._id },
        { email: user2.email, user: user2._id },
      ],
    };
  });

  it("should return the group information correctly", async () => {
    await Group.create(group);

    const verifyAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({
      authorized: true,
    });

    const response = await request(app).get("/api/groups/" + group.name);

    const expected = UserService.mapToGroupResponse(group)

    expect(verifyAuth).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expected);
  });

  it("should return 400 if the group does not exist", async () => {
    const verifyAuth = jest.spyOn(utils, "verifySharedAuth").mockReturnValue({
      authorized: true,
    });

    const response = await request(app).get("/api/groups/nonexistent");

    expect(verifyAuth).toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Group not found");
  });
});

describe("addToGroup", () => {
  let user1;
  let user2;
  let group;

  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});

    user1 = await User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    });

    user2 = await User.create({
      username: "bla",
      email: "bla@test.com",
      password: "tester",
    });

    group = {
      name: "group",
      members: [
        { email: user1.email, user: user1._id },
        { email: user2.email, user: user2._id },
      ],
    };
  });

  it("should add new members to the group correctly", async () => {
    jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true })

    const requestedGroup = "group";
    await Group.create(group);
    const newMember = await User.create({ email: "new@gmail.com", password: "pwd", username: "u3" })

    const response = await request(app)
      .patch("/api/groups/group/add")
      .send({ emails: [newMember.email] });

    const updatedGroup = await Group.findOne({ name: requestedGroup });

    expect(response.status).toBe(200);
    expect(updatedGroup.members.length).toBe(3);
    expect(updatedGroup.members.map((m) => m.email)).toContain(user1.email);
    expect(updatedGroup.members.map((m) => m.email)).toContain(user2.email);
    expect(updatedGroup.members.map((m) => m.email)).toContain(newMember.email);
    expect(response.body.data.group.name).toBe(requestedGroup);
    expect(response.body.data.group.members.length).toBe(3);
    expect(response.body.data.alreadyInGroup).toEqual([]);
    expect(response.body.data.membersNotFound).toEqual([]);
  });

  it("should return 400 if the group does not exist", async () => {
    const requestedGroup = "nonexistent-group";

    const response = await request(app)
      .patch("/api/groups/nonexistent-group/add")
      .send({ emails: [user1.email, user2.email] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Group not found");
  });

  it("should return 400 if all memberEmails are either not found or already in a group", async () => {
    jest.spyOn(utils, "verifySharedAuth").mockReturnValue({ authorized: true })
    await Group.create(group);

    const response = await request(app)
      .patch("/api/groups/group/insert")
      .send({ emails: [user1.email, user2.email] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Nothing to add");
  });

});

describe("removeFromGroup", () => {
  let user1;
  let user2;
  let group;

  beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});

    user1 = await User.create({
      username: "tester",
      email: "test@test.com",
      password: "tester",
    });

    user2 = await User.create({
      username: "bla",
      email: "bla@test.com",
      password: "tester",
    });

    group = {
      name: "group",
      members: [
        { email: user1.email, user: user1._id },
        { email: user2.email, user: user2._id },
      ],
    };
  });

  it("should remove members from the group correctly", async () => {
    const requestedGroup = "group";
    const existingGroup = await Group.create(group);

    const response = await request(app)
      .patch(`/api/groups/${requestedGroup}/remove`)
      .send({ emails: [user1.email] });

    const updatedGroup = await Group.findOne({ _id: existingGroup._id });

    expect(response.status).toBe(200);
    expect(updatedGroup.members.length).toBe(1);
    expect(updatedGroup.members.map((m) => m.email)).not.toContain(user1.email);
    expect(response.body.data.group.name).toBe(requestedGroup);
    expect(response.body.data.group.members.length).toBe(1);
    expect(response.body.data.notInGroup).toEqual([]);
    expect(response.body.data.membersNotFound).toEqual([]);
  });

  it("should return 400 if the group does not exist", async () => {
    const requestedGroup = "nonexistent-group";

    const response = await request(app)
      .patch(`/api/groups/${requestedGroup}/remove`)
      .send({ emails: [user1.email, user2.email] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Group doesn't exist");
  });

  it("should return 400 if all memberEmails are either not found or not in the group", async () => {
    const requestedGroup = "group";
    await Group.create(group);

    const response = await request(app)
      .patch(`/api/groups/${requestedGroup}/remove`)
      .send({ emails: ["nonexistent-email"] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Nothing to remove");
  });

  it("should return 400 if user is the only group member", async () => {
    const requestedGroup = "group";
    await Group.create({
      name: requestedGroup,
      members: [{ email: user1.email, user: user1._id }],
    });

    const response = await request(app)
      .patch(`/api/groups/${requestedGroup}/remove`)
      .send({ emails: [user1.email] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("User is the only group member");
  });

});


describe("deleteUser", () => { })

describe("deleteGroup", () => { })
