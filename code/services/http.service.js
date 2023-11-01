/********************** SET RESPONSE UTILS ************************/
/**
 * Sets the status of res to 401 and inform client with appropriate message
 * @param res the HTTP res object 
 * @param mess the message with wich inform the client about the reason of denied auth
 */
export const unauthorized = (res, mess) => {
    return res.status(401).json({ error: mess || "Unauthorized" })
}

/**
 * Sets the status of res to 500
 * @param res the HTTP res object 
 */
export const serverSideError = (res, err) => {
    const message = err && (err.name + ": " + err.message)
    res.status(500).json({ error: message || "Something went wrong" })
}

/* HTTP Bad request, sets status and payload
 * @param res the HTTP res object 
 */
export const badRequest = (res, payload) => {
    res.status(400).json({ error: payload })
}

/* HTTP Ok, sets status and payload
 * @param res the HTTP res object 
 */
export const ok = (res, payload) => {
    res.status(200).json({ data: payload, refreshedTokenMessage: res.locals.refreshedTokenMessage || "" })
}