// 🧠 LOCAL STORAGE LOGIN & ENCRYPTION
function encrypt(text, key = 129) {
  return text.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
}

function decrypt(text, key = 129) {
  return text.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
}

function saveLogin(email, password) {
  const data = email + ":" + password;
  const encrypted = encrypt(data);
  localStorage.setItem('skiLogin', btoa(encrypted));
}

function loadLogin() {
  const encrypted = localStorage.getItem('skiLogin');
  if(!encrypted) return null;
  const data = decrypt(atob(encrypted));
  const [email, password] = data.split(':');
  return { email, password };
}

// USERS & STATS STORAGE
function saveUserStats(user, stats) {
  localStorage.setItem("skiUser_" + user, JSON.stringify(stats));
}

function loadUserStats(user) {
  const stats = localStorage.getItem("skiUser_" + user);
  if(stats) return JSON.parse(stats);
  return { runs: 0 };
}

// CURRENT USER
let currentUser = null;

// AUTO-LOGIN
window.addEventListener('load', () => {
  const creds = loadLogin();
  if(creds) {
    email.value = creds.email;
    password.value = creds.password;
    login(); // attempt auto-login
  }
});

// SIGNUP & LOGIN
function signup() {
  const e = email.value;
  const p = password.value;
  if(!e || !p) return alert("Enter email and password");
  saveLogin(e, p);
  currentUser = e;
  initApp();
}

function login() {
  const e = email.value;
  const p = password.value;
  const saved = loadLogin();
  if(saved && saved.email === e && saved.password === p) {
    currentUser = e;
    initApp();
  } else {
    alert("Invalid login or user not signed up");
  }
}

function logout() {
  currentUser = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("app").classList.add("hidden");
}

// INITIALIZE APP AFTER LOGIN
function initApp() {
  document.getElementById("auth").style.display = "none";
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("userLabel").innerText = currentUser;
  loadStats();
  loadLeaderboard();
  initMap();
}

// STATS
function addRun() {
  const stats = loadUserStats(currentUser);
  stats.runs++;
  saveUserStats(currentUser, stats);
  document.getElementById("runs").innerText = stats.runs;
}

function loadStats() {
  const stats = loadUserStats(currentUser);
  document.getElementById("runs").innerText = stats.runs;
}

// LEADERBOARD
function loadLeaderboard() {
  const list = document.getElementById("leaderboard");
  list.innerHTML = "";
  for(let key in localStorage){
    if(key.startsWith("skiUser_")){
      const user = key.replace("skiUser_", "");
      const stats = JSON.parse(localStorage.getItem(key));
      const li = document.createElement("li");
      li.innerText = user + ": " + stats.runs + " runs";
      list.appendChild(li);
    }
  }
}

// MAP & GPS TRACKING
let map;
let path = [];
let speeds = [];
let lastPoint = null;

function initMap() {
  map = L.map('map').setView([46, 10], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// RESORTS
const resorts = [
  { name: "Glenshee", lat: 56.874, lon: -3.413 },
  { name: "Cairngorm", lat: 57.137, lon: -3.670 },
  { name: "Nevis Range", lat: 56.819, lon: -4.970 },
  { name: "Les Deux Alpes", lat: 45.015, lon: 6.124 },
  { name: "Val Thorens", lat: 45.297, lon: 6.583 },
  { name: "Saalbach-Hinterglemm", lat: 47.391, lon: 12.637 }
];

function startTracking() {
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    map.setView([lat, lon], 13);

    path.push([lat, lon]);
    L.polyline(path).addTo(map);

    if(lastPoint){
      const dist = getDistance(lastPoint.lat,lastPoint.lon,lat,lon);
      const speed = dist*3600;
      speeds.push(speed);
      detectResort(lat, lon);
      updateChart();
    }
    lastPoint = {lat, lon};
  }, err => alert("GPS error"), { enableHighAccuracy: true });
}

// RESORT DETECTION
function detectResort(lat, lon){
  let nearest=null, min=Infinity;
  resorts.forEach(r=>{
    const d=getDistance(lat,lon,r.lat,r.lon);
    if(d<min){min=d;nearest=r;}
  });
  if(min<10) document.getElementById("location").innerText="🏔️ You are at "+nearest.name;
}

// SPEED CHART
let chart;
function updateChart(){
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
