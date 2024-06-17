export const handler= async(event, context)=>{

    return {
        body: JSON.stringify({ ok:true}),
        statusCode: 200
    }
}