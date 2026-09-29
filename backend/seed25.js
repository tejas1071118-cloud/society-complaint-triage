const axios = require('axios');

const complaints = [
    { flat_number: "101", name: "Rahul", phone: "999", description: "Lift B is stuck between floors, two kids inside crying! emergency" },
    { flat_number: "205", name: "Amit", phone: "999", description: "stuck in lift A, fire alarm ringing" },
    { flat_number: "302", name: "Priya", phone: "999", description: "no water since morning in C wing" },
    { flat_number: "304", name: "Neha", phone: "999", description: "pani nahi aa raha hai kitchen me 2 din se" },
    { flat_number: "306", name: "Rohan", phone: "999", description: "water leak in bathroom from upper floor" },
    { flat_number: "401", name: "Simran", phone: "999", description: "kal se paani supply band hai" },
    { flat_number: "405", name: "Vijay", phone: "999", description: "urgent water issue no supply at all" },
    { flat_number: "408", name: "Kavita", phone: "999", description: "water pressure very low" },
    { flat_number: "501", name: "Anand", phone: "999", description: "someone parked in my slot again" },
    { flat_number: "505", name: "Suresh", phone: "999", description: "stranger car in visitor parking since 3 days" },
    { flat_number: "602", name: "Pooja", phone: "999", description: "loud music from flat 603" },
    { flat_number: "604", name: "Karan", phone: "999", description: "dog barking very loud at night" },
    { flat_number: "701", name: "Deepak", phone: "999", description: "garbage not collected from corridor" },
    { flat_number: "703", name: "Anita", phone: "999", description: "kachra pada hai stair case pe" },
    { flat_number: "802", name: "Ravi", phone: "999", description: "guard is sleeping at main gate" },
    { flat_number: "805", name: "Sunil", phone: "999", description: "unknown person roaming in society" },
    { flat_number: "901", name: "Meena", phone: "999", description: "gym treadmill not working" },
    { flat_number: "904", name: "Sanjay", phone: "999", description: "light bulb fused in lobby" },
    { flat_number: "1002", name: "Alok", phone: "999", description: "water dripping from AC unit" },
    { flat_number: "1005", name: "Geeta", phone: "999", description: "lift button not working on 10th floor" },
    { flat_number: "1101", name: "Harish", phone: "999", description: "kids playing cricket in parking lot, risk damaging cars" },
    { flat_number: "1104", name: "Maya", phone: "999", description: "staircase very dirty needs cleaning" },
    { flat_number: "1202", name: "Nitin", phone: "999", description: "security gate boom barrier broken" },
    { flat_number: "1205", name: "Rekha", phone: "999", description: "no water in washroom" },
    { flat_number: "102", name: "Vikas", phone: "999", description: "lift door making weird noise" }
];

async function run() {
    for (let c of complaints) {
        try {
            await axios.post('http://localhost:3001/api/complaints', c);
            console.log("Submitted:", c.description);
        } catch(e) {
            console.error("Failed:", c.description);
        }
    }
}
run();
