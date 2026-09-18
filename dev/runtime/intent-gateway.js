import { ASSETS } from "../content/assets.js";
import { COMMANDS } from "./contracts.js";
import { copy } from "./contracts.js";

// Text/voice and future model tool-calls enter through the exact same dispatcher.
export function createIntentGateway(runtime) {
  return {
    describe() {
      return {
        version: 1,
        context: runtime.token,
        scene: copy(runtime.context),
        world: runtime.snapshot.worlds[runtime.context?.world] || {},
        assets: Object.values(ASSETS),
        commands: Object.fromEntries(
          Object.entries(COMMANDS).filter(([id]) => id !== "flag.set"),
        ),
      };
    },
    apply(proposal, source = "ai") {
      if (
        !proposal ||
        proposal.version !== 1 ||
        typeof proposal.context !== "string"
      )
        return { ok: false, error: "Invalid proposal envelope" };
      return runtime.dispatch(proposal.commands, {
        source,
        token: proposal.context,
      });
    },
  };
}
