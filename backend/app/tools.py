from sqlalchemy.orm import Session
from .models import Event, Registration, Venue

def search_events_tool(db: Session, query: str = None):
    q = db.query(Event).filter(Event.status == "SCHEDULED")
    if query:
        q = q.filter(Event.title.ilike(f"%{query}%"))
    events = q.all()
    if not events:
        return {"success": True, "output": "No scheduled events found matching your query."}
    
    result = []
    for e in events:
        venue_name = e.venue.name if e.venue else "TBD"
        result.append(f"ID {e.id}: {e.title} on {e.date} at {e.time} (Venue: {venue_name}, Capacity: {e.capacity})")
    return {"success": True, "output": "\n".join(result)}

def register_participant_tool(db: Session, user_id: int, event_id: int) -> dict:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        return {"success": False, "output": "Event not found"}
    if event.status != "SCHEDULED":
        return {"success": False, "output": "Event is not open for registration"}
        
    current_count = db.query(Registration).filter(
        Registration.event_id == event_id,
        Registration.status == "CONFIRMED"
    ).count()
    
    if current_count >= event.capacity:
        return {"success": False, "output": "Event capacity is full"}
        
    existing = db.query(Registration).filter(
        Registration.user_id == user_id,
        Registration.event_id == event_id
    ).first()
    if existing:
        return {"success": False, "output": "Already registered for this event"}
        
    reg = Registration(user_id=user_id, event_id=event_id, status="CONFIRMED")
    db.add(reg)
    db.commit()
    return {"success": True, "output": f"Successfully registered for {event.title}"}

def cancel_registration_tool(db: Session, user_id: int, event_id: int) -> dict:
    reg = db.query(Registration).filter(
        Registration.user_id == user_id,
        Registration.event_id == event_id
    ).first()
    if not reg:
        return {"success": False, "output": "Registration not found"}
    db.delete(reg)
    db.commit()
    return {"success": True, "output": "Registration cancelled successfully"}

# Aliases for backwards compatibility with agent.py
search_events = search_events_tool
register_participant = register_participant_tool
cancel_registration = cancel_registration_tool
