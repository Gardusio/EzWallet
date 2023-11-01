import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { serverSideError, ok, badRequest } from "../services/http.service.js";
import { validateRegisterRequest, validateLoginRequest, validateLogoutRequest } from "../validators/auth.validator.js"
import { createUser, getUserByEmail, getUserByToken } from "../services/user.service.js";

/**
    - Request Parameters: None
    - Request Body Content: An object having attributes `username`, `email` and `password`
        - Example: `{username: "Mario", email: "mario.red@email.com", password: "securePass"}`
    - Response `data` Content: A message confirming successful insertion
        - Example: `res.status(200).json({data: {message: "User added successfully"}})`
    - Returns a 400 error if the request body does not contain all the necessary attributes
    - Returns a 400 error if at least one of the parameters in the request body is an empty string
    - Returns a 400 error if the email in the request body is not in a valid email format
    - Returns a 400 error if the username in the request body identifies an already existing user
    - Returns a 400 error if the email in the request body identifies an already existing user
*/
export const register = async (req, res) => {
    try {
        const { valid, cause } = await validateRegisterRequest(req.body)
        if (!valid) return badRequest(res, cause)

        const { username, email, password } = req.body

        const hashedPassword = await bcrypt.hash(password, 12)
        await createUser({
            username,
            email,
            password: hashedPassword,
        })
        return ok(res, { message: "User added successfully" })
    } catch (err) {
        return serverSideError(res, err)
    }
};

/**
- Request Parameters: None
- Request Body Content: An object having attributes `username`, `email` and `password`
  - Example: `{username: "admin", email: "admin@email.com", password: "securePass"}`
- Response `data` Content: A message confirming successful insertion
  - Example: `res.status(200).json({data: {message: "User added successfully"}})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the email in the request body is not in a valid email format
- Returns a 400 error if the username in the request body identifies an already existing user
- Returns a 400 error if the email in the request body identifies an already existing user
*/
export const registerAdmin = async (req, res) => {
    try {
        const { valid, cause } = await validateRegisterRequest(req.body)
        if (!valid) return badRequest(res, cause)

        const { username, email, password } = req.body

        const hashedPassword = await bcrypt.hash(password, 12)

        await createUser({
            username,
            email,
            password: hashedPassword,
            role: "Admin"
        });
        return ok(res, { message: "Admin added successfully" })
    } catch (err) {
        return serverSideError(res, err)
    }
}

/**
- Request Parameters: None
- Request Body Content: An object having attributes `email` and `password`
  - Example: `{email: "mario.red@email.com", password: "securePass"}`
- Response `data` Content: An object with the created accessToken and refreshToken
  - Example: `res.status(200).json({data: {accessToken: accessToken, refreshToken: refreshToken}})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the email in the request body is not in a valid email format
- Returns a 400 error if the email in the request body does not identify a user in the database
- Returns a 400 error if the supplied password does not match with the one in the database
 */
export const login = async (req, res) => {
    try {
        // VALIDATE REQUEST
        const callingUser = await getUserByEmail(req.body.email)
        const { valid, cause } = await validateLoginRequest(req.body, callingUser)
        if (!valid) return badRequest(res, cause)

        //CREATE ACCESSTOKEN
        const accessToken = jwt.sign({
            email: callingUser.email,
            id: callingUser.id,
            username: callingUser.username,
            role: callingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '1h' })

        //CREATE REFRESH TOKEN
        const refreshToken = jwt.sign({
            email: callingUser.email,
            id: callingUser.id,
            username: callingUser.username,
            role: callingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '7d' })

        //SAVE REFRESH TOKEN TO DB
        callingUser.refreshToken = refreshToken
        await callingUser.save()

        // SET COOKIES
        res.cookie("accessToken", accessToken, { httpOnly: true, domain: "localhost", path: "/api", maxAge: 60 * 60 * 1000, sameSite: "none", secure: true })
        res.cookie('refreshToken', refreshToken, { httpOnly: true, domain: "localhost", path: '/api', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })

        return ok(res, { accessToken: accessToken, refreshToken: refreshToken })
    } catch (error) {
        return serverSideError(res, error)
    }
}

/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: A message confirming successful logout
  - Example: `res.status(200).json({data: {message: "User logged out"}})`
- Returns a 400 error if the request does not have a refresh token in the cookies
- Returns a 400 error if the refresh token in the request's cookies does not represent a user in the database
 */
export const logout = async (req, res) => {
    try {
        const callingUser = await getUserByToken(req.cookies.refreshToken)
        const { valid, cause } = await validateLogoutRequest(req, callingUser)
        if (!valid) return badRequest(res, cause)

        callingUser.refreshToken = null
        res.cookie("accessToken", "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true })
        res.cookie('refreshToken', "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true })

        await callingUser.save()

        return ok(res, { message: "logged out" })
    } catch (error) {
        return serverSideError(res, error)
    }
}
