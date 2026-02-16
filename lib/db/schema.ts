import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const agent = pgTable("Agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  accountId: varchar("accountId", { length: 64 }).notNull().unique(),
  publicKey: varchar("publicKey", { length: 100 }).notNull(),
  encryptedPrivateKey: text("encryptedPrivateKey").notNull(),
  balance: varchar("balance", { length: 50 }).default("0"),
  status: varchar("status", { length: 20, enum: ["active", "paused", "deleted"] })
    .notNull()
    .default("active"),
  sessionId: varchar("sessionId", { length: 64 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Agent = InferSelectModel<typeof agent>;

export const tradingInstruction = pgTable("TradingInstruction", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  agentId: uuid("agentId")
    .notNull()
    .references(() => agent.id, { onDelete: "cascade" }),
  tokenPairs: jsonb("tokenPairs").notNull(),
  minPriceChange: varchar("minPriceChange", { length: 10 }).notNull(),
  maxTradeAmount: varchar("maxTradeAmount", { length: 50 }).notNull(),
  stopLoss: varchar("stopLoss", { length: 10 }),
  takeProfit: varchar("takeProfit", { length: 10 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type TradingInstruction = InferSelectModel<typeof tradingInstruction>;

export const agentTransaction = pgTable("AgentTransaction", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  agentId: uuid("agentId")
    .notNull()
    .references(() => agent.id, { onDelete: "cascade" }),
  transactionHash: varchar("transactionHash", { length: 64 }).notNull(),
  transactionType: varchar("transactionType", { 
    length: 20, 
    enum: ["swap", "transfer", "wrap", "unwrap"] 
  }).notNull(),
  fromToken: varchar("fromToken", { length: 50 }),
  toToken: varchar("toToken", { length: 50 }),
  amount: varchar("amount", { length: 50 }).notNull(),
  status: varchar("status", { 
    length: 20, 
    enum: ["pending", "completed", "failed"] 
  }).notNull(),
  errorMessage: text("errorMessage"),
  aiAnalysis: jsonb("aiAnalysis"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type AgentTransaction = InferSelectModel<typeof agentTransaction>;

export const agentTaskHistory = pgTable("AgentTaskHistory", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  agentId: uuid("agentId")
    .notNull()
    .references(() => agent.id, { onDelete: "cascade" }),
  taskType: varchar("taskType", { length: 50 }).notNull(),
  taskDescription: text("taskDescription").notNull(),
  taskInput: jsonb("taskInput"),
  taskOutput: jsonb("taskOutput"),
  status: varchar("status", { 
    length: 20, 
    enum: ["pending", "running", "completed", "failed"] 
  }).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type AgentTaskHistory = InferSelectModel<typeof agentTaskHistory>;
