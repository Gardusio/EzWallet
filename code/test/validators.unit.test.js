import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { validateLoginRequest, validateRegisterRequest, validateLogoutRequest } from "../validators/auth.validator.js"
import { validateStrings, validateEmail } from '../validators/utils.validator.js'

import * as UtilsValidator from "../validators/utils.validator.js"
import * as UserService from "../services/user.service.js";

beforeEach(() => {
    jest.restoreAllMocks()
})

/*************************************** VALIDATION ************************************************/
describe('validateStrings', () => {
    it('should return true if all strings are non-empty and not null', () => {
        const strings = ['abc', 'def', '123'];

        const result = validateStrings(strings);

        expect(result).toBe(true);
    });

    it('should return false if at least one string is empty', () => {
        const strings = ['abc', '', '123'];
        const result = validateStrings(strings);
        expect(result).toBe(false);
    });

    it('should return false if at least one string is null', () => {
        const strings = ['abc', null, '123'];

        const result = validateStrings(strings);

        expect(result).toBe(false);
    });

    it('should return false if at least one string is undefined', () => {
        const strings = ['abc', undefined, '123'];

        const result = validateStrings(strings);

        expect(result).toBe(false);
    });
});

describe('validateEmail', () => {
    it('should return true for a valid email', () => {
        const email = 'user@example.com';

        const result = validateEmail(email);

        expect(result).toBe(true);
    });

    it('should return false for an invalid email', () => {
        const email = 'invalid_email';

        const result = validateEmail(email);

        expect(result).toBe(false);
    });
});

describe('validateRegisterRequest', () => {
    it('should return invalid if missing information is provided', async () => {
        const request = { username: '', email: 'user@example.com', password: 'password' };

        const result = await validateRegisterRequest(request);

        expect(result).toEqual({ valid: false, cause: 'Missing informations' });
    });

    it('should return invalid if email is not valid', async () => {
        const request = { username: 'username', email: 'invalid_email', password: 'password' };

        const result = await validateRegisterRequest(request);

        expect(result).toEqual({ valid: false, cause: 'Email inserted is not valid' });
    });

    it('should return invalid if email is already in use', async () => {
        const request = { username: 'username', email: 'existing@example.com', password: 'password' };

        jest.spyOn(UserService, "getUserByEmail").mockReturnValue({ email: 'existing@example.com' });

        const result = await validateRegisterRequest(request);
        expect(result).toEqual({ valid: false, cause: 'Email inserted already in use' });
    });

    it('should return invalid if username is already in use', async () => {
        const request = { username: 'existing_username', email: 'user@example.com', password: 'password' };

        jest.spyOn(UserService, "getUserByEmail").mockReturnValue(null);
        jest.spyOn(UserService, "getUserByUsername").mockReturnValue({ username: 'existing_username' });

        const result = await validateRegisterRequest(request);
        expect(result).toEqual({ valid: false, cause: 'Username inserted already in use' });
    });

    it('should return valid if username is already in use', async () => {
        const request = { username: 'existing_username', email: 'user@example.com', password: 'password' };

        jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)
        jest.spyOn(UtilsValidator, "validateEmail").mockReturnValue(true)
        jest.spyOn(UserService, "getUserByEmail").mockReturnValue(null);
        jest.spyOn(UserService, "getUserByUsername").mockReturnValue(null);

        const result = await validateRegisterRequest(request);
        expect(result).toEqual({ valid: true });
    });
});

describe('validateLoginRequest', () => {

    it('should return invalid if invalid credentials are provided', async () => {
        const request = { email: "invalid", password: 'pwd' };
        jest.spyOn(UtilsValidator, "validateEmail").mockReturnValue(false)

        const result = await validateLoginRequest(request);

        expect(result).toEqual({ valid: false, cause: 'Invalid credentials' });
    });

    it('should return invalid if user does not exist', async () => {
        const request = { email: 'nonexistent@example.com', password: 'password' };
        const spy = jest.spyOn(UtilsValidator, "validateStrings").mockReturnValue(true)
        //const spys = jest.spyOn(UtilsValidator, "validateEmail").mockReturnValue(true)

        const result = await validateLoginRequest(request, null);
        expect(spy).toHaveBeenCalledWith(["nonexistent@example.com", "password"])
        //expect(spys).toHaveBeenCalledWith("nonexistent@example.com")
        expect(result).toEqual({ valid: false, cause: 'User does not exist' });
    });

    it('should return invalid if wrong password is provided', async () => {
        const request = { email: 'user@example.com', password: 'wrong_password' };
        const callingUser = { password: 'correct_password' };

        const result = await validateLoginRequest(request, callingUser)
        expect(result).toEqual({ valid: false, cause: 'Wrong credentials' })
    })

    it('should return valid if password matches', async () => {
        const request = { email: 'user@gmail.com', password: 'pwd' };
        const callingUser = { email: 'user@gmail.com', password: 'hashedPwd' };
        const spy = jest.spyOn(bcrypt, "compare").mockReturnValue(true)

        const result = await validateLoginRequest(request, callingUser)
        expect(result).toEqual({ valid: true })
    })
});

describe('validateLogoutRequest', () => {

    it('should return invalid if no refresh token is provided', async () => {
        const request = { cookies: {} };

        const result = await validateLogoutRequest(request);

        expect(result).toEqual({ valid: false, cause: 'Refresh token missing' });
    });

    it('should return invalid if user does not exist', async () => {
        const request = { cookies: { refreshToken: 'invalid_token' } };

        jest.spyOn(UserService, "getUserByToken").mockReturnValue(null);

        const result = await validateLogoutRequest(request, null);

        expect(result).toEqual({ valid: false, cause: 'User does not exist' });
    });


    it('should return valid if user exists with refresh token', async () => {
        const request = { cookies: { refreshToken: 'validToken' } };
        const user = {
            username: "fabio"
        }
        jest.spyOn(User, "findOne").mockReturnValue(user);

        const result = await validateLogoutRequest(request, user);

        expect(result.valid).toEqual(true);
    })
});
