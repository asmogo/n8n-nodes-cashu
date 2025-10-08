import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";
import { NodeConnectionType, NodeOperationError } from "n8n-workflow";
import { getManager } from "./CashuManager";
import { getDecodedToken, getEncodedToken } from "coco-cashu-core";
import { SqliteRepositoriesOptions } from "coco-cashu-sqlite3";
import sqlite3 from "sqlite3";

export class CashuCoco implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Cashu Coco",
    name: "cashuCoco",
    icon: { light: "file:cashu.svg", dark: "file:cashu.svg" },
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Work with Cashu via coco-cashu-core",
    defaults: { name: "Cashu Coco" },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    usableAsTool: true,
    credentials: [
      {
        name: "cashuCoco",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          { name: "Mint", value: "mint" },
          { name: "Wallet", value: "wallet" },
          { name: "Quote", value: "quote" },
        ],
        default: "wallet",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        displayOptions: { show: { resource: ["mint"] } },
        options: [
          {
            name: "Add Mint",
            value: "addMint",
            description: "Add mint by URL",
          },
          { name: "Get Info", value: "getInfo", description: "Get mint info" },
        ],
        default: "addMint",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        displayOptions: { show: { resource: ["wallet"] } },
        options: [
          { name: "Get Balances", value: "getBalances" },
          { name: "Send", value: "send" },
          { name: "Receive", value: "receive" },
          { name: "Receive untrusted mint", value: "receive-untrusted" },
        ],
        default: "getBalances",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        displayOptions: { show: { resource: ["quote"] } },
        options: [
          { name: "Create Mint Quote", value: "createMintQuote" },
          { name: "Redeem Mint Quote", value: "redeemMintQuote" },
          { name: "Create Melt Quote (Pay)", value: "createMeltQuote" },
          { name: "Pay Melt Quote", value: "payMeltQuote" },
        ],
        default: "createMintQuote",
      },
      // Common fields
      {
        displayName: "Mint URL",
        name: "mintUrl",
        type: "string",
        default: "={{$credentials.mintUrl}}",
        description: "Target mint URL",
        required: false,
      },
      // Wallet specific
      {
        displayName: "Amount (sats)",
        name: "amount",
        type: "number",
        typeOptions: { minValue: 1 },
        default: 1,
        required: true,
        displayOptions: { show: { resource: ["wallet"], operation: ["send"] } },
      },
      {
        displayName: "Send Token Output",
        name: "asToken",
        type: "boolean",
        default: true,
        description: "Return encoded token when sending",
        displayOptions: { show: { resource: ["wallet"], operation: ["send"] } },
      },
      {
        displayName: "Token (Encoded)",
        name: "token",
        type: "string",
        default: "",
        placeholder: "cashuA...",
        displayOptions: {
          show: {
            resource: ["wallet"],
            operation: ["receive", "receive-untrusted"],
          },
        },
      },
      // Quote specific
      {
        displayName: "Amount (sats)",
        name: "quoteAmount",
        type: "number",
        typeOptions: { minValue: 1 },
        default: 100,
        displayOptions: {
          show: { resource: ["quote"], operation: ["createMintQuote"] },
        },
      },
      {
        displayName: "Quote ID",
        name: "quoteId",
        type: "string",
        default: "",
        placeholder: "quote id",
        displayOptions: {
          show: {
            resource: ["quote"],
            operation: ["redeemMintQuote", "payMeltQuote"],
          },
        },
      },
      {
        displayName: "Invoice (BOLT11)",
        name: "invoice",
        type: "string",
        default: "",
        placeholder: "lnbc...",
        displayOptions: {
          show: { resource: ["quote"], operation: ["createMeltQuote"] },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const out: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      // get the requested resource and operation
      const resource = this.getNodeParameter("resource", i) as string;
      const operation = this.getNodeParameter("operation", i) as string;
      // get credentials
      const creds = await this.getCredentials("cashuCoco");
      // get mint URL
      const mintUrl = this.getNodeParameter("mintUrl", i) as string;

      // cache per mintUrl
      const cacheKey = `${creds.mintUrl}|${creds.seed}`;
      // connect to sqlite db
      const db = new sqlite3.Database("cashu.db");
      // get coco manager
      const manager = await getManager(cacheKey, {
        seed: String(creds.seed),
        sqlite: { database: db },
      });

      try {
        if (resource === "mint") {
          if (operation === "addMint") {
            // invoking addMint
            const res = await manager.mint.addMint(mintUrl);
            out.push({ json: res });
          } else if (operation === "getInfo") {
            // invoking getMintInfo
            const info = await manager.mint.getMintInfo(mintUrl);
            out.push({ json: info });
          }
        } else if (resource === "wallet") {
          if (operation === "getBalances") {
            // invoking getBalances
            const balances = await manager.wallet.getBalances();
            out.push({ json: balances });
          } else if (operation === "send") {
            // invoking send
            const amount = this.getNodeParameter("amount", i) as number;
            const token = await manager.wallet.send(mintUrl, amount);
            out.push({ json: { token: getEncodedToken(token) } });
          } else if (operation === "receive") {
            // invoking receive
            const token = this.getNodeParameter("token", i) as string;
            await manager.wallet.receive(token);
            out.push({ json: { received: true } });
          } else if (operation === "receive-untrusted") {
            // adding new mint to manager and receiving token from unknown mint
            const token = this.getNodeParameter("token", i) as string;
            const decodedToken = getDecodedToken(token);
            const cacheKey = `${decodedToken.mint}|${creds.seed}`;

            const manager = await getManager(cacheKey, {
              seed: String(creds.seed),
            });
            await manager.mint.addMint(decodedToken.mint);
            await manager.wallet.receive(token);
            out.push({ json: { received: true } });
          }
        } else if (resource === "quote") {
          if (operation === "createMintQuote") {
            // invoking createMintQuote
            const amount = this.getNodeParameter("quoteAmount", i) as number;
            const quote = await manager.quotes.createMintQuote(mintUrl, amount);
            out.push({ json: quote });
          } else if (operation === "redeemMintQuote") {
            // invoking redeemMintQuote
            const quoteId = this.getNodeParameter("quoteId", i) as string;
            await manager.quotes.redeemMintQuote(mintUrl, quoteId);
            out.push({ json: { redeemed: true, quoteId } });
          } else if (operation === "createMeltQuote") {
            // invoking createMeltQuote
            const invoice = this.getNodeParameter("invoice", i) as string;
            const quote = await manager.quotes.createMeltQuote(
              mintUrl,
              invoice,
            );
            out.push({ json: quote });
          } else if (operation === "payMeltQuote") {
            // invoking payMeltQuote
            const quoteId = this.getNodeParameter("quoteId", i) as string;
            await manager.quotes.payMeltQuote(mintUrl, quoteId);
            out.push({ json: { paid: true, quoteId } });
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          out.push({
            json: { error: (error as Error).message },
            pairedItem: i,
          });
          continue;
        }
        console.log(error);
        throw new NodeOperationError(this.getNode(), { itemIndex: i });
      }
    }

    return [out];
  }
}
