import {
  BookOpen,
  Dumbbell,
  BriefcaseMedical,
  Apple,
  Coffee,
  Footprints,
  GraduationCap,
  FlaskConical,
} from "lucide-react";

// Reiss Science Building POIs
export const reissPOIs = [
  {
    "id": "reiss_1",
    "name": "172A",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.909747089999996,
      "longitude": -77.073533865
    },
    "description": "Classroom 172A in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_2",
    "name": "172",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.909656745,
      "longitude": -77.07344853000001
    },
    "description": "Classroom 172 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_3",
    "name": "152",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.90958983,
      "longitude": -77.07338731
    },
    "description": "Classroom 152 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_4",
    "name": "154",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.90948469,
      "longitude": -77.073283535
    },
    "description": "Classroom 154 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_5",
    "name": "156",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.90938118,
      "longitude": -77.073186575
    },
    "description": "Classroom 156 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_6",
    "name": "103",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.909402505,
      "longitude": -77.07338786
    },
    "description": "Classroom 103 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_7",
    "name": "112",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.909639655,
      "longitude": -77.07361238
    },
    "description": "Classroom 112 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_8",
    "name": "185",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.90970344,
      "longitude": -77.07378564499999
    },
    "description": "Classroom 185 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  },
  {
    "id": "reiss_9",
    "name": "186",
    "type": "class",
    "building": "Reiss Science Building",
    "level": 0,
    "coordinates": {
      "latitude": 38.909638705,
      "longitude": -77.07373391499999
    },
    "description": "Classroom 186 in Reiss Science Building",
    "amenities": [
      "projector",
      "whiteboard",
      "seating"
    ],
    "searchable": true,
    "category": "education"
  }
];

const topLocations = [
  {
    name: "Library",
    icon: BookOpen,
    colors: "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100",
  },
  {
    name: "Gymnasium",
    icon: Dumbbell,
    colors:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100",
  },
  {
    name: "Nurse's Office",
    icon: BriefcaseMedical,
    colors: "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100",
  },
  {
    name: "Teachers Room",
    icon: Apple,
    colors:
      "bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-100",
  },
  {
    name: "Cafeteria",
    icon: Coffee,
    colors: "bg-amber-100 text-amber-700 dark:bg-amber-700 dark:text-amber-100",
  },
  {
    name: "Exit",
    icon: Footprints,
    colors: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
  },
  // Reiss Science Building Classrooms
  {
    name: "Classroom 172A",
    icon: GraduationCap,
    colors: "bg-cyan-100 text-cyan-700 dark:bg-cyan-700 dark:text-cyan-100",
    building: "Reiss Science Building",
    coordinates: {"latitude":38.909747089999996,"longitude":-77.073533865}
  },
  {
    name: "Classroom 172",
    icon: GraduationCap,
    colors: "bg-cyan-100 text-cyan-700 dark:bg-cyan-700 dark:text-cyan-100",
    building: "Reiss Science Building",
    coordinates: {"latitude":38.909656745,"longitude":-77.07344853000001}
  },
  {
    name: "Classroom 152",
    icon: GraduationCap,
    colors: "bg-cyan-100 text-cyan-700 dark:bg-cyan-700 dark:text-cyan-100",
    building: "Reiss Science Building",
    coordinates: {"latitude":38.90958983,"longitude":-77.07338731}
  },
  {
    name: "Lab 103",
    icon: FlaskConical,
    colors: "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100",
    building: "Reiss Science Building",
    coordinates: {"latitude":38.909402505,"longitude":-77.07338786}
  },
];

export default topLocations;
