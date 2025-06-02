const sliders = [
  { id: 'cpi', output: 'cpiVal' },
  { id: 'rate', output: 'rateVal' },
  { id: 'oil', output: 'oilVal' }
];

sliders.forEach(({ id, output }) => {
  const slider = document.getElementById(id);
  const display = document.getElementById(output);
  display.textContent = slider.value;

  slider.addEventListener('input', () => {
    display.textContent = slider.value;
  });
});


// 讀取 us_market/latest 文件
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCveAp3D6ySKTuC_Vfu8IZGhvkx1GKEkOE",
  authDomain: "demand-supply-9839c.firebaseapp.com",
  databaseURL: "https://demand-supply-9839c-default-rtdb.firebaseio.com",
  projectId: "demand-supply-9839c",
  storageBucket: "demand-supply-9839c.firebasestorage.app",
  messagingSenderId: "642818679104",
  appId: "1:642818679104:web:6d7e40582d4728afc31aa5",
  measurementId: "G-TYHNH2TR8Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore 讀取函式（維持不變）
async function loadUSMarketData() {
  try {
    const docRef = doc(db, "us_market", "latest");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("從 Firestore 載入：", data);
      return data;
    } else {
      console.warn("找不到文件");
      return { cpi: 5, rate: 5, oil: 100 };
    }
  } catch (err) {
    console.error("讀取 Firestore 失敗：", err);
    return { cpi: 300, rate: 2, oil: 80 };
  }
}

// 取得 DOM 元素
const canvas = document.getElementById('market');
const ctx = canvas.getContext('2d');

const usCanvas = document.getElementById('usMarket');
const usCtx = usCanvas.getContext('2d');

const cpiInput = document.getElementById('cpi');
const rateInput = document.getElementById('rate');
const oilInput = document.getElementById('oil');

const equilibriumDisplay = document.getElementById('equilibrium');
const usEquilibriumDisplay = document.getElementById('usEquilibrium');
const comparison = document.getElementById('comparison');

let latestUSData = null;
let latestUSEquilibrium = null;



// 計算需求與供給線的 y 值
function getDemandY(x, intercept, slope) {
  return intercept - slope * x;
}
function getSupplyY(x, intercept, slope) {
  return intercept + slope * x;
}

// 根據 CPI、利率、油價計算供需曲線參數
function calculateParams(cpiInflationRate, rate, oil) {
  let dIntercept = 300;
  let dSlope = 0.4;
  let sIntercept = 30;
  let sSlope = 0.4;

  if (cpiInflationRate > 3) sIntercept += (cpiInflationRate - 20) * 5;
  if (cpiInflationRate < 2) sIntercept -= (2 - cpiInflationRate) * 100;

  if (rate > 3) sSlope += (rate - 3) * 0.02;
  if (rate < 1) sSlope -= (1 - rate) * 0.02;

  if (oil > 100) dIntercept -= (oil - 100) * 1.5;
  if (oil < 70) dIntercept += (70 - oil) * 1.5;

  return { dIntercept, dSlope, sIntercept, sSlope };
}

// 畫市場曲線，並回傳均衡點
function drawMarket(ctx, params, color) {
  ctx.clearRect(0, 0, 400, 300);
  const { dIntercept, dSlope, sIntercept, sSlope } = params;

  ctx.strokeStyle = color.demand;
  ctx.beginPath();
  for (let x = 0; x <= 400; x++) {
    const y = getDemandY(x, dIntercept, dSlope);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = color.supply;
  ctx.beginPath();
  for (let x = 0; x <= 400; x++) {
    const y = getSupplyY(x, sIntercept, sSlope);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  const eqX = (dIntercept - sIntercept) / (dSlope + sSlope);
  const eqY = getDemandY(eqX, dIntercept, dSlope);

  ctx.fillStyle = color.eq;
  ctx.beginPath();
  ctx.arc(eqX, eqY, 6, 0, Math.PI * 2);
  ctx.fill();

  return { x: eqX, y: eqY };
}

// 更新使用者市場與比較
function update() {
  console.log("Update triggered");
  console.log("cpi:", cpiInput.value, "rate:", rateInput.value, "oil:", oilInput.value);

  const cpi = parseFloat(cpiInput.value);
  const rate = parseFloat(rateInput.value);
  const oil = parseFloat(oilInput.value);

  if (isNaN(cpi) || isNaN(rate) || isNaN(oil)) {
    console.warn("某項輸入無效！");
    return;
  }

  //const cpi = parseFloat(cpiInput.value);
  //const rate = parseFloat(rateInput.value);
  //const oil = parseFloat(oilInput.value);

  //if (isNaN(cpi) || isNaN(rate) || isNaN(oil)) return;

  const cpiLastYear = 280;
  const inflationRate = ((cpi - cpiLastYear) / cpiLastYear) * 100;
  const userParams = calculateParams(inflationRate, rate, oil);
  const userEq = drawMarket(ctx, userParams, {
    demand: 'cyan',
    supply: 'yellow',
    eq: 'red'
  });
  equilibriumDisplay.textContent = `價格: ${userEq.x.toFixed(1)}，數量: ${userEq.y.toFixed(1)}`;

  if (latestUSData) {
    const usInflationRate = ((latestUSData.cpi - cpiLastYear) / cpiLastYear) * 100;
    const usParams = calculateParams(usInflationRate, latestUSData.rate, latestUSData.oil);
    const usEq = drawMarket(usCtx, usParams, {
      demand: 'lime',
      supply: 'orange',
      eq: 'white'
    });
    usEquilibriumDisplay.textContent = `價格: ${usEq.x.toFixed(1)}，數量: ${usEq.y.toFixed(1)}`;
    latestUSEquilibrium = usEq;

    const priceDiff = userEq.x - usEq.x;
    const qtyDiff = userEq.y - usEq.y;
    let msg = "";

    if (Math.abs(priceDiff) < 20 && Math.abs(qtyDiff) < 5) {
      msg = "你的市場與美國相近，屬於穩定狀態。";
    } else {
      if (priceDiff > 10) msg += "你的市場價格明顯高於美國，可能有通膨壓力。";
      else if (priceDiff < -10) msg += "你的市場價格低於美國，可能供需不足。";

      if (qtyDiff > 10) msg += " 市場數量高於美國，顯示供給或需求較大。";
      else if (qtyDiff < -10) msg += " 市場數量低於美國，可能產能不足或需求減弱。";
    }
    comparison.textContent = msg;
  }
}

// 初始化，載入美國市場並綁定事件
async function init() {
  latestUSData = await loadUSMarketData();
  update(); // 包含美國市場也會一起畫出

  [cpiInput, rateInput, oilInput].forEach(input =>
    input.addEventListener('input', update)
  );
}

init();






// 初始載入

window.addEventListener('DOMContentLoaded', update); // 等 DOM 載入後才執行 update()

