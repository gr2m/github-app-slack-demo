
/**
 * Netlify function for health check
 *
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 */
export const handler= async(event, context)=>{
    return {
        body: JSON.stringify({ ok:true}),
        statusCode: 200
    }
}