import os
import json
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

try:
    import google.generativeai as genai
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
    AI_AVAILABLE = bool(GOOGLE_API_KEY)
except ImportError:
    AI_AVAILABLE = False


def _get_model():
    if not AI_AVAILABLE:
        return None
    try:
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        return None


async def calculate_priority(incident_data: dict) -> dict:
    """Use Gemini to calculate incident priority."""
    people_trapped = incident_data.get("people_trapped", 0)
    children_present = incident_data.get("children_present", False)
    senior_citizens = incident_data.get("senior_citizens_present", False)
    medical_emergency = incident_data.get("medical_emergency", False)
    pregnant_woman = incident_data.get("pregnant_woman_present", False)
    water_level = incident_data.get("water_level", "")
    description = incident_data.get("description", "")
    disaster_type = incident_data.get("disaster_type", "")

    if not AI_AVAILABLE:
        return _rule_based_priority(incident_data)

    model = _get_model()
    if not model:
        return _rule_based_priority(incident_data)

    prompt = f"""You are a disaster response AI assistant for the State Disaster Management Authority.
Analyze this incident and determine its priority level.

Incident Details:
- Disaster Type: {disaster_type}
- People Trapped: {people_trapped}
- Children Present: {children_present}
- Senior Citizens Present: {senior_citizens}
- Medical Emergency: {medical_emergency}
- Pregnant Woman Present: {pregnant_woman}
- Water Level: {water_level}
- Description: {description}

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{{
  "priority": "Critical|High|Medium|Low",
  "score": <number 1-100>,
  "reasoning": "<brief explanation in 2-3 sentences>",
  "recommended_resources": ["resource1", "resource2"],
  "estimated_response_time": "<time estimate>"
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        return result
    except Exception as e:
        return _rule_based_priority(incident_data)


def _rule_based_priority(incident_data: dict) -> dict:
    score = 0
    people = incident_data.get("people_trapped", 0)
    score += min(people * 5, 40)
    if incident_data.get("medical_emergency"):
        score += 25
    if incident_data.get("pregnant_woman_present"):
        score += 20
    if incident_data.get("children_present"):
        score += 15
    if incident_data.get("senior_citizens_present"):
        score += 10
    water = incident_data.get("water_level", "").lower()
    if "high" in water or "severe" in water:
        score += 20
    elif "medium" in water or "moderate" in water:
        score += 10

    if score >= 70:
        priority = "Critical"
    elif score >= 45:
        priority = "High"
    elif score >= 20:
        priority = "Medium"
    else:
        priority = "Low"

    resources = ["Medical Team"]
    if people > 10:
        resources.append("Rescue Boats")
    if incident_data.get("medical_emergency"):
        resources.append("Ambulance")
    if incident_data.get("disaster_type", "").lower() == "fire":
        resources.append("Fire Truck")

    return {
        "priority": priority,
        "score": min(score, 100),
        "reasoning": f"Based on {people} trapped persons with {'medical emergency' if incident_data.get('medical_emergency') else 'no medical emergency'}. Priority determined by vulnerability factors.",
        "recommended_resources": resources,
        "estimated_response_time": "30-60 minutes" if priority in ["Critical", "High"] else "1-3 hours",
    }


async def match_volunteers(incident: dict, volunteers: list) -> list:
    """Rank available volunteers by fit for a given incident using Gemini."""
    if not volunteers:
        return []

    vol_data = [{
        "id": v["id"],
        "name": v["name"],
        "skills": v.get("skills", []),
        "district": v.get("district", ""),
        "blood_group": v.get("blood_group", ""),
        "availability": v.get("availability", ""),
    } for v in volunteers]

    if not AI_AVAILABLE:
        return _rule_based_volunteer_match(incident, volunteers)

    model = _get_model()
    if not model:
        return _rule_based_volunteer_match(incident, volunteers)

    prompt = f"""You are a disaster response AI for the State Disaster Management Authority.
Rank these volunteers for the incident based on skill relevance, district proximity, and suitability.

INCIDENT:
- Type: {incident.get('disaster_type', '')}
- District: {incident.get('district', '')}
- People Trapped: {incident.get('people_trapped', 0)}
- Medical Emergency: {incident.get('medical_emergency', False)}
- Children Present: {incident.get('children_present', False)}
- Description: {incident.get('description', '')[:200]}

AVAILABLE VOLUNTEERS:
{json.dumps(vol_data, indent=2)}

