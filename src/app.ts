import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	NextFunction,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import z from "zod";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);

app.post("/zod", async (req: Request, res: Response, next : NextFunction) => {

	try {
		const UserZodSchema = z.object({
			name: z.string().endsWith("r"),
			email : z.email(),
			age: z.number().optional(),
			isVerified: z.boolean().optional(),
			books: z.array(z.string()).optional()
		})


		const payload = req.body;

		const result = UserZodSchema.safeParse(payload)

		if(!result.success){
			console.log(result.error);
		}
		if(result.success){
			console.log(result.data);
		}


		res.status(httpStatus.OK).json({
			success: true,
			message: "Welcome to PH Healthcare System Backend",
			data : result
		});
	} catch (error) {
		console.log(error);
		next(error)
	}
})

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
