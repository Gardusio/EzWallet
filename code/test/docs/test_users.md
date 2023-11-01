## --GET USERS

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Number of Usres      | non , many             ||
|Access Rights    |     User, Admin                  ||


|Number of Users              |Access Rights                | test                 |
|---|---|---|
|non   | Admin| GET USER=>[]||
|non    | User | NOT POSSIBLE||
|Many  | ADMIN |GET USER=>[ARRY OF DATA] ||
|Many   | User | NOT POSSIBLE||





## --GET USER
| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Username      | main user, present (not main one),absent           ||
|Access Rights    |     User, Admin                  ||


|Username              |Access Rights                | test                 |
|---|---|---|
|main user| Admin| GET USER=>[list of data of main user]||
|main user   | User |GET USER=>[list of data of main user]||
|present (not main one)| Admin| GET USER=>[list of data]||
|present (not main one)    | User |GET USER=>NOT POSSIBLE ||
|absent | ADMIN |GET USER=>NOT POSSIBLE ||
|absent   | User |GET USER=>(error (401))user not found |



## --DELETE_USER
|----------|
*THE ADMIN CAN NOT DELETE HIMSELF*
*IF THE PERSON WHO DELETED WAS THE LAST ONE IN THE GROUP , DELETE THAT GROUP*

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Email     | valid , invalid, other person             ||
|Access Rights     |         User, Admin                   ||
|Group     |         Alone, Many, Non            ||


|Email               |Access Rights    | Group           | test                 |
|---|---|---|---| 
|valid| Admin   |Alone| Delete user=> error ||
|     |         |Many|Delete user=> Delete transaction & Delete from group ||
|       |         |Non| Delete user=> Delete transaction||
|Invalid|       |Alone| Delete user=> error(unauthorized) ||
|       |       |Many | Delete user=> error(unauthorized)                                   ||
|       |       |Non  | Delete user=> error(unauthorized)                                  ||
|Other Person|  |Alone| Delete user=> error||
|       |      |Many| Delete user=> error                                                      ||
|       |      |Non | Delete user=> error                                                 ||
|valid| User |Alone|Delete user=> error ||
|       |      |Many|Delete user=> error||
|       |      |Non|Delete user=> error ||
|Invalid|       |Alone| Delete user=> error(user not exist)||
|       |      |Many|Delete user=> error(user not exist)||
|       |      |Non| Delete user=> error(user not exist) ||
|Other Person|      |Alone|Delete user=> error||
|       |      |Many|Delete user=> error||
|       |      |Non|Delete user=> error ||








