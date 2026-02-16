import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { sendNearTokens } from "./ai/tools/send-near-tokens";
import type { checkBalance } from "./ai/tools/check-balance";
import type { getAccountInfo } from "./ai/tools/get-account-info";
import type { swapTokens } from "./ai/tools/swap-tokens";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  signature: z.string().optional(),
  signingAddress: z.string().optional(),
  verificationTimestamp: z.string().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type sendNearTokensTool = InferUITool<ReturnType<typeof sendNearTokens>>;
type checkBalanceTool = InferUITool<ReturnType<typeof checkBalance>>;
type getAccountInfoTool = InferUITool<typeof getAccountInfo>;
type swapTokensTool = InferUITool<ReturnType<typeof swapTokens>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  sendNearTokens: sendNearTokensTool;
  checkBalance: checkBalanceTool;
  getAccountInfo: getAccountInfoTool;
  swapTokens: swapTokensTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
  nearTransactionRequest: {
    id: string;
    type: "transfer";
    recipient: string;
    amount: string;
    amountInYocto: string;
    memo?: string;
  };
  nearBalanceRequest: {
    id: string;
  };
  nearSwapRequest: {
    id: string;
    type: "swap";
    fromToken: string;
    toToken: string;
    amount: string;
    fromTokenId: string;
    toTokenId: string;
    amountInSmallestUnit: string;
    minimumOutput?: string;
    minimumOutputInSmallestUnit?: string;
    needsWrapping?: boolean;
  };
  nearWrapRequest: {
    id: string;
    type: "wrap";
    amount: string;
    amountInYocto: string;
    contractId: string;
  };
  nearUnwrapRequest: {
    id: string;
    type: "unwrap";
    amount: string;
    amountInYocto: string;
    contractId: string;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
