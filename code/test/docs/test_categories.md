## --CREATE CATEGORY:

| Criteria | Predicates |Boundaries |
| ---------| ------------------------------------------------- | ------------------------------------------------------------ |
|Admin      | exists , does not exist             |String, not null|
|Type  | exists , does not exist                |String, not null|
|Color   | exists , does not exist                |String, not null|

|Admin | Type | Color| Valid Invalid | Test Case|
|---|---|---|---|---|
|exists| exists| does not exist|invalid|(“admin1”,”investment”,”home”) —> error 400| (Category with this type exists already and there isn't "home" color)|
|exists| does not exist | does not exist|invalid|(“admin1”,"family"",”home”) —> error 400| (there isn't "home" color)|
|exists| exists | exists|invalid|(“admin1”,”investment”,”red”) —> error 400| (Category with this type exists already)|
|does not exist| exists | exists|invalid|(“pippo”,”investment”,"red") —> error 401| (Admin doesn't exist)|
|exists| exists | exists|valid|(“admin1”,”investment”,”red”) —> error 500| (Something went wrong)|
|exists| does not exist | exists|valid|(“admin1”,"family"",”home”) —> Category is created with type and color (200)|

## --UPDATE CATEGORIES:

| Criteria | Predicates |Boundaries |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Admin      | exists , does not exist             |String, not null|
|CurrentType  | exists , does not exist                |String, not null|
|NewType  | exists , does not exist                |String, not null|
|NewColor   | exists , does not exist                |String, not null|

|Admin |CurrentType | NewType | NewColor| Valid Invalid | Test Case|
|---|---|---|---|---|
|exists|exists| does not exist |exists|valid|(“admin1”,”investment”,"family"",”yellow”) —> Category is update with new type and color (200)|
|exists|exists| exists| does not exist|invalid|(“admin1”,”investment”,"family", ”home”) —> error 400| (Category with this type exists already and there isn't "home" color)|
|exists|exists| exists| exist|invalid|(“admin1”,”investment”,"family", ”home”) —> error 400| (Category with this type exists already
|exists|exists| does not exist| does not exist|invalid|(“admin1”,”investment”,"family", ”home”) —> error 400| (There isn't "home" color)|)|
|exists|does not exist|exists |exists|invalid|(“admin1”,”investment”,"family"",”yellow”) —> error 400| (Category with this current type does not exist)|
|exists| does not exist | does not exist|exists|invalid|(“admin1”,"family"",”home”) —> error 400| (Category with this current type does not exist)|
|exists|does not exist|exists |does not exist|invalid|(“admin1”,”investment”,"family"",”yellow”) —> error 400| (Category with this current type does not exist)|
|exists|does not exist|does not exist |does not exist|invalid|(“admin1”,”investment”,"family"",”yellow”) —> error 400| (Category with this current type does not exist)|
|does not exist| exists | exists|invalid|(“pippo”,”investment”,"red") —> error 401| (Admin doesn't exist)|
|exists| exists | does not exist|valid|(“admin1”,”investment”,”red”) —> error 500|(Something went wrong)|

## --GET CATEGORIES:

| Criteria | Predicates |Boundaries |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|User     | Admin, Regular           |String, not null|

|User| Valid Invalid| Test Case|
|---|---|---|
|Admin | valid |Login with admin account and then with that token perform getCategories —> list of category (200)|
|Regular| valid |Login with regular account and then with that token perform getCategories —> list of category (200)|

## --GET ALL TRANSACTIONS:

| Criteria | Predicates |Boundaries |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|User     | Admin, Regular           |String, not null|

|User| Valid Invalid| Test Case|
|---|---|---|
|Admin | valid |Login with admin account and then with that token perform getAllTransactions —> [ array of transactions (200)|
|Regular| invalid |Login with regular account and then with that token perform getAllTransactions —> unauthorized (401)|

## --GET TRANSACTIONS BY USER:

| Criteria | Predicates |Boundaries |
| -------- | ---------- | --------- |
|User  | exists and authorized, does not exist, not authorized, admin |String, not null|


|User | Valid Invalid| Test Case|
|-----|--------------|----------|
|Admin | valid |Login with ‘admin’, get transactions of user1 —> array of transactions (200)|
|exists and authorized| valid |Login with ‘user1’, get transactions of user1 —> array of transactions(200)|
|not authorized | invalid |Login with ‘user1’, get transactions of user2 —> unauthorized (401)|
|does not exist| invalid |Get transactions of ‘pippo’ —> error 400|

## --GET TRANSACTIONS BY USER BY CATEGORY:

| Criteria | Predicates |Boundaries |
| -------- | ---------- | --------- |
|User  | exists and authorized, does not exist, not authorized, admin |String, not null|
|Category  | exists, does not exist |String, not null|


|User | Category | Valid Invalid| Test Case|
|-----|----------| ------------ | -------- |
|Admin | exists |valid |Login with ‘admin’, T(‘user1’,’investment’) —> array of transactions(200)|
|exists and authorized| exists |valid |Login with ‘user1’, T(‘user1’,’investment’) —> array of transactions(200)|
|not authorized | exists |invalid |Login with ‘user1’, T(‘user2’,’investment’) —> unauthorized (401)|
|does not exist| exists |invalid |T(‘pippo’,’investment’) —> error 400|
|Admin | does not exist |invalid |Login with ‘admin’, T(‘user1’,’loan’) —> error 400|
|exists and authorized| does not exist |invalid |Login with ‘user1’, T(‘user1’,’loan’) —> error 400|
|not authorized | does not exist |invalid |Login with ‘user1’, T(‘user2’,’loan’) —> unauthorized (401)|
|does not exist| does not exist |invalid |T(‘pippo’,’loan’) —> error 400|


## --GET TRANSACTIONS BY GROUP:

| Criteria | Predicates |Boundaries |
| -------- | ---------- | --------- |
|User  | exists and authorized, does not exist, not authorized, admin |String, not null|
|Group  | exists, does not exist |String, not null|


|User | Category | Valid Invalid| Test Case|
|-----|----------| ------------ | -------- |
|Admin | exists |valid |Login with ‘admin’, T(‘user1’,'group1') —> array of transactions(200)|
|exists and authorized| exists |valid |Login with ‘user1’, T(‘user1’,’group1’) —> array of transactions(200)|
|not authorized | exists |invalid |Login with ‘user1’, T(‘user1’,’group2’) —> unauthorized (401)|
|does not exist| exists |invalid |T(‘pippo’,group1) —> error 400|
|Admin | does not exist |invalid |Login with ‘admin’, T(‘user1’,’group’) —> error 400|
|exists and authorized| does not exist |invalid |Login with ‘user1’, T(‘user1’,’group’) —> error 400|
|not authorized | does not exist |invalid |Login with ‘user1’, T(‘user1’,’group’) —> unauthorized (401)|
|does not exist| does not exist |invalid |T(‘pippo’,’group’) —> error 400|


## --GET TRANSACTIONS BY GROUP BY CATEGORY:

| Criteria | Predicates |Boundaries |
| -------- | ---------- | --------- |
|User  | exists and authorized, does not exist, not authorized, admin |String, not null|
|Group  | exists, does not exist |String, not null|
|Category  | exists, does not exist |String, not null|

|User                    | Group    | Category     | Valid Invalid| Test Case              |
|----------------------- |----------| ------------ | ------------ | ---------------------- |
|Admin                   | exists   | exists       |valid         |Login with ‘admin’, T(‘user1’,’group’,’investment’) —> array of transactions(200)|
|exists and authorized   | exists   | exists       |valid         |Login with ‘user1’, T(‘user1’,’group1’, ’investment’) —> array of transactions(200)|
|not authorized          | exists   | exists       |invalid       |Login with ‘user1’, T(‘user1’,’group2’) —> unauthorized (401)|
|does not exist          | exists   | exists       |invalid       |T(‘pippo’,’group1’,’investment’) —> error 400|
|Admin                   | does not exist| exists  |invalid       |Login with ‘admin’, T(‘user1’,’group’,’investment’) —> error 400|
|exists and authorized   | does not exist | exists |invalid       |Login with ‘user1’, T(‘user1’,’group’,’investment’) —> error 400|
|not authorized          | does not exist | exists |invalid       |Login with ‘user1’, T(‘user1’,’group’,’investment’) —> unauthorized (401)|
|does not exist          | does not exist | exists |invalid       |T(‘pippo’,’group’,’investment’) —> error 400|
|Admin                   | exists         | does not exist|invalid  |Login with ‘admin’, T(‘user1’,’group’,’loan’) —> error 400|
|exists and authorized   | exists         | does not exist|invalid  |Login with ‘user1’, T(‘user1’,’group’,’loan’) —> error 400|
|not authorized          | exists         | does not exist|invalid|Login with ‘user1’, T(‘user1’,’group’,’loan’) —> unauthorized (401)|
|does not exist          | exists         | does not exist|invalid|T(‘pippo’,’group’,’loan’) —> error 400|
|Admin                   | does not exist | does not exist|invalid|Login with ‘admin’, T(‘user1’,’group’,’loan’) —> error 400|
|exists and authorized   | does not exist | does not exist|invalid|Login with ‘user1’, T(‘user1’,’group’,’loan’) —> error 400|
|not authorized          | does not exist | does not exist|invalid|Login with ‘user1’, T(‘user1’,’group’,’loan’) —> unauthorized (401)|
|does not exist          | does not exist | does not exist|invalid|T(‘pippo’,’group’,’loan’) —> error 400|


## --DELETE TRANSACTION

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Username   | valid , invalid,             ||
|Access Rights     |         User, Admin                   ||
|Transaction    |         Exists, NotExists      ||


|Username               |Access Rights    | Group           | test                 |
|---|---|---|---| 
|valid| Admin   |Exists| Delete Transaction=> Success ||
|valid|          |Not Exists| Delete Transaction=> Error (transaction dose not exist)||
|Invalid|       |Exists| Delete Transaction=> error(unauthorized)||                                               ||
|valid| User |Exist|Delete Transaction=> Success  ||
|       |      |Not Exist|Delete Transaction=>Error (transaction dose not exist) ||
|Invalid|       |Exist| Delete user=> error(user not exist)||


## --DELETE TRANSACTIONS

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Transaction   | Exist , Not Exist(EVEN ONE)             ||
|Access Rights     |         User, Admin                   ||
|Transaction numbers    |         zero, one(atleast), many | 0, 1    ||


|Transaction             |Access Rights    | Group           | test                 |
|---|---|---|---| 
|Exist| Admin   |Zero| Delete Transaction=> Error(transaction dose not exist)||
|      |      |Many| Delete Transaction=> success||
|    |          |One| Delete Transaction=> success||
|Not Exits|       |one| Delete Transaction=> error(transaction dose not exist)|| 
|          |       |many| Delete Transaction(try to delete many which one of them is not Exists)=> error  (transaction dose not exist)||                                            
|Exist| User |Zero|Delete Transaction=> Error(transaction dose not exist)  ||
|       |      |One|Delete Transaction=> success ||
|       |      |Many|Delete Transaction=> success ||
|Not Exist|       |One| Delete Transaction=> error(transaction dose not exist)||
|         |       |Many| Delete Transaction(try to delete many which one of them is not Exists)=> error(transaction dose not exist)||





