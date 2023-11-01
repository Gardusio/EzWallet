import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import {
    verifyAuth, verifySharedAuth,
    handleDateFilterParams, handleAmountFilterParams, BadFilteringError
} from '../controllers/utils.js'

import { AuthorizedTokenData, UnAuthorizedTokenData, AuthStatus, AUTH_TYPE } from "../services/auth.service.js"


import * as auth from "../services/auth.service.js"
import * as utils from '../controllers/utils.js'

beforeEach(() => {
    jest.restoreAllMocks()
})

describe('handleDateFilterParams', () => {
    it('should return an empty object if no query parameters are provided', () => {
        const query = null;
        const result = handleDateFilterParams(query);
        expect(result).toEqual({});
    });

    it('should throw an error if `date` is used with `from` or `upTo`', () => {
        const query = {
            date: '2023-05-01',
            from: '2023-05-01',
        };
        expect(() => {
            handleDateFilterParams(query);
        }).toThrow(BadFilteringError);
    });

    it('should return a date filter object with `$gte` and `$lte` if `date` is provided', () => {
        const day = new Date('2023-05-01')
        const query = {
            date: '2023-05-01',
        };
        const result = handleDateFilterParams(query);
        const expected = {
            date: {
                $gte: day,
                $lte: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
            },
        };
        expect(result).toEqual(expected);
    });

    it('should return a date filter object with `$gte` property if `from` is provided', () => {
        const query = {
            from: '2023-05-01',
        };
        const result = handleDateFilterParams(query);
        const expected = {
            date: {
                $gte: new Date('2023-05-01'),
            },
        };
        expect(result).toEqual(expected);
    });

    it('should return a date filter object with `$lte` property if `upTo` is provided', () => {
        const query = {
            upTo: '2023-05-01',
        };
        const result = handleDateFilterParams(query);
        const expected = {
            date: {
                $lte: new Date('2023-05-01'),
            },
        };
        expect(result).toEqual(expected);
    });
});

describe('handleAmountFilterParams', () => {
    it('should return an empty object if no query parameters are provided', () => {
        const query = null;
        const result = handleAmountFilterParams(query);
        expect(result).toEqual({});
    });

    it('should return an amount filter object with `$gte` property if `min` is provided', () => {
        const query = {
            min: '100',
        };
        const result = handleAmountFilterParams(query);
        const expected = {
            amount: {
                $gte: 100,
            },
        };
        expect(result).toEqual(expected);
    });

    it('should return an amount filter object with `$lte` property if `max` is provided', () => {
        const query = {
            max: '500',
        };
        const result = handleAmountFilterParams(query);
        const expected = {
            amount: {
                $lte: 500,
            },
        };
        expect(result).toEqual(expected);
    });

    it('should return an amount filter object with both `$gte` and `$lte` properties if both `min` and `max` are provided', () => {
        const query = {
            min: '100',
            max: '500',
        };
        const result = handleAmountFilterParams(query);
        const expected = {
            amount: {
                $gte: 100,
                $lte: 500,
            },
        };
        expect(result).toEqual(expected);
    });
});


/*********************** AUTHORIZATION ***********************************/
dotenv.config()

/* Some usefull constants to test tokens */
const res = {
    cookie: jest.fn(),
    locals: {}
}

const req = {
    cookie: jest.fn(),
}

const mockedValidToken = {
    username: 'testuser',
    email: 'testuser@example.com',
    role: 'user'
}
const mockedIat = 0
const mockedValidEncoded = jwt.sign(mockedValidToken, process.env.ACCESS_KEY)
const mockedExpiredEncoded = jwt.sign(mockedValidToken, process.env.ACCESS_KEY, { expiresIn: '0s' })

