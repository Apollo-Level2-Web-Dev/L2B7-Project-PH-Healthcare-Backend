import z from "zod";

export const SendChatMessageZodSchema = z.object({
	message: z
		.string("Message Is Required")
		.trim()
		.min(1, "Message Cannot Be Empty")
		.max(1000, "Message Cannot Be Longer Than 1000 Characters"),
	sessionId: z.uuid("Session Id Must Be A Valid UUID").optional(),
});