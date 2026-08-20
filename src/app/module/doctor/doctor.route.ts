import { Router } from "express";
import { upload } from "../../lib/multer";
import { DoctorController } from "./doctor.controller";

const router = Router();

router.post(
	"/apply-as-doctor",
	// validateRequest(UserValidation.ResetPasswordZodSchema),
	upload.fields([
		{
			name: "resume",
			maxCount: 1,
		},

		{
			name: "additionalFiles",
			maxCount: 10,
		},
	]),
	DoctorController.applyAsDoctor,
);
export const DoctorRoutes = router;
