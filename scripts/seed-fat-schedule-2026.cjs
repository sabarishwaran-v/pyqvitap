/**
 * PyqVitAp FAT Schedule Seeder - Fall Semester (2026-27)
 * Seeds the 14 exam days into MongoDB `UpcomingSchedule` collection
 * and triggers immediate sync for Day 1.
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

function getMongoUri() {
  for (const file of [".env", ".dev.vars", ".env.local"]) {
    const p = path.resolve(process.cwd(), file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        if (line.startsWith("MONGODB_URI=")) {
          return line.split("=").slice(1).join("=").trim().replace(/^["\x27]|["\x27]$/g, "");
        }
      }
    }
  }
  return process.env.MONGODB_URI;
}

const FAT_SCHEDULE_2026 = [
  {
    date: "2026-11-16",
    slot: "A",
    subSlot: "A1",
    courseCodes: [
      "CHY1005", "CHY4301", "CSE2018", "CSE2019", "CSE2025", "CSE3002", "CSE3008",
      "CSE4006", "CSE4007", "ECE2001", "ECE2002", "ECE2003", "FRL1001", "FRL1004",
      "HUM2111", "LAW2101", "LAW5110", "LIB1016", "LIB1020", "LIB1101", "LIB1102",
      "LIB2019", "LIB2023", "MAT1006", "MAT1007", "MAT4203", "MEC2002", "MEC3029",
      "MGT1034", "PHY2001", "PHY2005", "PHY2100", "STS2010", "SWE2009"
    ]
  },
  {
    date: "2026-11-17",
    slot: "A",
    subSlot: "A2",
    courseCodes: [
      "CSE0109", "CSE2018", "CSE2019", "CSE2025", "CSE3002", "CSE3008", "CSE4006",
      "CSE4007", "ECE2001", "ECE2002", "ECE2005", "FRL1005", "HUM2117", "LAW2101",
      "LAW2110", "LAW5112", "LIB1020", "LIB1024", "LIB1101", "LIB2016", "LIB2108",
      "MAT1007", "MAT2101", "MAT3106", "MEC2002", "MEC3029", "MGT3001", "PHY2001",
      "PHY2006", "STS2010", "SWE2009"
    ]
  },
  {
    date: "2026-11-18",
    slot: "B",
    subSlot: "B1",
    courseCodes: [
      "CHY4307", "CSE0305", "CSE0602", "CSE2009", "CSE2013", "CSE2016", "CSE2025",
      "CSE3024", "CSE3028", "CSE3036", "CSE3041", "CSE4003", "CSE4007", "ECE2002",
      "ECE2005", "ECE2006", "ENG1017", "FRL1001", "LAW5111", "LIB2007", "LIB2021",
      "LIB4101", "MAT1003", "MEC2003", "MEC3026", "MGT1117", "MGT3130", "MGT3224",
      "PHY2001", "PHY2003", "STS2010", "SWE1002", "SWE3002"
    ]
  },
  {
    date: "2026-11-19",
    slot: "B",
    subSlot: "B2",
    courseCodes: [
      "CSE2009", "CSE2013", "CSE2016", "CSE2025", "CSE3024", "CSE3028", "CSE3041",
      "CSE4005", "CSE4007", "CSE4049", "ECE2002", "ECE2005", "ECE2006", "ECE2014",
      "ENG2013", "FRL1005", "FRL2004", "HUM3103", "HUM3109", "LAW2111", "LAW4102",
      "MAT1003", "MAT2103", "MEC2003", "MEC2017", "MGT2109", "MGT3224", "PHY2005",
      "STS2010", "SWE1002", "SWE3002"
    ]
  },
  {
    date: "2026-11-20",
    slot: "C",
    subSlot: "C1",
    courseCodes: [
      "CSE0207", "CSE0601", "CSE2004", "CSE2015", "CSE3002", "CSE3009", "CSE3014",
      "CSE4006", "CSE4011", "CSE4012", "CSE4039", "ECE2003", "ECE2006", "ECE2014",
      "FRL1001", "LAW2104", "LAW5113", "LIB1020", "LIB1024", "LIB3201", "MAT1003",
      "MEC2004", "MEC4003", "MGT1043", "MGT1109", "MGT3121", "MGT3202", "PHY2004",
      "STS2010", "STS3007", "SWE2001", "SWE3003"
    ]
  },
  {
    date: "2026-11-21",
    slot: "C",
    subSlot: "C2",
    courseCodes: [
      "CSE0208", "CSE2015", "CSE3002", "CSE3009", "CSE3014", "CSE4006", "CSE4011",
      "CSE4012", "CSE4016", "CSE4039", "ECE2001", "ECE2003", "ECE2014", "FRL1001",
      "HUM2002", "LAW2112", "LAW4103", "LIB1020", "LIB1111", "LIB2016", "MAT1003",
      "MEC2004", "MGT1109", "MGT2112", "MGT3101", "PHY2005", "STS2010", "STS3007",
      "SWE2001", "SWE3003"
    ]
  },
  {
    date: "2026-11-23",
    slot: "D",
    subSlot: "D1",
    courseCodes: [
      "CHY4208", "CSE2001", "CSE2008", "CSE2027", "CSE2028", "CSE3004", "CSE3040",
      "CSE4050", "ECE4012", "ENG2014", "FRL1004", "LAW2102", "LAW5114", "LIB2123",
      "MAT1107", "MAT2001", "MAT3103", "MAT4201", "MGT1024", "MGT2112", "MGT2122",
      "MGT3001", "MGT4100", "PHY2005", "STS2006", "STS2010", "STS3006", "STS3007",
      "STS4006", "SWE2007", "SWE4004", "SWE4007"
    ]
  },
  {
    date: "2026-11-24",
    slot: "D",
    subSlot: "D2",
    courseCodes: [
      "CHY1007", "CSE2001", "CSE2008", "CSE2027", "CSE3001", "CSE3004", "CSE3040",
      "CSE4039", "ECE2007", "FRL2004", "FRL2005", "HUM2118", "HUM3108", "LAW2102",
      "LAW3101", "LAW4106", "MEC3028", "MGT1015", "MGT1024", "MGT2122", "MGT3001",
      "MGT3202", "MGT3222", "STS2006", "STS2010", "STS3006", "STS3007", "STS3008",
      "SWE2007", "SWE4004", "SWE4007"
    ]
  },
  {
    date: "2026-11-25",
    slot: "E",
    subSlot: "E1",
    courseCodes: [
      "CSE0302", "CSE0402", "CSE0603", "CSE1013", "CSE2001", "CSE3003", "CSE3004",
      "CSE3006", "CSE4033", "CSE4047", "ECE2009", "ECE3005", "ECE4007", "ENG1018",
      "FRL1004", "HUM1104", "HUM1108", "LAW5109", "LIB2124", "MAT2005", "MEC3005",
      "MGT1040", "MGT2103", "MGT3131", "STS2006", "STS2010", "STS3006", "STS3007",
      "SWE3004", "SWE4010"
    ]
  },
  {
    date: "2026-11-26",
    slot: "E",
    subSlot: "E2",
    courseCodes: [
      "CHY1007", "CSE0302", "CSE1013", "CSE2001", "CSE2028", "CSE3003", "CSE3004",
      "CSE4033", "CSE4040", "ECE3005", "FRL1001", "HUM2119", "HUM3110", "LAW2103",
      "LAW2115", "LAW3102", "MAT1110", "MGT1040", "MGT2103", "STS2010", "STS3006",
      "STS3007", "SWE3004"
    ]
  },
  {
    date: "2026-11-27",
    slot: "F",
    subSlot: "F1",
    courseCodes: [
      "CHY2001", "CHY2002", "CHY4310", "CSE1022", "CSE2008", "CSE2026", "CSE2027",
      "CSE3001", "CSE3003", "CSE3015", "CSE4021", "ECE2013", "ECE4002", "ECE4003",
      "FRL1001", "HUM2002", "LAW2103", "LAW5107", "LIB1024", "LIB2010", "MGT1003",
      "MGT1040", "MGT2010", "MGT2016", "MGT2101", "MGT2102", "MGT3101", "STS2006",
      "STS2010", "STS3006", "STS3007", "STS5002", "SWE2008", "SWE4008"
    ]
  },
  {
    date: "2026-11-28",
    slot: "F",
    subSlot: "F2",
    courseCodes: [
      "CHY2002", "CSE1022", "CSE2008", "CSE2027", "CSE3003", "CSE3015", "CSE4021",
      "ECE2013", "ECE4002", "ECE4005", "ENG1014", "FRL1004", "FRL1005", "HUM2002",
      "HUM2120", "LAW2113", "LAW4101", "LIB1019", "LIB3106", "MAT2003", "MEC3012",
      "MGT1034", "MGT1040", "MGT2010", "MGT2102", "MGT2103", "MGT3101", "STS2006",
      "STS2010", "STS3006", "STS3007", "SWE2008", "SWE4008"
    ]
  },
  {
    date: "2026-11-30",
    slot: "G",
    subSlot: "G1",
    courseCodes: [
      "ENG2008", "FRL1001", "FRL1005", "LAW2100", "LIB2006", "LIB2019", "LIB2115",
      "MGT1040", "MGT1105", "STS2003", "STS2010", "STS3007"
    ]
  },
  {
    date: "2026-12-01",
    slot: "G",
    subSlot: "G2",
    courseCodes: [
      "CSE0401", "CSE0506", "ECE0401", "ENG2008", "FRL1005", "HUM2014", "LAW1108",
      "LAW2100", "LIB1013", "LIB2006", "LIB2019", "MGT1105", "MGT3120", "STS2010",
      "STS3006", "STS3007"
    ]
  }
];

async function seed() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error("MONGODB_URI not found in environment or .dev.vars / .env");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB successfully.");

  const scheduleCollection = mongoose.connection.collection("upcomingschedules");
  const slotCollection = mongoose.connection.collection("upcomingslots");
  const subjectCollection = mongoose.connection.collection("upcomingsubjects");
  const coursesCollection = mongoose.connection.collection("courses");
  const courseCountsCollection = mongoose.connection.collection("coursec嚐unts"); // fallback

  // 1. Clear old schedules
  await scheduleCollection.deleteMany({});
  console.log("Cleared old UpcomingSchedules.");

  // 2. Insert the 14 FAT schedule documents
  const documents = FAT_SCHEDULE_2026.map((item) => ({
    date: item.date,
    slot: item.slot,
    courseCodes: item.courseCodes,
    sessions: {
      [item.subSlot]: item.courseCodes
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await scheduleCollection.insertMany(documents);
  console.log(`Inserted ${documents.length} FAT schedule days into UpcomingSchedule.`);

  // 3. Update UpcomingSlot to FAT mode with reset lastSyncedDate to trigger sync
  await slotCollection.findOneAndUpdate(
    {},
    {
      $set: {
        syncMode: "FAT",
        lastSyncedDate: "",
        slot: "A"
      }
    },
    { upsert: true }
  );
  console.log("Configured UpcomingSlot to syncMode: FAT.");

  // 4. Resolve Day 1 courses to populate upcoming subjects immediately
  const day1 = FAT_SCHEDULE_2026[0];
  const allCourses = await coursesCollection.find({}, { projection: { name: 1 } }).toArray();

  const courseMap = new Map();
  for (const c of allCourses) {
    const match = c.name.match(/\[(.*?)\]/);
    if (match && match[1]) {
      courseMap.set(match[1].trim().toUpperCase(), c.name);
    }
  }

  const finalSubjects = [];
  for (const code of day1.courseCodes) {
    const fullName = courseMap.get(code) || `${code} [${code}]`;
    finalSubjects.push({
      subject: fullName,
      slots: [day1.subSlot],
      count: 0
    });
  }

  await subjectCollection.deleteMany({});
  if (finalSubjects.length > 0) {
    await subjectCollection.insertMany(finalSubjects);
  }
  console.log(`Populated ${finalSubjects.length} Day 1 (${day1.date} / ${day1.subSlot}) courses into UpcomingSubject.`);

  await mongoose.disconnect();
  console.log("Seeding and sync completed successfully!");
}

seed().catch((err) => {
  console.error("FAT Schedule seeding error:", err);
  process.exit(1);
});