describe("tokenMissingInformations", () => {

    it('returns true if decoded access token is missing username', () => {
        const missingUsername = {
            ...mockedValidToken,
            username: undefined
        }
        expect(auth.tokenMissingInformations(missingUsername, mockedValidToken)).toBe(true)
    })

    it('returns true if decoded access token is missing email', () => {
        const missingEmail = {
            ...mockedValidToken,
            email: undefined
        }
        expect(auth.tokenMissingInformations(missingEmail, mockedValidToken)).toBe(true)
    })

    it('returns true if decoded access token is missing role', () => {
        const missingRole = {
            ...mockedValidToken,
            role: undefined
        }

        expect(auth.tokenMissingInformations(missingRole, mockedValidToken)).toBe(true)
    })

    it('returns true if decoded refresh token is missing username', () => {
        const missingUsername = {
            ...mockedValidToken,
            username: undefined
        }

        expect(auth.tokenMissingInformations(mockedValidToken, missingUsername)).toBe(true)
    })

    it('returns true if decoded refresh token is missing email', () => {
        const missingEmail = {
            ...mockedValidToken,
            email: undefined
        }
        expect(auth.tokenMissingInformations(mockedValidToken, missingEmail)).toBe(true)
    })

    it('returns true if decoded refresh token is missing role', () => {
        const missingRole = {
            ...mockedValidToken,
            role: undefined
        }

        expect(auth.tokenMissingInformations(mockedValidToken, missingRole)).toBe(true)
    })

    it('returns false if both decoded tokens have all required information', () => {
        expect(auth.tokenMissingInformations(mockedValidToken, mockedValidToken)).toBe(false)
    })

})

describe('tokensMismatch', () => {
    it('returns false when tokens match', () => {
        const result = auth.tokensMismatch(mockedValidToken, mockedValidToken)
        expect(result).toBe(false)
    })

    it('returns true when username mismatches', () => {
        const decodedAccessToken = {
            ...mockedValidToken,
            username: 'john.doe'
        }
        const result = auth.tokensMismatch(decodedAccessToken, mockedValidToken)
        expect(result).toBe(true)
    })

    it('returns true when email mismatches', () => {
        const decodedAccessToken = {
            ...mockedValidToken,
            email: 'john.doe@example.com'
        }
        const result = auth.tokensMismatch(decodedAccessToken, mockedValidToken)
        expect(result).toBe(true)
    })

    it('returns true when role mismatches', () => {
        const decodedAccessToken = {
            ...mockedValidToken,
            role: 'admin'
        }
        const result = auth.tokensMismatch(decodedAccessToken, mockedValidToken)
        expect(result).toBe(true)
    })

    it('returns true when multiple fields mismatch', () => {
        const decodedAccessToken = {
            username: 'john.doe',
            email: 'john.doe@example.com',
            role: 'admin',
        }
        const result = auth.tokensMismatch(decodedAccessToken, mockedValidToken)
        expect(result).toBe(true)
    })
})

describe('refreshCookies', () => {
    afterAll(() => {
        jest.restoreAllMocks()
    })

    it('should generate a new access token and set the cookie', () => {
        const now = Date.now()

        auth.refreshCookies(res, mockedValidToken)

        expect(res.cookie).toHaveBeenCalledTimes(1)

        expect(res.cookie).toHaveBeenCalledWith('accessToken', expect.any(String), { httpOnly: true, path: '/api', maxAge: 60 * 60 * 1000, sameSite: 'none', secure: true })

        expect(jwt.verify(res.cookie.mock.calls[0][1], process.env.ACCESS_KEY)).toEqual({
            username: mockedValidToken.username,
            email: mockedValidToken.email,
            role: mockedValidToken.role,
            iat: Math.floor(now / 1000),
            exp: Math.floor(now / 1000) + (60 * 60)
        })
    })

    it('should set a message in res.locals', () => {
        auth.refreshCookies(res, mockedValidToken)
        expect(res.locals.refreshedTokenMessage).toBe("Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls")
    })
})