Respond with ONLY valid JSON array (no markdown), ranked best to worst:
[
  {{
    "id": "<volunteer_id>",
    "match_score": <0-100>,
    "match_level": "Best Match|Good Match|Partial Match",
    "reason": "<one short sentence why>"
  }}
]"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return _rule_based_volunteer_match(incident, volunteers)


def _rule_based_volunteer_match(incident: dict, volunteers: list) -> list:
    disaster = incident.get("disaster_type", "").lower()
    district = incident.get("district", "").lower()
    medical = incident.get("medical_emergency", False)

    skill_map = {
        "flood": ["Swimming", "Search & Rescue", "Boat Rescue"],
        "fire": ["Firefighting", "First Aid"],
        "earthquake": ["Search & Rescue", "Engineering", "Medical"],
        "landslide": ["Search & Rescue", "Engineering"],
        "cyclone": ["Search & Rescue", "Communication"],
    }
    relevant = skill_map.get(disaster, ["Search & Rescue", "First Aid"])
    if medical:
        relevant.append("Medical")

    results = []
    for v in volunteers:
        score = 0
        same_district = v.get("district", "").lower() == district
        if same_district:
            score += 30
        vol_skills = [s.lower() for s in v.get("skills", [])]
        matched = sum(1 for s in relevant if s.lower() in vol_skills)
        score += min(matched * 20, 50)
        if medical and "medical" in vol_skills:
            score += 20
        if v.get("availability") == "Full Time":
            score += 10

        score = min(score, 100)
        match_level = "Best Match" if score >= 60 else "Good Match" if score >= 35 else "Partial Match"
        results.append({
            "id": v["id"],
            "match_score": score,
            "match_level": match_level,
            "reason": f"{'Same district. ' if same_district else ''}{matched} relevant skill(s) matched for {disaster or 'disaster'} rescue.",
        })

    return sorted(results, key=lambda x: x["match_score"], reverse=True)


