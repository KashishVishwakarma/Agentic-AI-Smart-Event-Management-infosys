import time
import re
from sqlalchemy.orm import Session
from .models import AgentSession, AgentRun, ToolCall
from .tools import search_events_tool, register_participant_tool, cancel_registration_tool
from .rag import retrieve_relevant_chunks

def run_agent_turn(db: Session, user_id: int, message: str, session_id: str = None) -> dict:
    start_time = time.time()
    
    if not session_id:
        session_id = f"session_{user_id}_{int(start_time)}"
        
    session = db.query(AgentSession).filter(AgentSession.id == session_id).first()
    if not session:
        session = AgentSession(id=session_id, user_id=user_id)
        db.add(session)
        db.commit()

    msg_lower = message.lower()
    intent = "GENERAL"
    tools_used = []
    tool_logs = []
    reply = ""

    # Rule-based intent routing
    if "register" in msg_lower or "book" in msg_lower:
        intent = "REGISTRATION"
        match = re.search(r'\d+', msg_lower)
        if match:
            event_id = int(match.group())
            t_start = time.time()
            res = register_participant_tool(db, user_id, event_id)
            t_latency = (time.time() - t_start) * 1000
            tools_used.append("register_participant_tool")
            tool_logs.append({
                "tool_name": "register_participant_tool",
                "tool_input": f"event_id={event_id}",
                "tool_output": str(res.get("output")),
                "latency_ms": t_latency
            })
            reply = res.get("output")
        else:
            reply = "Please specify the ID of the event you would like to register for."

    elif "cancel" in msg_lower:
        intent = "CANCELLATION"
        match = re.search(r'\d+', msg_lower)
        if match:
            event_id = int(match.group())
            t_start = time.time()
            res = cancel_registration_tool(db, user_id, event_id)
            t_latency = (time.time() - t_start) * 1000
            tools_used.append("cancel_registration_tool")
            tool_logs.append({
                "tool_name": "cancel_registration_tool",
                "tool_input": f"event_id={event_id}",
                "tool_output": str(res.get("output")),
                "latency_ms": t_latency
            })
            reply = res.get("output")
        else:
            reply = "Please specify the ID of the event registration you want to cancel."

    elif "event" in msg_lower or "schedule" in msg_lower or "list" in msg_lower:
        intent = "SEARCH_EVENTS"
        t_start = time.time()
        res = search_events_tool(db)
        t_latency = (time.time() - t_start) * 1000
        tools_used.append("search_events_tool")
        tool_logs.append({
            "tool_name": "search_events_tool",
            "tool_input": message,
            "tool_output": str(res.get("output")),
            "latency_ms": t_latency
        })
        reply = f"Here are the available scheduled events:\n\n{res.get('output')}"

    else:
        intent = "RAG_KNOWLEDGE"
        try:
            chunks = retrieve_relevant_chunks(db, message, top_k=2)
            if chunks:
                context_str = "\n".join(chunks)
                reply = f"Here is the relevant information:\n{context_str}"
            else:
                reply = "I can assist you with event search, registration, and schedules. How can I help you today?"
        except Exception:
            reply = "I can help you search, book, or cancel event registrations. What would you like to do?"

    total_latency = (time.time() - start_time) * 1000

    # Persist the Agent Run
    run_entry = AgentRun(
        session_id=session_id,
        user_id=user_id,
        user_request=message,
        detected_intent=intent,
        tool_selected=",".join(tools_used) if tools_used else None,
        latency_ms=total_latency,
        final_response=reply
    )
    db.add(run_entry)
    db.commit()
    db.refresh(run_entry)

    # Persist Tool Calls
    for tl in tool_logs:
        tc = ToolCall(
            run_id=run_entry.id,
            tool_name=tl["tool_name"],
            tool_input=tl["tool_input"],
            tool_output=tl["tool_output"],
            latency_ms=tl["latency_ms"]
        )
        db.add(tc)
    db.commit()

    return {
        "reply": reply,
        "session_id": session_id,
        "detected_intent": intent,
        "tools_used": tools_used,
        "tool_calls": tool_logs
    }
