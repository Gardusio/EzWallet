import { logout, login, register, registerAdmin } from '../controllers/auth.js';
import * as Validator from '../validators/auth.validator.js'
import * as UserService from '../services/user.service.js';
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs'

jest.mock('../models/User.js');

let req;
let res;

beforeEach(() => {
    req = {
        cookies: {}
    };
    res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        cookie: jest.fn(),
        locals: {
            refreshedTokenMessage: ""
        }
    };
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('register', () => {
    let req;

    beforeEach(() => {
        req = {
            body: {
                username: 'admin',
                email: 'admin@example.com',
                password: 'securePass',
            },
        };
    });

    it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({
            valid: false,
            cause: 'Missing informations',
        });

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing informations' });
    });

    it('should return a 400 error if at least one of the parameters in the request body is an empty string', async () => {
        req.body.email = '';

        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({
            valid: false,
            cause: 'Email inserted is not valid',
        });

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inserted is not valid' });
    });

    it('should return a 400 error if the email in the request body is not in a valid email format', async () => {
        req.body.email = 'invalid_email';

        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({
            valid: false,
            cause: 'Email inserted is not valid',
        });

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inserted is not valid' });
    });

    it('should return a 400 error if the email in the request body is already in use', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest')
            .mockReturnValueOnce({ valid: false, cause: "Email inserted already in use" });

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inserted already in use' });
    });

    it('should return a 400 error if the username in the request body is already in use', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest')
            .mockReturnValueOnce({ valid: false, cause: "Username inserted already in use" });

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Username inserted already in use' });
    });

    it('should successfully register a user', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({ valid: true });

        jest.spyOn(UserService, 'createUser').mockResolvedValueOnce();

        jest.spyOn(bcrypt, "hash").mockReturnValue("hashedPassword")

        await register(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(UserService.createUser).toHaveBeenCalledWith({
            username: req.body.username,
            email: req.body.email,
            password: 'hashedPassword',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: 'User added successfully' }, refreshedTokenMessage: "" });
    });
});


describe('registerAdmin', () => {
    let req;
    beforeEach(() => {
        req = {
            body: {
                username: 'admin',
                email: 'admin@example.com',
                password: 'securePass',
            },
        };
    });

    it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({
            valid: false,
            cause: 'Missing informations',
        });

        await registerAdmin(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing informations' });
    });

    it('should return a 400 error if the email in the request body is not in a valid email format', async () => {
        req.body.email = 'invalid_email';

        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({
            valid: false,
            cause: 'Email inserted is not valid',
        });

        await registerAdmin(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inserted is not valid' });
    });

    it('should return a 400 error if the email in the request body is already in use', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest')
            .mockReturnValueOnce({ valid: false, cause: "Email inserted already in use" });


        await registerAdmin(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inserted already in use' });
    });

    it('should return a 400 error if the username in the request body is already in use', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest')
            .mockReturnValueOnce({ valid: false, cause: "Username inserted already in use" });

        await registerAdmin(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Username inserted already in use' });
    });

    it('should successfully register an admin', async () => {
        jest.spyOn(Validator, 'validateRegisterRequest').mockReturnValueOnce({ valid: true });

        jest.spyOn(UserService, 'createUser').mockResolvedValueOnce(req.body);

        jest.spyOn(bcrypt, "hash").mockReturnValue("hashedPassword")

        await registerAdmin(req, res);

        expect(Validator.validateRegisterRequest).toHaveBeenCalledWith(req.body);
        expect(UserService.createUser).toHaveBeenCalledWith({
            username: req.body.username,
            email: req.body.email,
            password: 'hashedPassword',
            role: 'Admin',
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: 'Admin added successfully' }, refreshedTokenMessage: "" });
    });
});