describe('decode', () => {
    it('returns decoded token and expired status as false for a valid token', () => {
        const result = auth.decode(mockedValidEncoded)
        expect({ ...result.token, iat: mockedIat }).toEqual({ ...mockedValidToken, iat: mockedIat })
        expect(result.expired).toBe(false)
    })

    it('returns decoded token and expired status as true for an expired token', async () => {
        const result = auth.decode(mockedExpiredEncoded)
        expect(result).toEqual({ token: jwt.decode(mockedExpiredEncoded, process.env.ACCESS_KEY), expired: true })
    })

    it('returns expired status as false and error message for other JWT errors', async () => {
        const invalidToken = 'invalidToken'
        const result = auth.decode(invalidToken)
        expect(result).toEqual({ expired: false, message: "JsonWebTokenError" })
    })
})

describe('tokenAuthorize ', () => {

    it('should return AuthorizedTokenData object for valid tokens', () => {
        const cookies = {
            accessToken: mockedValidEncoded,
            refreshToken: mockedValidEncoded
        }
        const result = auth.tokenAuthorize(cookies)
        expect(result).toBeInstanceOf(AuthorizedTokenData)
        expect(result.authorized).toBe(true)
        expect({ ...result.token, iat: mockedIat }).toEqual({ ...mockedValidToken, iat: mockedIat })
    })

    it('should return UnauthorizedTokenData object for missing tokens', () => {
        const cookies = {}

        const result = auth.tokenAuthorize(cookies)
        expect(result).toBeInstanceOf(UnAuthorizedTokenData)
        expect(result.authorized).toBe(false)
        expect(result.message).toEqual("Unauthorized")
    })

    it('should returns UnauthorizedTokenData object for token missing informations', () => {
        const cookies = {
            accessToken: "invalidToken",
            refreshToken: mockedValidEncoded
        }
        const decodeSpy = jest.spyOn(auth, 'decode').mockReturnValue({ token: "token", expired: false })
        const tokenMissingSpy = jest.spyOn(auth, 'tokenMissingInformations').mockImplementation(() => true);

        const result = auth.tokenAuthorize(cookies)

        expect(tokenMissingSpy).toHaveBeenCalled()
        expect(decodeSpy).toHaveBeenCalled()
        expect(result).toBeInstanceOf(UnAuthorizedTokenData)
        expect(result.authorized).toBe(false)
        expect(result.message).toEqual("Token is missing information")
    })

    it('should returns UnauthorizedTokenData object for token mismatching', () => {
        const cookies = {
            accessToken: "mismatchingToken",
            refreshToken: mockedValidEncoded
        }

        const decodeSpy = jest.spyOn(auth, 'decode').mockReturnValue({ token: "token", expired: false })
        const tokenMissingSpy = jest.spyOn(auth, 'tokenMissingInformations').mockReturnValue(false);
        const tokenMismatchSpy = jest.spyOn(auth, 'tokensMismatch').mockReturnValue(true);

        const result = auth.tokenAuthorize(cookies)

        expect(decodeSpy).toHaveBeenCalled()
        expect(tokenMissingSpy).toHaveBeenCalled()
        expect(tokenMismatchSpy).toHaveBeenCalled()
        expect(result).toBeInstanceOf(UnAuthorizedTokenData)
        expect(result.authorized).toBe(false)
        expect(result.message).toEqual("Mismatched users")
    })

    it('should returns UnauthorizedTokenData object for invalid refresh token', () => {
        const cookies = {
            accessToken: mockedValidEncoded,
            refreshToken: "invalidToken"
        }

        const decodeSpy = jest.spyOn(auth, 'decode').mockReturnValue({ token: "expiredToken", expired: true, message: "JsonWebTokenError" })

        const result = auth.tokenAuthorize(cookies)

        expect(decodeSpy).toHaveBeenCalled()
        expect(result).toBeInstanceOf(UnAuthorizedTokenData)
        expect(result.authorized).toBe(false)
        expect(result.message).toEqual("JsonWebTokenError")
    })

    it('should returns AuthorizedTokenData object for expired access and valid refresh', () => {
        const cookies = {
            accessToken: mockedExpiredEncoded,
            refreshToken: mockedValidEncoded
        }
        const decodeSpy = jest.spyOn(auth, 'decode').mockReturnValueOnce({ token: mockedValidToken, expired: true })
        const decodeSpyRefresh = jest.spyOn(auth, 'decode').mockReturnValueOnce({ token: mockedValidToken, expired: false })
        const tokenMissingSpy = jest.spyOn(auth, 'tokenMissingInformations').mockReturnValue(false);
        const tokenMismatchSpy = jest.spyOn(auth, 'tokensMismatch').mockReturnValue(false);

        const result = auth.tokenAuthorize(cookies)

        expect(decodeSpy).toHaveBeenCalled()
        expect(decodeSpyRefresh).toHaveBeenCalled()
        expect(tokenMismatchSpy).toHaveBeenCalled()
        expect(tokenMissingSpy).toHaveBeenCalled()

        expect(result).toBeInstanceOf(AuthorizedTokenData)
        expect(result.authorized).toBe(true)
        expect(result.refresh).toBe(true)
        expect({ ...result.token, iat: mockedIat }).toEqual({ ...mockedValidToken, iat: mockedIat })
    })

    it('should returns UnauthorizedTokenData object for expired tokens', () => {
        const cookies = {
            accessToken: mockedExpiredEncoded,
            refreshToken: mockedExpiredEncoded
        }
        const decodeSpy = jest.spyOn(auth, "decode").mockImplementation(() => ({ token: mockedValidToken, expired: true }))

        const tokensMismatchSpy = jest.spyOn(auth, "tokensMismatch").mockReturnValue(false)
        const tokenMissingInformationsSpy = jest.spyOn(auth, "tokenMissingInformations").mockReturnValue(false)
        const result = auth.tokenAuthorize(cookies)

        expect(decodeSpy).toHaveBeenCalledTimes(2)
        expect(tokensMismatchSpy).toHaveBeenCalled()
        expect(tokenMissingInformationsSpy).toHaveBeenCalled()
        expect(result).toBeInstanceOf(UnAuthorizedTokenData)
        expect(result.authorized).toBe(false)
        expect(result.message).toEqual("Perform login again")
    })

})

