import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { ChatServices } from "./chat.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await ChatServices.sendMessage(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat Reply generated successfully",
    data: result,
  });
});

export const ChatController = {
  sendMessage,
};
