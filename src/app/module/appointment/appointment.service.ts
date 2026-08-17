import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppointment = async () => {

    // business logic

    const bkashIdToken = await getBkashIdToken()

    if(!bkashIdToken){
        throw new Error("No Bkash Access Token Found!")
    }

    console.log({bkashIdToken});

    const bkashCreatePaymentResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
        method : "POST",
        headers : {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: bkashIdToken,
            "X-App-Key" : config.bkash_app_key

        },
        body: JSON.stringify({
            mode: "0011",
            payerReference: "0123456789", //user email or phone number
            callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
            amount: "1200",
            currency: "BDT",
            intent: "sale",
            merchantInvoiceNumber: "Inv4" // apppointment id
        })
    });

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json()

    console.log({bkashCreatePaymentResult});

    return bkashCreatePaymentResult
}

const bookAppointmentCallback = async (query : Record<string, any>) => {

    const paymentId = query.paymentID

    if(!paymentId){
        throw new Error("Payment Id Missing")
    }

    const status = query.status

    if(!status){
        throw new Error("Payment Status is Missing")
    }

    const bkashIdToken = await getBkashIdToken();

    if (!bkashIdToken) {
        throw new Error("No Bkash Access Token Found!")
    }


    const executedPaymentResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
        method : "POST",
        headers : {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: bkashIdToken,
            "X-App-Key": config.bkash_app_key
        },

        body : JSON.stringify({
            paymentID : paymentId
        })
    })

    const executedPaymentResult = await executedPaymentResponse.json()


    if(status === "success"){
        return {
            executedPaymentResult,
            redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=success`
        }
    }
    if(status === "failure"){
        return {
            executedPaymentResult,
            redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=failue`
        }
    }
    if(status === "cancel"){
        return {
            executedPaymentResult,
            redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=cancel`
        }
    }

    return {
        executedPaymentResult,
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments`
    }
}

export const AppointmentServices = {
    bookAppointment,
    bookAppointmentCallback
}