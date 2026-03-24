// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_APP",
  projectId: "YOUR_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser;
let map;
let path = [];
let speeds = [];
let lastPoint = null;

// Resorts
const resorts = [
  { name: "Glenshee", lat: 56.874, lon: -3.413 },
  { name: "Cairngorm", lat: 57.137, lon: -3.670 },
  { name: "Nevis Range", lat: 56.819, lon: -4.970 },
  { name: "Les Deux Alpes", lat: 45.015, lon: 6.124 },
  { name: "Val Thorens", lat: 45.297, lon: 6.583 },
  { name: "Saalbach-Hinterglemm", lat: 47.391, lon: 12.637 }
];

// 🔐 AUTH
function signup() { auth.createUserWithEmailAndPassword(email.value, password.value); }
function login() { auth.signInWithEmailAndPassword(email.value, password.value); }
function logout() { auth.signOut(); }

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth").style.display = "none";
    document.getElementById("app").classList.remove("hidden");
    initMap();
    loadData();
    loadLeaderboard();
  }
});

// RUNS
function addRun() {
  const ref = db.collection("users").doc(currentUser.uid);
  ref.get().then(doc => {
    let runs = doc.exists ? doc.data().runs : 0;
    runs++;
    ref.set({ runs });
    document.getElementById("runs").innerText = runs;
  });
}

function loadData() {
  db.collection("users").doc(currentUser.uid).get().then(doc => {
    if (doc.exists) document.getElementById("runs").innerText = doc.data().runs;
  });
}

// MAP
function initMap() {
  map = L.map('map').setView([46, 10], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// TRACKING + AI ANALYSIS
function startTracking() {
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const alt = pos.coords.altitude || 0;

    map.setView([lat, lon], 13);

    path.push([lat, lon]);
    L.polyline(path).addTo(map);

    // SPEED
    if (lastPoint) {
      const dist = getDistance(lastPoint.lat, lastPoint.lon, lat, lon);
      const speed = dist * 3600;
      speeds.push(speed);
      detectRun(speed, alt);
      updateLiveLocation(lat, lon);
      detectResort(lat, lon);
      updateChart();
    }

    lastPoint = { lat, lon };
  }, err => alert("GPS error"), { enableHighAccuracy: true });
}

// AI-STYLE RUN DETECTION
let isSkiing = false;
let currentRun = [];
function detectRun(speed, altitude) {
  if (speed > 15) { isSkiing = true; currentRun.push({ speed, altitude }); } 
  else if (speed < 5 && isSkiing) { isSkiing = false; analyzeRun(currentRun); saveRun(currentRun); currentRun = []; }
}

// ANALYSIS
function analyzeRun(run) {
  const avgSpeed = run.reduce((a,b)=>a+b.speed,0)/run.length;
  const maxSpeed = Math.max(...run.map(r=>r.speed));
  let skill = "Beginner";
  if (avgSpeed>20) skill="Intermediate";
  if (avgSpeed>40) skill="Advanced";
  alert(`🏔️ Run Analysis:\nAvg Speed: ${avgSpeed.toFixed(1)} km/h\nMax Speed: ${maxSpeed.toFixed(1)} km/h\nLevel: ${skill}`);
}

// SAVE RUN
function saveRun(runData) {
  db.collection("runs").add({ user: currentUser.uid, data: runData, created: Date.now() });
}

// AUTO RESORT DETECTION
function detectResort(lat, lon) {
  let nearest=null, min=Infinity;
  resorts.forEach(r=>{
    const d=getDistance(lat,lon,r.lat,r.lon);
    if(d<min){min=d;nearest=r;}
  });
  if(min<10) document.getElementById("location").innerText="🏔️ You are at "+nearest.name;
}

// LIVE LOCATION
function updateLiveLocation(lat, lon) {
  db.collection("locations").doc(currentUser.uid).set({ lat, lon });
}

// LEADERBOARD
function loadLeaderboard() {
  db.collection("users").orderBy("runs","desc").limit(10).get().then(snapshot=>{
    const list=document.getElementById("leaderboard"); list.innerHTML="";
    snapshot.forEach(doc=>{
      const li=document.createElement("li");
      li.innerText=doc.data().runs+" runs"; list.appendChild(li);
    });
  });
}

// SPEED CHART
let chart;
function updateChart() {
  const ctx=document.getElementById("speedChart");
  if(!chart){chart=new Chart(ctx,{type:'line',data:{labels:speeds.map((_,i)=>i),datasets:[{label:'Speed km/h',data:speeds}]}});}
  else{chart.data.labels=speeds.map((_,i)=>i); chart.data.datasets[0].data=speeds; chart.update();}
}

// DISTANCE CALC
function getDistance(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
