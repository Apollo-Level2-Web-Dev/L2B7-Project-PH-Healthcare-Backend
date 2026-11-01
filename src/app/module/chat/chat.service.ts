import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { redisClient } from "../../lib/redis";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { CHAT_SYSTEM_PROMPT, CONDENSE_QUESTION_PROMPT } from "./chat.prompt";
import { chatModel } from "../../lib/llm";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { vectorStore } from "../../lib/vectorStore";
import { addDays, format, startOfDay } from "date-fns";
import { prisma } from "../../lib/prisma";
import {
  DoctorVerificationStatus,
  ScheduleStatus,
} from "../../../generated/prisma/enums";
import { IChatResponse, ISendChatMessagePayload } from "./chat.interface";
import crypto from "crypto";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const TOP_K_DOCTORS = 4;
const MAX_HISTORY_MESSAGE = 10;
const HISTORY_TTL_SECONDS = 60 * 60;

type TStoreMessage = { role: "human" | "ai"; content: string };

const historyKey = (sessionId: string) => `chat:session:${sessionId}`;

const getHistory = async (sessionId: string): Promise<TStoreMessage[]> => {
  const raw = await redisClient.get(historyKey(sessionId));
  return raw ? (JSON.parse(raw) as TStoreMessage[]) : [];
};

const saveHistory = async (sessionId: string, history: TStoreMessage[]) => {
  await redisClient.set(
    historyKey(sessionId),
    JSON.stringify(history.slice(-MAX_HISTORY_MESSAGE)),
    { expiration: { type: "EX", value: HISTORY_TTL_SECONDS } },
  );
};

const toLangChainMessages = (history: TStoreMessage[]) =>
  history.map((message) =>
    message.role === "human"
      ? new HumanMessage(message.content)
      : new AIMessage(message.content),
  );

const condenseQuestionChain = ChatPromptTemplate.fromMessages([
  ["system", CONDENSE_QUESTION_PROMPT],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
])
  .pipe(chatModel)
  .pipe(new StringOutputParser());

const answerChain = ChatPromptTemplate.fromMessages([
  ["system", CHAT_SYSTEM_PROMPT],
  new MessagesPlaceholder("history"),
  ["human", "{question}"],
])
  .pipe(chatModel)
  .pipe(new StringOutputParser());

const retrieveDoctorIds = async (searchQuery: string) => {
  const results = await vectorStore.similaritySearchWithScore(
    searchQuery,
    TOP_K_DOCTORS,
  );

  return results.map(([document]) => document.metadata.doctorId as string);
};

const getDoctorsWithTodaysSchedules = async (doctorIds: string[]) => {
  if (!doctorIds.length) {
    return [];
  }

  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfTomorrow = addDays(startOfToday, 1);

  const doctors = await prisma.doctor.findMany({
    where: {
      id: {
        in: doctorIds,
      },
      isDeleted: false,
      verificationStatus: DoctorVerificationStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      specialization: true,
      qualifications: true,
      experienceYears: true,
      bio: true,
      consultationFee: true,

      schedules: {
        where: {
          isDeleted: false,
          status: ScheduleStatus.PUBLISHED,
          availableSlots: { gt: 0 },
          startDateTime: { gte: startOfToday, lt: startOfTomorrow, gt: now },
        },
        orderBy: { startDateTime: "asc" },
        select: {
          startDateTime: true,
          endDateTime: true,
          availableSlots: true,
        },
      },
    },
  });

  return doctorIds
    .map((id) => doctors.find((doctor) => doctor.id === id))
    .filter((doctor): doctor is (typeof doctors)[number] => Boolean(doctor));
};

type TChatDoctor = Awaited<
  ReturnType<typeof getDoctorsWithTodaysSchedules>
>[number];

const buildContext = (doctors: TChatDoctor[]) => {
  if (!doctors.length) {
    return "No matching doctors were found.";
  }

  return doctors
    .map((doctor, index) => {
      const schedules = doctor?.schedules.length
        ? doctor.schedules
            .map(
              (schedule) =>
                `${format(schedule.startDateTime, "h:mm a")}- ${format(schedule.endDateTime, "h:mm a")} (${schedule.availableSlots} slots left)`,
            )
            .join(", ")
        : "No open schedule today";

      const fee = doctor?.consultationFee
        ? `${doctor.consultationFee.toString()} BDT`
        : "Not set";

      return [
        `Doctor ${index + 1}: Dr. ${doctor.name}`,
        `- Specialization: ${doctor.specialization}`,
        `- Qualifications: ${doctor.qualifications}`,
        `- Experience: ${doctor.experienceYears} years`,
        `- Consultation fee: ${fee}`,
        `- Today's available schedules: ${schedules}`,
        doctor.bio ? `- About: ${doctor.bio}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
};

const sendMessage = async (
  payload: ISendChatMessagePayload,
): Promise<IChatResponse> => {
  const sessionId = payload.sessionId ?? crypto.randomUUID();
  const history = await getHistory(sessionId);
  const historyMessages = toLangChainMessages(history);

  try {
    const searchQuery = history.length
      ? await condenseQuestionChain.invoke({
          history: historyMessages,
          question: payload.message,
        })
      : payload.message;

    const doctorIds = await retrieveDoctorIds(searchQuery);
    const doctors = await getDoctorsWithTodaysSchedules(doctorIds);

    const answer = await answerChain.invoke({
      context: buildContext(doctors),
      history: historyMessages,
      question: payload.message,
    });

    await saveHistory(sessionId, [
      ...history,
      { role: "human", content: payload.message },
      { role: "ai", content: answer },
    ]);

    return {
      sessionId,
      answer,
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee?.toString() ?? null,
      })),
    };
  } catch (error) {
    console.error("Chat: failed to generate answer", error);
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Chat is temporarily unavailable. Please try again later",
    );
  }
};

export const ChatServices = {
  sendMessage,
};
