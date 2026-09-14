import { AiProvider, AiConfig } from "./types";
import { NoAiProvider } from "./providers/noAiProvider";
import { LocalProvider } from "./providers/localProvider";

export function createAiProvider(config: AiConfig): AiProvider {
  switch (config.mode) {
    case "none":
      return new NoAiProvider();
    case "local":
      return new LocalProvider(config.localEndpoint, config.localAiModel);
    default:
      return new NoAiProvider();
  }
}
