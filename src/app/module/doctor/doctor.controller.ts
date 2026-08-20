import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DoctorServices } from "./doctor.service";
import { ApplyAsDoctorValidationZodSchema } from "./doctor.validation";


const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log({files});
    const resume = files?.['resume'] ? files['resume'][0] : null;
    const additionalFiles = files?.['additionalFiles'] || [];

    const zodValidationResult = ApplyAsDoctorValidationZodSchema.safeParse(JSON.parse(req.body.data));

    if(!zodValidationResult.success){
        throw new Error(zodValidationResult.error.issues[0].message);
    }

    const payload = zodValidationResult.data;

    const result = await DoctorServices.applyAsDoctor(payload, resume, additionalFiles);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Applied As Doctor Successfuly",
        data: result,
    });
});

export const DoctorController = {
    applyAsDoctor
}