describe('authorizeAdmin', () => {
    it('returns Authorized status if the user is an admin', () => {
        const adminToken = {
            role: AUTH_TYPE.ADMIN,
        }

        const result = auth.authorizeAdmin(adminToken)

        expect(result.success).toBe(true)
        expect(result.message).toBeUndefined()
    })

    it('returns Unauthorized status if the user is not an admin', () => {
        const userToken = {
            role: 'User',
        }

        const result = auth.authorizeAdmin(userToken)

        expect(result.success).toBe(false)
        expect(result.message).toBe('Not an Admin')
    })
})

describe('authorizeUser', () => {
    it('returns true with "Authorized" message when token username matches requested username', () => {
        const username = mockedValidToken.username

        const result = auth.authorizeUser(mockedValidToken, username)

        expect(result).toBeInstanceOf(AuthStatus)
        expect(result.success).toBe(true)
        expect(result.message).toBe('Authorized')
    })

    it('returns false with "Usernames mismatch" message when token username does not match requested username', () => {
        const username = 'anotheruser'

        const result = auth.authorizeUser(mockedValidToken, username)

        expect(result).toBeInstanceOf(AuthStatus)
        expect(result.success).toBe(false)
        expect(result.message).toBe('Usernames mismatch')
    })
})

describe('authorizeGroup', () => {

    it('returns true when token email matches a member in the required group', async () => {
        const result = await auth.authorizeGroup(mockedValidToken, [mockedValidToken.email])

        expect(result).toBeInstanceOf(AuthStatus)
        expect(result.success).toBe(true)
    })

    it("returns false with \"You can't access this group\" message when token email doesn't match any member in the required group", async () => {
        const result = await auth.authorizeGroup(mockedValidToken, ["differentUser"])

        expect(result).toBeInstanceOf(AuthStatus)
        expect(result.success).toBe(false)
        expect(result.message).toBe("You can't access this group")
    })
})

