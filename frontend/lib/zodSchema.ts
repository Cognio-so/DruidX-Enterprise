import { z } from "zod";

export const gptSchema = z.object({
  gptName: z
    .string()
    .min(3, { message: "GPT name must be at least 3 characters long" })
    .max(50, { message: "GPT name must not exceed 50 characters" }),

  gptDescription: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" })
    .max(300, { message: "Description must not exceed 300 characters" }),

  model: z.enum([
    "gemini_2_5_flash",
    "gemini_2_5_pro", 
    "gemini_2_5_flash_lite",
    "gpt_4_1",
    "gpt_5",
    "gpt_5_thinking_high",
    "gpt_5_mini",
    "gpt_5_nano",
    "gpt_4o",
    "claude_sonnet_4_5",
    "claude_opus_4_1",
    "claude_haiku_3_5",
    "grok_4_fast",
    "deepseek_v3_1",
    "meta_llama_3_3_70b",
    "kimi_k2_0905"
  ]).refine((val) => !!val, {
    message: "Please select a model",
  }),

  instructions: z
    .string()
    .min(20, { message: "Instructions must be at least 20 characters long" })
    .max(80000, { message: "Instructions must not exceed 80000 characters" }),

  webSearch: z.boolean(),
  hybridRag: z.boolean(),

  docs: z
    .array(z.string())
    .max(10, { message: "You can upload at most 10 documents" }),

  imageUrl: z.string().optional(),

  image: z.boolean(),
  video: z.boolean(),
  imageModel: z.string().optional(),
  videoModel: z.string().optional(),
}).refine((data) => {
  if (data.image && !data.imageModel) {
    return false;
  }
  return true;
}, {
  message: "Please select an image model when image generation is enabled",
  path: ["imageModel"],
}).refine((data) => {
  if (data.video && !data.videoModel) {
    return false;
  }
  return true;
}, {
  message: "Please select a video model when video generation is enabled",
  path: ["videoModel"],
});

export type GptFormValues = z.infer<typeof gptSchema>;

export const teamMemberUpdateSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must not exceed 255 characters" }),
  role: z.enum(["admin", "user"], {
    message: "Role must be either admin or user",
  }),
});

export const teamMemberInviteSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters long" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must not exceed 255 characters" }),
  role: z.enum(["admin", "user"], {
    message: "Role must be either admin or user",
  }),
  message: z
    .string()
    .max(500, { message: "Message must not exceed 500 characters" })
    .optional(),
});

export type TeamMemberUpdateValues = z.infer<typeof teamMemberUpdateSchema>;
export type TeamMemberInviteValues = z.infer<typeof teamMemberInviteSchema>;

export const assignGptSchema = z.object({
  userId: z.string(),
  gptIds: z.array(z.string()).min(1, "Select at least one GPT")
});

export type AssignGptValues = z.infer<typeof assignGptSchema>;

export const knowledgeBaseSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(100, { message: "Name must not exceed 100 characters" }),
  files: z
    .array(
      z.object({
        url: z.string().url({ message: "Invalid file URL" }),
        fileType: z.string().optional(),
        fileName: z.string(),
      })
    )
    .min(1, { message: "At least one file is required" })
    .max(15, { message: "You can upload at most 15 files at once" }),
});

export type KnowledgeBaseFormValues = z.infer<typeof knowledgeBaseSchema>;

export const teamGroupSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Group name must be at least 2 characters long" })
    .max(100, { message: "Group name must not exceed 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must not exceed 500 characters" })
    .optional(),
  image: z.string().optional(),
});

export type TeamGroupValues = z.infer<typeof teamGroupSchema>;

export const assignGptToGroupSchema = z.object({
  groupId: z.string(),
  gptIds: z.array(z.string()).min(1, "Select at least one GPT"),
});

export type AssignGptToGroupValues = z.infer<typeof assignGptToGroupSchema>;

export const addMembersToGroupSchema = z.object({
  groupId: z.string(),
  userIds: z.array(z.string()).min(1, "Select at least one member"),
});

export type AddMembersToGroupValues = z.infer<typeof addMembersToGroupSchema>;