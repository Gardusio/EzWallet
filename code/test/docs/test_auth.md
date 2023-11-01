## --LOGIN:

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Email      | define , undefine              ||
|password   | valid , invalid                ||


|Email               |password                 | test                 |
|---|---|---|
|define| valid | register ("ROMI","123","NMT") / login ("123","NMT") => success (token)||
|define| invalid | register ("ROMI","123","NMT") / login ("453","NMT") =>  not success (error(400))||
|undefine| valid | IMPOSSINLE||
|undefine| unvalid | NOT REGISTER (error(400))||



## --LOGOUT:

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|USER     | define , undefine              ||
|TOKEN  | valid , invalid                ||


|USER               |TOKEN                | test               |
|---|---|---|
|define| valid | register ("ROMI","123","NMT") / login ("123","NMT") => success (LOGOUT(ROMI))||
|define| invalid | register ("ROMI","123","NMT") / login ("123","NMT") =>  not success (USER NOT FOUND(400))||
|undefine| valid | register ("ROMI","123","NMT") / login ("123","NMT") => ERROR (400)||
|undefine| unvalid | NOT LOGIN  (error(400))||

## --REGISTER:

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Username      | unique, repeated              ||
|Email      |         unique, repeated                      ||


|Email               |Username                | test                 |
|---|---|---|
|unique| unique | REGISTER ("ROMI","123","NMT") => REGISTER||
|unique| repeated| REGISTER ("ROMI","123","NMT") / REGISTER( "ROMI","123","BCP") =>  not success (error(400))||
|repeated| unique | REGISTER ("ROMI","123","NMT") / REGISTER( "SAMI","123","NMT") =>ERROR(400) => you are already registerd||





## --REGISTER ADMIN:

| Criteria | Predicate                                   |Boundaries                                              |
| --------- | ------------------------------------------------- | ------------------------------------------------------------ |
|Username    | Unique, Repeated            ||
|Email |  Unique, Repeated           ||


|Email              | Username              | test               |
|---|---|---|
|unique| unique | REGISTER ("ROMI","123","NMT") => REGISTER||
|unique| repeated| REGISTER ("ROMI","123","NMT") / REGISTER( "ROMI","123","BCP") =>  not success (error(400))||
|repeated| repeated| REGISTER ("ROMI","123","NMT") / REGISTER( "ROMI","123","nmt") =>ERROR(400) => you are already registerd||
|repeated| unique | REGISTER ("ROMI","123","NMT") / REGISTER( "SAMI","123","NMT") =>ERROR(400) => you are already registerd||