describe('login', () => {
    let req;

    beforeEach(() => {
        req = {
            body: {
                email: 'test@example.com',
                password: 'password123',
            },
        };
    });

    it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {
        jest.spyOn(UserService, 'getUserByEmail').mockReturnValue(null);
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({
            valid: false,
            cause: 'Invalid credentials',
        });

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, null);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return a 400 error if at least one of the parameters in the request body is an empty string', async () => {
        req.body.email = '';

        jest.spyOn(UserService, 'getUserByEmail').mockReturnValue(null);
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({
            valid: false,
            cause: 'Invalid credentials',
        });

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, null);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return a 400 error if the email in the request body is not in a valid email format', async () => {
        req.body.email = 'invalid_email';

        jest.spyOn(UserService, 'getUserByEmail').mockReturnValue(null);
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({
            valid: false,
            cause: 'Invalid credentials',
        });

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, null);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return a 400 error if the email in the request body does not identify a user in the database', async () => {

        jest.spyOn(UserService, 'getUserByEmail').mockReturnValue(null);
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({ valid: false, cause: "User not found" });

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, null);
        expect(UserService.getUserByEmail).toHaveBeenCalledWith(req.body.email);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return a 400 error if the supplied password does not match with the one in the database', async () => {
        const user = {
            email: 'test@example.com',
            password: 'password124',
        }
        jest.spyOn(UserService, 'getUserByEmail').mockReturnValue(user);
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({ valid: false, cause: "Wrong credentials" });

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, user);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Wrong credentials' });
    });

    it('should successfully login the user', async () => {
        const userMock = {
            email: req.body.email,
            id: "id",
            username: "uname",
            role: "role",
            save: jest.fn()
        };

        jest.spyOn(userMock, 'save');
        jest.spyOn(UserService, "getUserByEmail").mockReturnValue(userMock)
        jest.spyOn(Validator, 'validateLoginRequest').mockReturnValue({ valid: true });

        const accessToken = 'sampleAccessToken';
        const refreshToken = 'sampleRefreshToken';
        jest.spyOn(jwt, 'sign')
            .mockReturnValueOnce(accessToken)
            .mockReturnValueOnce(refreshToken);

        await login(req, res);

        expect(Validator.validateLoginRequest).toHaveBeenCalledWith(req.body, expect.anything());
        expect(userMock.save).toHaveBeenCalled();
        expect(jwt.sign).toHaveBeenCalledTimes(2)
        expect(res.cookie).toHaveBeenCalledTimes(2);
        expect(res.cookie).toHaveBeenCalledWith('accessToken', accessToken, {
            httpOnly: true,
            domain: 'localhost',
            path: '/api',
            maxAge: 60 * 60 * 1000,
            sameSite: 'none',
            secure: true,
        });
        expect(res.cookie).toHaveBeenCalledWith('refreshToken', refreshToken, {
            httpOnly: true,
            domain: 'localhost',
            path: '/api',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'none',
            secure: true,
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { accessToken, refreshToken }, refreshedTokenMessage: "" });
    });
});


describe('logout', () => {

    let userMock;
    beforeEach(() => {
        userMock = { refreshToken: 'invalid_token', save: jest.fn() };
        jest.spyOn(userMock, 'save');
    })

    it('should return a 400 error if the request does not have a refresh token in the cookies', async () => {
        jest.spyOn(UserService, "getUserByToken").mockReturnValue(null)
        jest.spyOn(Validator, 'validateLogoutRequest').mockReturnValue({
            valid: false,
            cause: 'Refresh token missing',
        });

        await logout(req, res);

        expect(Validator.validateLogoutRequest).toHaveBeenCalledWith(req, null);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token missing' });
    });

    it('should return a 400 error if the refresh token in the cookies does not represent a user in the database', async () => {
        req.cookies = { refreshToken: 'invalid_token' };
        const userSpy = jest.spyOn(UserService, 'getUserByToken').mockReturnValue(null);

        await logout(req, res);

        expect(userSpy).toHaveBeenCalledWith('invalid_token');
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'User does not exist' });
    });

    it('should successfully logout the user', async () => {
        jest.spyOn(Validator, 'validateLogoutRequest').mockReturnValue({ valid: true });

        const userMock = { refreshToken: 'valid_token', save: jest.fn() };
        jest.spyOn(userMock, 'save');

        const userSpy = jest.spyOn(UserService, 'getUserByToken').mockReturnValue(userMock);

        req.cookies = { refreshToken: 'valid_token' };

        await logout(req, res);

        expect(Validator.validateLogoutRequest).toHaveBeenCalledWith(req, userMock);
        expect(userSpy).toHaveBeenCalledWith('valid_token');
        expect(res.cookie).toHaveBeenCalledTimes(2);
        expect(res.cookie).toHaveBeenCalledWith('accessToken', '', {
            httpOnly: true,
            path: '/api',
            maxAge: 0,
            sameSite: 'none',
            secure: true,
        });
        expect(res.cookie).toHaveBeenCalledWith('refreshToken', '', {
            httpOnly: true,
            path: '/api',
            maxAge: 0,
            sameSite: 'none',
            secure: true,
        });
        expect(userMock.refreshToken).toBeNull();
        expect(userMock.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ data: { message: 'logged out' }, refreshedTokenMessage: "" });
    });
});
