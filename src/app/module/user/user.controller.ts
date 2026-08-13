import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {

    if (!req.file) {
       throw new Error("No File Provided.")
    }

    const userId = req.user?.userId

    const result = await UserServices.uploadProfileImage(req.file?.buffer, userId!)
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "New tokens generated successfully",
        data: result,
    });
})

export const UserController = {
    uploadProfileImage
}