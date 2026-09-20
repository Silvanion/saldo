import { AiProvider, AiConfig, CloudAiConfig } from "./types";
import { NoAiProvider } from "./providers/noAiProvider";
import { LocalProvider } from "./providers/localProvider";
import { CloudProvider } from "./providers/cloudProvider";

export function createAiProvider(config: AiConfig): AiProvider {
  switch (config.mode) {
    case "none":
      return new NoAiProvider();
    case "local":
      return new LocalProvider(config.localEndpoint, config.localAiModel);
    case "cloud":
      if (config.cloudAiConfig) {
        return new CloudProvider(config.cloudAiConfig);
      }
      return new NoAiProvider();
    default:
      return new NoAiProvider();
  }
}
