# Test Report

<The goal of this document is to explain how the application was tested, detailing how the test cases were defined and what they cover>

# Contents

- [Test Report](#test-report)
- [Contents](#contents)
- [Dependency graph](#dependency-graph)
- [Integration approach](#integration-approach)
- [Tests](#tests)
- [Coverage](#coverage)
  - [Coverage of FR](#coverage-of-fr)
  - [Coverage white box](#coverage-white-box)

# Dependency graph

    `<report the here the dependency graph of EzWallet>`

# Integration approach

    <Write here the integration sequence you adopted, in general terms (top down, bottom up, mixed) and as sequence
    (ex: step1: unit A, step 2: unit A+B, step 3: unit A+B+C, etc)>
    <Some steps may  correspond to unit testing (ex step1 in ex above)>
    <One step will  correspond to API testing, or testing unit route.js>

# Tests

   <in the table below list the test cases defined For each test report the object tested, the test level (API, integration, unit) and the technique used to define the test case  (BB/ eq partitioning, BB/ boundary, WB/ statement coverage, etc)>   `<split the table if needed>`

| Test case name                                                                                                           | Object(s) tested      | Test level | Technique used |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------- | -------------- |
|                                                                                                                          |                       |            |                |
| Token both valid and belong to the requested user                                                                        | verifyAuth            | Unit       | WB             |
| Undefined tokens                                                                                                         | verifyAuth            | Unit       | WB             |
| Access token expired and refresh token belonging to the requested user                                                   | verifyAuth            | Unit       | WB             |
| Access token and refresh token are both invalid                                                                          | verifyAuth            | Unit       | WB             |
| Token both valid and belong to the requested admin                                                                       | verifyAuth            | Unit       | WB             |
| Uncomplete access token                                                                                                  | verifyAuth            | Unit       | WB             |
| Uncomplete refresh token                                                                                                 | verifyAuth            | Unit       | WB             |
| Mismatched accessTokenUser and refreshTokenUser                                                                          | verifyAuth            | Unit       | WB             |
| Tokens are both valid and simple authentication is required                                                              | verifyAuth            | Unit       | WB             |
| Tokens are both valid, Mismatched (accessTokenUser or refreshTokenUser) and Username and user authentication is required | verifyAuth            | Unit       | WB             |
| Tokens are both valid, but One (or both) of tokens doesn't have Admin role when performing Admin auth                    | verifyAuth            | Unit       | WB             |
| Tokens are both valid, but the user doesn't belong to the group                                                          | verifyAuth            | Unit       | WB             |
| Both tokens have an email that belongs to the requested group                                                            | verifyAuth            | Unit       | WB             |
| Invalid authorization required                                                                                           | verifyAuth            | Unit       | WB             |
| Access token expired and refresh token belonging to the requested user, simple authentication required                   | verifyAuth            | Unit       | WB             |
| Admin authentication required, Access token expired and refresh token  belonging to an Admin                            | verifyAuth            | Unit       | WB             |
| Admin authentication required, Access token expired and refresh token not belonging to an Admin                          | verifyAuth            | Unit       | WB             |
| User authentication required, Access token expired and refresh token not belonging to same User                          | verifyAuth            | Unit       | WB             |
| Group authentication required, Access token expired and refresh token belonging to a user in the group                   | verifyAuth            | Unit       | WB             |
| Group authentication required, Access token expired and refresh token not belonging to a user in the group               | verifyAuth            | Unit       | WB             |
| Access token and refresh token expired                                                                                   | verifyAuth            | Unit       | WB             |
| Admin: should return empty list if there are no users                                                                    | getUsers              | Unit       | WB             |
| User access empty list :  should return an Error                                                                         | getUsers              | Unit       | WB             |
| Admin: should retrieve list of all users                                                                                 | getUsers              | Unit       | WB             |
| User access to other user, error                                                                                         | getUser               | Unit       | WB             |
| Admin access to other user, retrieve data                                                                                | getUser               | Unit       | WB             |
| User access to him, retrieve data                                                                                        | getUser               | Unit       | WB             |
| Admin access to unknown user, error                                                                                      | getUser               | Unit       | WB             |
| Admin delete a user unknown, error                                                                                       | deleteUser            | Unit       | WB             |
| Admin delete an incorrect email, error                                                                                   | deleteUser            | Unit       | WB             |
| Admin delete a user alone in a group,give data                                                                           | deleteUser            | Unit       | WB             |
| Register with username and email valid, succeed                                                                          | register              | Unit       | WB             |
| Register with username valid and email not valid, error                                                                  | register              | Unit       | WB             |
| Register with username notvalid and email valid, error                                                                   | register              | Unit       | WB             |
| Register with email incorrect                                                                                            | register              | Unit       | WB             |
| Register with name empty,error                                                                                           | register              | Unit       | WB             |
| Register with username and email unique, succeed                                                                         | registerAdmin         | Unit       | WB             |
| Register with username unique and email multiple, error                                                                  | registerAdmin         | Unit       | WB             |
| Register with username multiple and email unique, error                                                                  | registerAdmin         | Unit       | WB             |
| Register with email incorrect                                                                                            | registerAdmin         | Unit       | WB             |
| Register with name empty, error                                                                                          | registerAdmin         | Unit       | WB             |
| login with userEmail valid and password correct, succeed                                                                 | login                 | Unit       | WB             |
| login with userEmail not valid and password wrong, error                                                                 | login                 | Unit       | WB             |
| login with userEmail valid and password wrong, error                                                                     | login                 | Unit       | WB             |
| logout with refreshToken correct, succeed                                                                                | logout                | Unit       | WB             |
| logout with refreshToken empty, error                                                                                    | logout                | Unit       | WB             |
| logout with refreToken unknown, error                                                                                    | logout                | Unit       | WB             |
|                                                                                                                          |                       |            |                |
| authentication fails, unauthorized                                                                                       | createTransaction     | Unit       | WB             |
| username not inserted inside the body                                                                                    | createTransaction     | Unit       | WB             |
| category type not inserted inside the body                                                                               | createTransaction     | Unit       | WB             |
| amount not inserted inside the body                                                                                      | createTransaction     | Unit       | WB             |
| user with whom to associate the transaction does not exist                                                               | createTransaction     | Unit       | WB             |
| category type with which to associate the transaction does not exist                                                    | createTransaction     | Unit       | WB             |
| server error while creating the transaction                                                                              | createTransaction     | Unit       | WB             |
| transaction saved correctly                                                                                              | createTransaction     | Unit       | WB             |
| authentication fails, unauthorized                                                                                      | getTransactions       | Unit       | WB             |
| all the transactions stored are displayed correctly                                                                      | getTransactions       | Unit       | WB             |
| server error while displaying the transactions                                                                           | getTransactions       | Unit       | WB             |
| authentication fails, unauthorized                                                                                       | getTransactionsByUser | Unit       | WB             |
| user specified does not exist                                                                                            | getTransactionsByUser | Unit       | WB             |
| all the transactions stored are displayed correctly                                                                      | getTransactionsByUser | Unit       | WB             |
| server error while displaying the transactions                                                                           | getTransactionsByUser | Unit       | WB             |
| regular user get transactions with filters                                                                               | getTransactionsByUser | Unit       | WB             |
| admin does not get transactions with filter                                                                              | getTransactionsByUser | Unit       | WB             |
|                                                                                                                          |                       |            |                |

# Coverage

## Coverage of FR

<Report in the following table the coverage of  functional requirements (from official requirements) >

| Functional Requirements covered | Test(s) |
| ------------------------------- | ------- |
| FRx                             |         |
| FRy                             |         |
| ...                             |         |

## Coverage white box

Report here the screenshot of coverage values obtained with jest-- coverage
