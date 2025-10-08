import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class CashuCoco implements ICredentialType {
  name = "cashuCoco";
  displayName = "Cashu Coco";
  documentationUrl = "https://github.com/Egge21M/coco-cashu";
  icon = { light: "file:cashu.svg", dark: "file:cashu.svg" } as any;

  properties: INodeProperties[] = [
    {
      displayName: "Mint URL",
      name: "mintUrl",
      type: "string",
      default: "https://mint.minteer.cash",
      placeholder: "https://mint.example.com",
      description: "Cashu mint base URL",
      required: true,
    },
    {
      displayName: "Seed",
      name: "seed",
      type: "string",
      default: "",
      description:
        "BIP39 mnemonic (12/24 words) or 64-byte hex string used to derive deterministic outputs",
      typeOptions: { password: true },
      required: true,
    },
    {
      displayName: "WebSocket URL",
      name: "wsUrl",
      type: "string",
      default: "",
      placeholder: "wss://mint.example.com/ws",
      description: "Optional WebSocket endpoint for real-time subscriptions",
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.mintUrl}}",
      url: "/info",
      method: "GET",
    },
  };
}
