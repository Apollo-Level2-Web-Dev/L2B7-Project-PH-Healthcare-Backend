import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { SendChatMessageZodSchema } from "./chat.validation";
import { ChatController } from "./chat.controller";

const router = Router();

router.post(
  "/",
  validateRequest(SendChatMessageZodSchema),
  ChatController.sendMessage,
);

export const ChatRoutes = router;