async def generate_mission_briefing(assignment: dict, incident: dict, nearest_camp, citizen_contact) -> dict:
    """Generate an AI mission briefing for a rescue volunteer."""
    camp_info = f"{nearest_camp['name']} in {nearest_camp['district']} — {nearest_camp.get('beds_available', 0)} beds available" if nearest_camp else "No nearby camp data"
    citizen_info = f"{citizen_contact['name']} · {citizen_contact.get('phone', 'N/A')}" if citizen_contact else "Contact unavailable"

    if not AI_AVAILABLE:
        return _rule_based_briefing(assignment, incident, nearest_camp)

    model = _get_model()
    if not model:
        return _rule_based_briefing(assignment, incident, nearest_camp)

    prompt = f"""You are a disaster response coordinator generating a field briefing for a rescue volunteer.

MISSION:
- Disaster Type: {incident.get('disaster_type', '')}
- Location: {incident.get('village', '')}, {incident.get('district', '')}
- People Trapped: {incident.get('people_trapped', 0)}
- Medical Emergency: {incident.get('medical_emergency', False)}
- Children Present: {incident.get('children_present', False)}
- Senior Citizens: {incident.get('senior_citizens_present', False)}
- Pregnant Woman: {incident.get('pregnant_woman_present', False)}
- Water Level: {incident.get('water_level', 'Unknown')}
- Description: {incident.get('description', 'No details provided')}
- Team Type: {assignment.get('team_type', 'Volunteer Group')}
- Nearest Camp: {camp_info}
- Citizen Contact: {citizen_info}

Respond with ONLY valid JSON (no markdown):
{{
  "headline": "<concise one-line mission summary>",
  "situation_overview": "<2-3 sentences describing what to expect on ground>",
  "equipment_needed": ["item1", "item2", "item3", "item4"],
  "safety_precautions": ["precaution1", "precaution2", "precaution3"],
  "priority_actions": ["action1", "action2", "action3"],
  "estimated_duration": "<realistic time estimate>",
  "special_notes": "<any critical note about vulnerable people or hazards>"
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return _rule_based_briefing(assignment, incident, nearest_camp)


def _rule_based_briefing(assignment: dict, incident: dict, nearest_camp) -> dict:
    disaster = incident.get("disaster_type", "Disaster")
    people = incident.get("people_trapped", 0)
    medical = incident.get("medical_emergency", False)
    village = incident.get("village", "")
    district = incident.get("district", "")

    equipment = ["First Aid Kit", "Communication Radio", "Flashlight", "Water & Rations"]
    if "flood" in disaster.lower():
        equipment += ["Life Jackets", "Rescue Rope"]
    if medical:
        equipment += ["Medical Kit", "Stretcher", "Oxygen"]
    if incident.get("children_present"):
        equipment.append("Child Safety Harness")

    return {
        "headline": f"{disaster} rescue — {people} people trapped in {village}, {district}",
        "situation_overview": f"Active {disaster.lower()} situation with {people} people requiring immediate rescue. {'Medical attention needed on-site.' if medical else 'No critical medical emergency reported.'} Coordinate with local authorities upon arrival.",
        "equipment_needed": equipment,
        "safety_precautions": ["Wear full protective gear before entering", "Maintain radio contact every 15 minutes", "Never enter unstable structures alone", "Mark and avoid hazardous zones"],
        "priority_actions": [f"Reach {village} via safest available route", "Assess and report situation to command center", "Prioritize children, elderly, and medical cases first"],
        "estimated_duration": "2-4 hours",
        "special_notes": f"{'Pregnant woman present — handle with extreme care.' if incident.get('pregnant_woman_present') else ''} {'Children on-site — ensure safe evacuation.' if incident.get('children_present') else ''}".strip() or "Follow standard rescue protocols.",
    }


async def forecast_supply(camps: list, incidents: list, bookings: list) -> dict:
    """Predict supply and capacity risks at relief camps using Gemini."""
    active_incidents = [i for i in incidents if i.get("status") not in ["Completed", "Closed"]]

    camp_summaries = []
    for camp in camps:
        active_bookings = [b for b in bookings if b.get("camp_id") == camp["id"] and b.get("status") == "Active"]
        pct = (camp.get("occupied", 0) / max(camp.get("capacity", 1), 1)) * 100
        nearby = [i for i in active_incidents if i.get("district", "").lower() == camp.get("district", "").lower()]
        camp_summaries.append({
            "name": camp.get("name"),
            "district": camp.get("district"),
            "occupancy_pct": round(pct, 1),
            "beds_available": camp.get("beds_available", 0),
            "food_stock_days": camp.get("food_stock_days", 0),
            "water_stock_liters": camp.get("water_stock_liters", 0),
            "medical_staff": camp.get("medical_staff", 0),
            "active_bookings": len(active_bookings),
            "nearby_active_incidents": len(nearby),
            "people_at_risk_nearby": sum(i.get("people_trapped", 0) for i in nearby),
        })

    if not AI_AVAILABLE:
        return _rule_based_forecast(camps, active_incidents)

    model = _get_model()
    if not model:
        return _rule_based_forecast(camps, active_incidents)

    prompt = f"""You are a disaster management AI analyst. Predict supply and capacity risks at these relief camps over the next 1-3 days.

CAMP DATA:
{json.dumps(camp_summaries, indent=2)}

Consider occupancy trends, food/water depletion rates, nearby incident-driven demand, and staffing.