describe('authorize', () => {

    it('should call refreshCookies if token authorized and to be refreshed', () => {
        const req = {
            cookies: {}
        }

        const tokenAuthorizeSpy = jest.spyOn(auth, 'tokenAuthorize').mockReturnValue({
            token: mockedValidEncoded,
            authorized: true,
            refresh: true
        })
        const refreshCookiesSpy = jest.spyOn(auth, 'refreshCookies').mockImplementation(jest.fn())
        auth.authorize(req, res, AUTH_TYPE.SIMPLE)
        expect(tokenAuthorizeSpy).toHaveBeenCalled()
        expect(refreshCookiesSpy).toHaveBeenCalled()
    })

    it('should return AuthStatus(false, message) if token are not authorized', () => {
        const req = {
            cookies: {
                accessToken: "anyInvalid",
                refreshToken: "anyInvalid"
            }
        }
        const tokenAuthorizeSpy = jest.spyOn(auth, 'tokenAuthorize').mockReturnValue({
            token: "anyInvalid",
            authorized: false,
            refresh: false
        })
        const result = auth.authorize(req, res, AUTH_TYPE.SIMPLE)
        expect(tokenAuthorizeSpy).toHaveBeenCalled()
        expect(result).toBeInstanceOf(AuthStatus)
        expect(result.success).toBe(false)
    })
})

describe('verifyAuth', () => {

    const info = { authType: "anyType" }

    it('should return true if authorization is successful', async () => {
        const authorizeMock = jest.spyOn(auth, 'authorize').mockReturnValue(new AuthStatus(true));

        const result = verifyAuth({}, res, info);

        expect(result.authorized).toBe(true)
        expect(authorizeMock).toHaveBeenCalledWith({}, res, info);
    });

    it('should return false if authorization is not succesfull', async () => {

        const authorizeMock = jest.spyOn(auth, 'authorize').mockReturnValue(new AuthStatus(false));
        const result = verifyAuth({}, res, info);

        expect(result.authorized).toBe(false)
        expect(result.cause).toBe("Unauthorized");
        expect(authorizeMock).toHaveBeenCalledWith({}, res, info);
    });

});

describe('verifySharedAuth', () => {

    const info = { authType: "anyType" }

    it('should return false if not typeAuthorized nor adminAuthorized', async () => {
        const verifySpy = jest.spyOn(utils, 'verifyAuth').mockImplementation(() => ({ authorized: false, cause: "error" }))

        const result = verifySharedAuth(req, res, info)

        expect(verifySpy).toHaveBeenCalledTimes(2)
        expect(result.authorized).toBe(false)
        expect(result.cause).toBe("error")
    })

    it('should return true if typeAuthorized', async () => {
        const verifySpy = jest.spyOn(utils, 'verifyAuth').mockReturnValue({ authorized: true, cause: 'Authorized' })
        const result = verifySharedAuth(req, res, info)

        expect(verifySpy).not.toHaveBeenCalledWith(req, res, { authType: AUTH_TYPE.ADMIN });
        expect(result.authorized).toBe(true)
        expect(result.cause).toBe("Authorized")
    })

    it('should return true if adminAuthorized', async () => {
        const verifySpy = jest.spyOn(utils, 'verifyAuth')

        verifySpy.mockReturnValueOnce({ authorized: false, cause: 'Unauthorized' });
        verifySpy.mockReturnValueOnce({ authorized: true, cause: 'Authorized' });

        const result = verifySharedAuth(req, res, info)

        expect(verifySpy).toHaveBeenCalledTimes(2)
        expect(verifySpy).toHaveBeenCalledWith(req, res, { authType: AUTH_TYPE.ADMIN });
        expect(result.authorized).toBe(true)
        expect(result.cause).toBe("Authorized")
    })
});