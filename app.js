// ===== LOCAL LOGIN & STATS =====
const email = document.getElementById("email");
const password = document.getElementById("password");
const runsEl = document.getElementById("runs");
const userLabel = document.getElementById("userLabel");
const leaderboardEl = document.getElementById("leaderboard");
const authCard = document.getElementById("auth");
const appCard = document.getElementById("app");
const locationEl = document.getElementById("location");

let currentUser = null;

// ===== ENCRYPTION =====
function encrypt(text,key=129){return text.split('').map(c=>String.fromCharCode(c.charCodeAt(0)^key)).join('');}
function decrypt(text,key=129){return text.split('').map(c=>String.fromCharCode(c.charCodeAt(0)^key)).join('');}

// ===== LOCAL STORAGE LOGIN =====
function saveLogin(email,password){
  const data = email + ":" + password;
  const encrypted = encrypt(data);
  localStorage.setItem('skiLogin',btoa(encrypted));
}
function loadLogin(){
  const encrypted = localStorage.getItem('skiLogin');
  if(!encrypted) return null;
  const data = decrypt(atob(encrypted));
  const [e,p] = data.split(':');
  return {email:e,password:p};
}

// ===== USER STATS =====
function saveUserStats(user,stats){localStorage.setItem("skiUser_"+user,JSON.stringify(stats));}
function loadUserStats(user){return JSON.parse(localStorage.getItem("skiUser_"+user)||'{"runs":0}');}

// ===== SIGNUP & LOGIN =====
function signup(){if(!email.value||!password.value)return alert("Enter email & password");saveLogin(email.value,password.value);currentUser=email.value;initApp();}
function login(){const creds=loadLogin();if(creds&&creds.email===email.value&&creds.password===password.value){currentUser=email.value;initApp();}else alert("User not found or password incorrect");}
function logout(){currentUser=null;authCard.style.display="block";appCard.classList.add("hidden");}

// ===== APP INIT =====
function initApp(){authCard.style.display="none";appCard.classList.remove("hidden");userLabel.innerText=currentUser;loadStats();loadLeaderboard();initMap();}

// ===== RUN STATS =====
function addRun(){const stats=loadUserStats(currentUser);stats.runs++;saveUserStats(currentUser,stats);runsEl.innerText=stats.runs;}
function loadStats(){const stats=loadUserStats(currentUser);runsEl.innerText=stats.runs;}

// ===== LEADERBOARD =====
function loadLeaderboard(){leaderboardEl.innerHTML="";for(let key in localStorage){if(key.startsWith("skiUser_")){const user=key.replace("skiUser_","");const stats=JSON.parse(localStorage.getItem(key));const li=document.createElement("li");li.innerText=user+": "+stats.runs+" runs";leaderboardEl.appendChild(li);}}}

// ===== MAP & GPS TRACKING =====
let map,path=[],speeds=[],lastPoint=null,chart;
const resorts=[
  {name:"Glenshee",lat:56.874,lon:-3.413},
  {name:"Cairngorm",lat:57.137,lon:-3.670},
  {name:"Nevis Range",lat:56.819,lon:-4.970},
  {name:"Les Deux Alpes",lat:45.015,lon:6.124},
  {name:"Val Thorens",lat:45.297,lon:6.583},
  {name:"Saalbach-Hinterglemm",lat:47.391,lon:12.637}
];

function initMap(){map=L.map('map').setView([46,10],5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);}
function startTracking(){
  if(!navigator.geolocation)return alert("Geolocation not supported");
  navigator.geolocation.watchPosition(pos=>{
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    map.setView([lat,lon],13);
    path.push([lat,lon]);
    L.polyline(path).addTo(map);
    if(lastPoint){
      const dist=getDistance(lastPoint.lat,lastPoint.lon,lat,lon);
      const speed=dist*3600;
      speeds.push(speed);
      detectResort(lat,lon);
      updateChart();
    }
    lastPoint={lat,lon};
  },err=>alert("GPS error"),{enableHighAccuracy:true});
}

function detectResort(lat,lon){
  let nearest=null,min=Infinity;
  resorts.forEach(r=>{const d=getDistance(lat,lon,r.lat,r.lon);if(d<min){min=d;nearest=r;}});
  if(min<10) locationEl.innerText="🏔️ You are at "+nearest.name;
}

function updateChart(){
  const ctx=document.getElementById("speedChart");
  if(!chart){chart=new Chart(ctx,{type:'line',data:{labels:speeds.map((_,i)=>i+1),datasets:[{label:'Speed km/h',data:speeds,borderColor:'#2b7cff',backgroundColor:'rgba(43,124,255,0.2)'}]},options:{responsive:true}});}
  else{chart.data.labels=speeds.map((_,i)=>i+1);chart.data.datasets[0].data=speeds;chart.update();}
}

function getDistance(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ===== AUTO LOGIN =====
window.addEventListener('load',()=>{
  const creds=loadLogin();
  if(creds){email.value=creds.email;password.value=creds.password;login();}
});
