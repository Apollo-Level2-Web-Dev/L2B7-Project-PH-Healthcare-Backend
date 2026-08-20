import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AppointmentServices } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user!;

    const result = await AppointmentServices.bookAppointment(payload, user)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Appointment Payment Initiated Successfully",
        data: result,
    });
});


const payAppointment = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const user = req.user!;

    const result = await AppointmentServices.payAppointment(payload, user)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Appointment Payment Initiated Successfully",
        data: result,
    });
});


const bookAppointmentCallback = catchAsync(async (req: Request, res: Response) => {
    const { redirectUrl } =  await AppointmentServices.bookAppointmentCallback(req.query);


    res.redirect(redirectUrl);
    // sendResponse(res, {
    //     statusCode: httpStatus.OK,
    //     success: true,
    //     message: "User profile fetched successfully",
    //     data: result,
    // });
});

const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;

    const result = await AppointmentServices.cancelAppointment(payload)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Appointment Cancelled And Refunded Successfully",
        data: result,
    });
});

export const AppointmentController = {
    bookAppointment,
    payAppointment,
    bookAppointmentCallback,
    cancelAppointment
}