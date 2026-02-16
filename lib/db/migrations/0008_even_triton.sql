CREATE TABLE IF NOT EXISTS "Agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"accountId" varchar(64) NOT NULL,
	"publicKey" varchar(100) NOT NULL,
	"encryptedPrivateKey" text NOT NULL,
	"balance" varchar(50) DEFAULT '0',
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sessionId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Agent_accountId_unique" UNIQUE("accountId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AgentTaskHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" uuid NOT NULL,
	"taskType" varchar(50) NOT NULL,
	"taskDescription" text NOT NULL,
	"taskInput" jsonb,
	"taskOutput" jsonb,
	"status" varchar(20) NOT NULL,
	"errorMessage" text,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AgentTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" uuid NOT NULL,
	"transactionHash" varchar(64) NOT NULL,
	"transactionType" varchar(20) NOT NULL,
	"fromToken" varchar(50),
	"toToken" varchar(50),
	"amount" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"errorMessage" text,
	"aiAnalysis" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TradingInstruction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentId" uuid NOT NULL,
	"tokenPairs" jsonb NOT NULL,
	"minPriceChange" varchar(10) NOT NULL,
	"maxTradeAmount" varchar(50) NOT NULL,
	"stopLoss" varchar(10),
	"takeProfit" varchar(10),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentTaskHistory" ADD CONSTRAINT "AgentTaskHistory_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AgentTransaction" ADD CONSTRAINT "AgentTransaction_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TradingInstruction" ADD CONSTRAINT "TradingInstruction_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
