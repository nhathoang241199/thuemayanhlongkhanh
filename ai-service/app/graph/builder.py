"""Compile LangGraph chat workflow."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.graph.nodes.agent import agent_node
from app.graph.nodes.availability import availability_decision, availability_node
from app.graph.nodes.canned import (
    booking_node,
    delivery_arrange_node,
    greeting_node,
    policy_fees_node,
    shop_contact_node,
)
from app.graph.nodes.price import price_node
from app.graph.nodes.route import route_decision, route_node
from app.graph.state import ChatState

_graph = None


def build_chat_graph():
  global _graph
  if _graph is not None:
    return _graph

  g = StateGraph(ChatState)
  g.add_node("route", route_node)
  g.add_node("greeting_node", greeting_node)
  g.add_node("booking_node", booking_node)
  g.add_node("delivery_arrange_node", delivery_arrange_node)
  g.add_node("policy_fees_node", policy_fees_node)
  g.add_node("shop_contact_node", shop_contact_node)
  g.add_node("price_node", price_node)
  g.add_node("availability_node", availability_node)
  g.add_node("agent_node", agent_node)

  g.add_edge(START, "route")
  g.add_conditional_edges(
    "route",
    route_decision,
    {
      "greeting": "greeting_node",
      "booking_redirect": "booking_node",
      "delivery_arrange": "delivery_arrange_node",
      "policy_fees": "policy_fees_node",
      "address_or_phone": "shop_contact_node",
      "price": "price_node",
      "availability": "availability_node",
      "general": "agent_node",
    },
  )

  for node in (
    "greeting_node",
    "booking_node",
    "delivery_arrange_node",
    "policy_fees_node",
    "shop_contact_node",
    "price_node",
  ):
    g.add_edge(node, END)

  g.add_conditional_edges(
    "availability_node",
    availability_decision,
    {"end": END, "agent": "agent_node"},
  )
  g.add_edge("agent_node", END)

  _graph = g.compile()
  return _graph


async def run_chat(
    user_message: str,
    history: list[dict],
    frontend_url: str,
) -> dict:
    graph = build_chat_graph()
    initial: ChatState = {
        "user_message": user_message.strip(),
        "history": history,
        "frontend_url": frontend_url,
        "graph_trace": [],
        "rounds": [],
        "canned": False,
    }
    result = await graph.ainvoke(initial)
    return {
        "reply": result.get("reply", ""),
        "reply_raw": result.get("reply_raw", result.get("reply", "")),
        "canned": bool(result.get("canned")),
        "intent": result.get("intent", ""),
        "graph_trace": result.get("graph_trace", []),
        "rounds": result.get("rounds", []),
    }
