import { StateGraph, END, MemorySaver } from "@langchain/langgraph";
import { GraphState} from "./types";
import { preprocessNode, classifyNode, routerNode, requestInfoNode, escalateNode, dispatchNode,manualHandlingNode  } from "./nodes";

export const last = (a: any, b: any) => b ?? a;

const channels = {
  incident:          { value: last },
  preprocessed_text: { value: last, default: () => "" },
  classification:    { value: last, default: () => null },
  route:             { value: last, default: () => null },
  final_action:      { value: last, default: () => "" },
  human_approved:    { value: last, default: () => null },
  phone_number:      { value: last, default: () => null },
};

export function routingEdge(state: GraphState): string {
  return state.route === "escalate_to_human" ? "request_info" : "dispatch";
}

export function postApprovalEdge(state: GraphState): string {
  return state.human_approved ? "escalate" : "manual";
}

export function buildGraph(checkpointer?: MemorySaver) {
  const graph = new StateGraph<GraphState>({ channels } as any)
    .addNode("preprocess",    preprocessNode)
    .addNode("classify",      classifyNode)
    .addNode("router",        routerNode)
    .addNode("request_info",  requestInfoNode)
    .addNode("escalate",      escalateNode)
    .addNode("dispatch",      dispatchNode)
    .addNode("manual",        manualHandlingNode)
    .addEdge("__start__" as any, "preprocess")
    .addEdge("preprocess", "classify")
    .addEdge("classify",   "router")
    .addConditionalEdges("router", routingEdge, { request_info: "request_info", dispatch: "dispatch" })
    .addConditionalEdges("request_info", postApprovalEdge, { escalate: "escalate",  manual: "manual"})
    .addEdge("escalate", END)
    .addEdge("dispatch", END)
    .addEdge("manual", END);

  return graph.compile({ checkpointer });
}
