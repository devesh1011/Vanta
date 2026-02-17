<a href="https://near.org/">
  <h1 align="center">Vanta | Near AI Assistant</h1>
</a>

<p align="center">
    A privacy-preserving AI chatbot for NEAR blockchain operations, powered by NEAR AI models running in Trusted Execution Environments (TEE).
</p>

<p align="center">
  <a href="https://vanta-ai-blond.vercel.app/">
    <strong>🚀 Live Demo</strong>
  </a>
  ·
  <a href="https://youtu.be/4PF_dMbsB-w">
    <strong>📺 Watch Demo Video</strong>
  </a>
</p>
<br/>

## Features

- **Autonomous Trading Agents** 🤖
  - Create AI-powered agents with their own NEAR wallets
  - Agents autonomously analyze markets and execute token swaps
  - Self-managing task execution with AI-driven decision making
  - Real-time task monitoring and execution history
  - Secure encrypted private key storage

- **NEAR Blockchain Integration**
  - Check account balances and information
  - Send NEAR tokens to any account
  - Swap tokens using Ref Finance DEX
  - Wrap/unwrap NEAR tokens
  - All transactions require user confirmation for security

- **Privacy-Preserving AI**
  - NEAR AI models running in Trusted Execution Environments (TEE)
  - Your conversations and blockchain data remain confidential
  - Cryptographic verification of model execution
  - No data leakage to third parties

## Autonomous Trading Agents

### What are Autonomous Agents?

Autonomous agents are AI-powered entities that can independently analyze markets, make trading decisions, and execute blockchain transactions on NEAR Protocol. Each agent has its own NEAR wallet and operates based on the goals you define.

### How It Works

1. **Create an Agent**
   - Navigate to the Agents page (`/agents`)
   - Click "Create Agent" and provide a name and description
   - The system automatically creates a NEAR testnet account for the agent
   - Agent's private key is encrypted and securely stored

2. **Define Agent Goals**
   - Describe what you want the agent to do (e.g., "Find and invest in promising tokens")
   - The agent uses NEAR AI to understand and execute your goals
   - Goals can be updated anytime from the agent detail page

3. **Agent Execution Flow**
   - **Task Planning**: AI analyzes the goal and creates a step-by-step execution plan
   - **Market Analysis**: Fetches available tokens from Ref Finance DEX
   - **AI Prediction**: Uses NEAR AI models to analyze and select the best token
   - **Transaction Execution**: Autonomously executes the swap with proper sequencing
   - **Task Monitoring**: Real-time updates on each task's progress and status

4. **Self-Managing Execution**
   - Agents break down complex goals into manageable tasks
   - Each task is executed sequentially with proper blockchain finalization
   - Automatic error handling and fallback strategies
   - Complete transaction history with blockchain verification

### Key Features

- **Autonomous Decision Making**: Agents use AI to analyze market data and make investment decisions
- **Secure Wallet Management**: Each agent has an encrypted private key stored securely
- **Transaction Sequencing**: Proper waiting between transactions to ensure blockchain state consistency
- **Task History**: Complete audit trail of all agent actions and decisions
- **Real-time Monitoring**: Watch your agent work in real-time with live task updates

### Example Use Cases

- **Automated Trading**: "Analyze tokens on Ref Finance and swap to the most promising one"
- **Portfolio Rebalancing**: "Monitor my portfolio and rebalance when needed"
- **Market Making**: "Provide liquidity to high-volume trading pairs"
- **Arbitrage**: "Find and execute arbitrage opportunities across DEXs"

### Security & Control

- Agents operate on NEAR testnet by default for safe testing
- You maintain full control - agents only execute when you trigger them
- All transactions are logged and can be verified on-chain
- Private keys are encrypted using AES-256-CBC encryption
- You can pause or delete agents at any time

## Blockchain Capabilities

### Check Balance

Ask the assistant to check your NEAR account balance:

```
"Check balance for alice.near"
"What's my balance?" (after connecting wallet)
```

### Send Tokens

Send NEAR tokens to any account with natural language:

```
"Send 5 NEAR to bob.near"
"Transfer 10 NEAR to alice.testnet with memo 'payment'"
```

### Swap Tokens

Swap tokens on Ref Finance DEX:

```
"Swap 10 NEAR to USDC"
"Exchange 100 USDT for wNEAR"
```

### Account Information

Get detailed information about any NEAR account:

```
"Get account info for alice.near"
"Show me details for bob.testnet"
```

All blockchain transactions are executed securely with user confirmation dialogs before any action is taken.

## Privacy-Preserving AI

### NEAR AI Models

This assistant uses NEAR AI models that run in Trusted Execution Environments (TEE), ensuring your data remains private:

- **NEAR Qwen 3 30B** (Default): Multilingual model with privacy-preserving inference
- **NEAR DeepSeek V3.1**: Advanced reasoning model with TEE protection

### How TEE Works

1. **Isolated Execution**: AI models run in secure hardware enclaves
2. **Data Encryption**: Your inputs are encrypted end-to-end
3. **Attestation**: Cryptographic proof that models run in genuine TEE
4. **No Data Leakage**: Model providers cannot access your conversations

### Verification

Verify that models are running in secure TEE environments:

- Models are cryptographically verified before use
- All responses can be traced to verified TEE instances
- Transparent attestation reports available
