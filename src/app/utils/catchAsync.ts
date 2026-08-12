import type { NextFunction, Request, RequestHandler, Response } from "express";

export const catchAsync = (fn: RequestHandler) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			await fn(req, res, next);
		} catch (error) {
			// console.log(error);

			// res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			//     success: false,
			//     statusCode: httpStatus.INTERNAL_SERVER_ERROR,
			//     message: "Failed to register user",
			//     error: (error as Error).message
			// })

			next(error);
		}
	};
};
