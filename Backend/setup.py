"""
Run this script once to initialize the DRCS with sample data.
Usage: python setup.py
"""
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from passlib.context import CryptContext
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def gid():
    return str(uuid.uuid4())

def now(offset_hours=0):
    return (datetime.utcnow() - timedelta(hours=offset_hours)).isoformat() + "Z"

def write(filename, data):
    with open(DATA_DIR / filename, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  ✓ {filename}")

print("\n🚀 Initializing DRCS Sample Data...\n")

# --- USERS ---
users = [
    {
        "id": gid(),
        "name": "Priya Sharma",
        "email": "citizen@drcs.gov.in",
        "phone": "9876543210",
        "password": pwd_context.hash("password123"),
        "role": "citizen",
        "district": "Patna",
        "address": "14, Gandhi Nagar, Patna",
        "created_at": now(200),
        "is_active": True,
    },
    {
        "id": gid(),
        "name": "Rajan Kumar",
        "email": "volunteer@drcs.gov.in",
        "phone": "9876543211",
        "password": pwd_context.hash("password123"),
        "role": "volunteer",
        "district": "Muzaffarpur",
        "address": "22, Station Road, Muzaffarpur",
        "created_at": now(150),
        "is_active": True,
    },
    {
        "id": gid(),
        "name": "DM Ananya Singh",
        "email": "authority@drcs.gov.in",
        "phone": "9876543212",
        "password": pwd_context.hash("password123"),
        "role": "authority",
        "district": "All Districts",
        "address": "SDMA Headquarters, Patna",
        "created_at": now(500),
        "is_active": True,
    },
]
write("users.json", users)

citizen_id = users[0]["id"]

# --- INCIDENTS ---
districts = ["Patna", "Muzaffarpur", "Darbhanga", "Sitamarhi", "Supaul", "Katihar", "Samastipur", "Vaishali"]
disaster_types = ["Flood", "Cyclone", "Earthquake", "Fire", "Landslide", "Lightning Strike"]
priorities = ["Critical", "High", "Medium", "Low"]
statuses = ["Pending", "Under Review", "Rescue Assigned", "In Progress", "Completed"]

coords = {
    "Patna": (25.5941, 85.1376),
    "Muzaffarpur": (26.1209, 85.3647),
    "Darbhanga": (26.1522, 85.8970),
    "Sitamarhi": (26.5920, 85.4888),
    "Supaul": (26.1243, 86.6029),
    "Katihar": (25.5348, 87.5728),
    "Samastipur": (25.8630, 85.7808),
    "Vaishali": (25.9928, 85.1284),
}

incidents = []
for i in range(12):
    district = random.choice(districts)
    lat, lng = coords[district]
    lat += random.uniform(-0.3, 0.3)
    lng += random.uniform(-0.3, 0.3)
    people = random.randint(1, 50)
    med = random.choice([True, False, False])
    children = random.choice([True, False, False])
    seniors = random.choice([True, False, False])
    pregnant = random.choice([True, False, False, False])

    score = 0
    score += min(people * 5, 40)
    if med: score += 25
    if pregnant: score += 20
    if children: score += 15
    if seniors: score += 10
    score = min(score, 100)

    if score >= 70: priority = "Critical"
    elif score >= 45: priority = "High"
    elif score >= 20: priority = "Medium"
    else: priority = "Low"

    status = random.choice(statuses) if i > 2 else "Pending"
    if i == 0:
        status = "Critical"
        priority = "Critical"
    elif i < 3:
        status = "Rescue Assigned"

    incidents.append({
        "id": gid(),
        "user_id": citizen_id if i % 3 == 0 else gid(),
        "name": f"Resident {i+1}",
        "phone": f"98765{43200+i:05d}",
        "district": district,
        "village": f"Village {chr(65+i)}",
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "disaster_type": random.choice(disaster_types),
        "people_trapped": people,
        "children_present": children,
        "senior_citizens_present": seniors,
        "medical_emergency": med,
        "pregnant_woman_present": pregnant,
        "water_level": random.choice(["Low", "Medium", "High", "Very High", "Severe"]),
        "description": f"Urgent help needed in {district}. {people} people are stranded. {'Medical emergency reported.' if med else ''} {'Children need immediate evacuation.' if children else ''}",
        "priority": priority,
        "priority_score": score,
        "priority_reasoning": f"Priority assessed based on {people} trapped persons and vulnerability factors.",
        "recommended_resources": ["Medical Team", "Rescue Boats"] if med else ["Rescue Boats"],
        "estimated_response_time": "30-60 minutes" if priority in ["Critical", "High"] else "1-3 hours",
        "status": status,
        "image_url": None,
        "created_at": now(random.randint(1, 72)),
        "updated_at": now(random.randint(0, 1)),
    })

write("incidents.json", incidents)

# --- RESOURCES ---
resource_types = [
    ("Rescue Boat", "Boats", 15),
    ("Ambulance", "Medical", 8),
    ("Fire Truck", "Fire", 5),
    ("Medical Kit", "Medical", 30),
    ("Food Truck", "Supply", 10),
    ("Generator", "Power", 12),
    ("Water Pump", "Water", 20),
    ("Helicopter", "Air", 3),
]

resources = []
for rtype, category, count in resource_types:
    for j in range(count):
        status = random.choice(["Available", "Available", "Assigned", "Maintenance"])
        resources.append({
            "id": gid(),
            "name": f"{rtype} {j+1:02d}",
            "type": rtype,
            "category": category,
            "district": random.choice(districts),
            "status": status,
            "assigned_to": None,
            "last_maintained": now(random.randint(10, 200)),
            "created_at": now(500),
        })

write("resources.json", resources)

# --- VOLUNTEERS ---
skills_pool = ["First Aid", "Swimming", "Rescue Operations", "Medical", "Communication", "Driving", "Cooking", "Logistics"]
blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

volunteers = []
names = ["Arun Kumar", "Sunita Devi", "Ramesh Singh", "Kavita Sharma", "Vikram Yadav",
         "Meena Kumari", "Suresh Prasad", "Anita Roy", "Deepak Jha", "Nisha Verma",
         "Manoj Kumar", "Priya Das", "Rohit Pandey", "Sita Devi", "Ajay Singh"]

for i, name in enumerate(names):
    volunteers.append({
        "id": gid(),
        "name": name,
        "email": f"vol{i+1}@drcs.gov.in",
        "phone": f"98765{43300+i:05d}",
        "blood_group": random.choice(blood_groups),
        "skills": random.sample(skills_pool, random.randint(2, 4)),
        "district": random.choice(districts),
        "availability": random.choice(["Full Time", "Part Time", "Weekends", "On Call"]),
        "approved": i < 10,
        "status": "Active" if i < 8 else ("Inactive" if i < 12 else "Pending"),
        "assigned_incident_id": incidents[i % len(incidents)]["id"] if i < 5 else None,
        "created_at": now(random.randint(10, 200)),
        "approved_at": now(random.randint(1, 10)) if i < 10 else None,
    })

write("volunteers.json", volunteers)

# --- ASSIGNMENTS ---
assignments = []
team_types = ["Boat Rescue Team", "Medical Team", "Fire Team", "Police Unit", "Volunteer Group", "Army Unit"]
for i in range(5):
    inc = incidents[i]
    assignments.append({
        "id": gid(),
        "incident_id": inc["id"],
        "team_type": random.choice(team_types),
        "team_members": [volunteers[j]["id"] for j in range(min(3, len(volunteers)))],
        "resource_ids": [resources[j]["id"] for j in range(min(2, len(resources)))],
        "eta": f"{random.randint(15, 120)} minutes",
        "notes": "Rescue team en route. Please stay in a safe location and wave a cloth to signal your position.",
        "status": random.choice(["Dispatched", "En Route", "On Site", "Completed"]),
        "assigned_by": users[2]["id"],
        "assigned_at": now(random.randint(1, 5)),
        "completed_at": now(1) if i == 4 else None,
    })

write("assignments.json", assignments)

# --- RELIEF CAMPS ---
camp_names = ["Patna Relief Center", "Muzaffarpur Shelter", "Darbhanga Camp Alpha", "Sitamarhi Relief Hub", "Supaul Emergency Camp"]
camps = []
for i, camp_name in enumerate(camp_names):
    district = districts[i]
    capacity = random.randint(200, 1000)
    occupied = random.randint(50, capacity)
    lat, lng = coords[district]
    camps.append({
        "id": gid(),
        "name": camp_name,
        "district": district,
        "address": f"NH-{random.randint(10, 99)}, {district}",
        "lat": round(lat + random.uniform(-0.1, 0.1), 6),
        "lng": round(lng + random.uniform(-0.1, 0.1), 6),
        "capacity": capacity,
        "occupied": occupied,
        "beds_available": capacity - occupied,
        "medical_staff": random.randint(2, 15),
        "food_stock_days": random.randint(1, 10),
        "water_stock_liters": random.randint(1000, 20000),
        "status": "Active" if occupied < capacity * 0.9 else "Full",
        "contact_person": f"Camp Manager {i+1}",
        "contact_phone": f"98765{43400+i:05d}",
        "facilities": random.sample(["Medical Unit", "Kitchen", "Toilets", "Generator", "Internet", "Water Purification"], random.randint(3, 6)),
        "created_at": now(random.randint(10, 50)),
        "updated_at": now(random.randint(0, 2)),
    })

write("relief_camps.json", camps)

# --- NOTIFICATIONS ---
notifications = []
for i, inc in enumerate(incidents[:5]):
    notifications.append({
        "id": gid(),
        "user_id": citizen_id,
        "title": "Incident Report Received",
        "message": f"Your incident report from {inc['district']} has been received and is being reviewed.",
        "type": "success",
        "incident_id": inc["id"],
        "read": i > 2,
        "created_at": now(random.randint(1, 10)),
    })

    if inc.get("status") == "Rescue Assigned":
        notifications.append({
            "id": gid(),
            "user_id": citizen_id,
            "title": "Rescue Team Assigned",
            "message": f"A rescue team has been dispatched to your location. ETA: 45 minutes.",
            "type": "info",
            "incident_id": inc["id"],
            "read": i > 1,
            "created_at": now(random.randint(1, 5)),
        })

write("notifications.json", notifications)

print(f"""
✅ Sample data initialized successfully!

Demo Accounts:
  👤 Citizen:   citizen@drcs.gov.in   / password123
  🙋 Volunteer: volunteer@drcs.gov.in / password123
  🏛️  Authority: authority@drcs.gov.in / password123

Data Created:
  📋 {len(incidents)} Incidents
  👥 {len(volunteers)} Volunteers
  🔧 {len(resources)} Resources
  🏕️  {len(camps)} Relief Camps
  📢 {len(notifications)} Notifications
  👤 {len(users)} Users

Now start the server:
  uvicorn main:app --reload --port 8000
""")