Respond with ONLY valid JSON (no markdown):
{{
  "forecast_summary": "<2-3 sentence overall prediction>",
  "high_risk_camps": [
    {{
      "name": "<camp name>",
      "district": "<district>",
      "risk": "Critical|High|Medium",
      "predicted_issue": "<specific issue that will occur>",
      "predicted_timeframe": "<within X hours/days>",
      "recommended_action": "<single most important action>"
    }}
  ],
  "overall_risk_level": "Critical|High|Moderate|Low",
  "total_people_at_risk": <number>,
  "restock_priority": ["<camp1>", "<camp2>"]
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return _rule_based_forecast(camps, active_incidents)


def _rule_based_forecast(camps: list, active_incidents: list) -> dict:
    high_risk = []
    for camp in camps:
        pct = (camp.get("occupied", 0) / max(camp.get("capacity", 1), 1)) * 100
        nearby = [i for i in active_incidents if i.get("district", "").lower() == camp.get("district", "").lower()]
        issues, risk = [], "Low"

        if pct >= 80:
            issues.append(f"{round(pct)}% occupancy — near capacity")
            risk = "High"
        if camp.get("food_stock_days", 0) <= 3:
            issues.append(f"Food: {camp.get('food_stock_days', 0)} days remaining")
            risk = "High" if risk != "Critical" else "Critical"
        if camp.get("water_stock_liters", 0) < 2000:
            issues.append(f"Water critically low: {camp.get('water_stock_liters', 0)}L")
            risk = "Critical"
        if nearby:
            issues.append(f"{len(nearby)} active incident(s) nearby may surge demand")

        if issues:
            high_risk.append({
                "name": camp.get("name"),
                "district": camp.get("district"),
                "risk": risk,
                "predicted_issue": ". ".join(issues),
                "predicted_timeframe": "Within 24–48 hours",
                "recommended_action": "Restock supplies and prepare overflow capacity",
            })

    high_risk.sort(key=lambda x: {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}.get(x["risk"], 4))
    overall = "Critical" if any(h["risk"] == "Critical" for h in high_risk) else "High" if high_risk else "Low"

    return {
        "forecast_summary": f"{len(high_risk)} of {len(camps)} camps show elevated risk in the next 1–3 days. {len(active_incidents)} active incidents may increase displacement pressure.",
        "high_risk_camps": high_risk[:5],
        "overall_risk_level": overall,
        "total_people_at_risk": sum(i.get("people_trapped", 0) for i in active_incidents),
        "restock_priority": [h["name"] for h in high_risk[:3]],
    }


async def generate_situation_summary(incidents: list, resources: list, volunteers: list) -> dict:
    """Generate an AI summary of the current disaster situation."""
    active_incidents = [i for i in incidents if i.get("status") not in ["Completed", "Closed"]]
    critical = [i for i in active_incidents if i.get("priority") == "Critical"]
    high = [i for i in active_incidents if i.get("priority") == "High"]

    districts = {}
    for inc in active_incidents:
        d = inc.get("district", "Unknown")
        districts[d] = districts.get(d, 0) + 1

    most_affected = sorted(districts.items(), key=lambda x: x[1], reverse=True)[:3]

    available_resources = [r for r in resources if r.get("status") == "Available"]
    deployed_volunteers = [v for v in volunteers if v.get("status") == "Active" and v.get("approved")]

    if not AI_AVAILABLE:
        return _rule_based_summary(active_incidents, critical, high, most_affected, available_resources, deployed_volunteers)

    model = _get_model()
    if not model:
        return _rule_based_summary(active_incidents, critical, high, most_affected, available_resources, deployed_volunteers)

    prompt = f"""You are a senior disaster response analyst for the State Disaster Management Authority.
Generate a concise situation report based on this data:

Active Incidents: {len(active_incidents)}
Critical Priority: {len(critical)}
High Priority: {len(high)}
Most Affected Districts: {most_affected}
Available Resources: {len(available_resources)}
Active Volunteers: {len(deployed_volunteers)}

Sample Critical Incidents: {json.dumps([{'type': i.get('disaster_type'), 'district': i.get('district'), 'people': i.get('people_trapped', 0)} for i in critical[:3]], indent=2)}

Respond with ONLY valid JSON (no markdown):
{{
  "overall_situation": "<2-3 sentence overview>",
  "most_affected_regions": ["region1", "region2"],
  "resource_shortages": ["shortage1", "shortage2"],
  "top_priorities": ["priority1", "priority2", "priority3"],
  "recommended_actions": ["action1", "action2", "action3"],
  "severity_level": "Severe|High|Moderate|Low",
  "estimated_affected_population": <number>
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return _rule_based_summary(active_incidents, critical, high, most_affected, available_resources, deployed_volunteers)


def _rule_based_summary(active_incidents, critical, high, most_affected, available_resources, deployed_volunteers) -> dict:
    regions = [d[0] for d in most_affected]
    shortages = []
    if len(available_resources) < 5:
        shortages.append("Rescue Boats")
    if len(deployed_volunteers) < 10:
        shortages.append("Trained Volunteers")

    severity = "Severe" if len(critical) > 3 else "High" if len(critical) > 0 else "Moderate" if len(high) > 0 else "Low"

    return {
        "overall_situation": f"There are currently {len(active_incidents)} active incidents requiring immediate attention. {len(critical)} critical and {len(high)} high-priority cases need urgent response.",
        "most_affected_regions": regions or ["Data unavailable"],
        "resource_shortages": shortages or ["No critical shortages reported"],
        "top_priorities": [
            f"Address {len(critical)} critical incidents immediately",
            "Deploy medical teams to affected areas",
            "Ensure relief camps are operational",
        ],
        "recommended_actions": [
            "Mobilize additional rescue teams",
            "Open emergency relief camps in affected districts",
            "Coordinate with district collectors for resource allocation",
        ],
        "severity_level": severity,
        "estimated_affected_population": sum(i.get("people_trapped", 0) for i in active_incidents),
    }
