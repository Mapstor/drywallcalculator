/* ============================================
   DRYWALL CALCULATOR - MAIN JAVASCRIPT
   ============================================ */

// Constants
const SHEET_SIZES = {
  '4x8': { width: 4, height: 8, sqft: 32 },
  '4x10': { width: 4, height: 10, sqft: 40 },
  '4x12': { width: 4, height: 12, sqft: 48 }
};

const DOOR_SQFT = 21;
const WINDOW_SQFT = 15;

// Cost estimates (national averages 2026)
const COSTS = {
  sheet: { low: 10, high: 15 },           // per 4x8 sheet
  mud: { low: 0.10, high: 0.15 },         // per sq ft
  tape: { low: 0.02, high: 0.04 },        // per sq ft
  screws: { low: 0.02, high: 0.03 },      // per sq ft
  labor: {
    basic: { low: 1.00, high: 1.50 },     // Level 0-2
    standard: { low: 1.50, high: 2.25 },  // Level 3
    smooth: { low: 2.00, high: 2.75 },    // Level 4
    premium: { low: 2.50, high: 3.50 }    // Level 5
  }
};

// Mud coverage (gallons per 100 sq ft per coat)
const MUD_COVERAGE = {
  allPurpose: 0.05,   // gallons per sq ft
  topping: 0.03,
  setting: 0.04
};

// Screws per sq ft based on stud spacing
const SCREWS_PER_SQFT = {
  '16': 1.0,   // 16" OC
  '24': 0.75   // 24" OC
};

// Tape per sq ft (linear feet)
const TAPE_PER_SQFT = 0.3;

// State
let state = {
  activeTab: 'sheets',
  // Sheets tab
  roomLength: 12,
  roomWidth: 10,
  ceilingHeight: 8,
  includeWalls: true,
  includeCeiling: true,
  doors: 2,
  windows: 1,
  otherOpenings: 0,
  sheetSize: '4x8',
  wasteFactor: 10,
  // Cost tab
  projectType: 'diy',
  finishLevel: 'standard',
  // Mud tab
  mudType: 'allPurpose',
  coats: 3,
  // Screws tab
  studSpacing: '16',
  // Tape tab
  includeCorners: true
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  setupTabs();
  setupInputs();
  setupCalculateButtons();
  setupFAQ();
  setupMobileNav();
}

function setupTabs() {
  document.querySelectorAll('.calc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      
      // Update active tab
      document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding panel
      document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${tabId}`).classList.add('active');
      
      state.activeTab = tabId;
    });
  });
}

function setupInputs() {
  // Room dimensions
  bindInput('room-length', 'roomLength', 'number');
  bindInput('room-width', 'roomWidth', 'number');
  bindInput('ceiling-height', 'ceilingHeight', 'number');
  
  // Checkboxes
  bindCheckbox('include-walls', 'includeWalls');
  bindCheckbox('include-ceiling', 'includeCeiling');
  bindCheckbox('include-corners', 'includeCorners');
  
  // Openings
  bindInput('doors', 'doors', 'number');
  bindInput('windows', 'windows', 'number');
  bindInput('other-openings', 'otherOpenings', 'number');
  
  // Sheet size radios
  document.querySelectorAll('input[name="sheet-size"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.sheetSize = radio.value;
    });
  });
  
  // Waste factor slider
  const wasteSlider = document.getElementById('waste-factor');
  const wasteValue = document.getElementById('waste-value');
  if (wasteSlider && wasteValue) {
    wasteSlider.addEventListener('input', () => {
      state.wasteFactor = parseInt(wasteSlider.value);
      wasteValue.textContent = wasteSlider.value;
    });
  }
  
  // Project type radios
  document.querySelectorAll('input[name="project-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.projectType = radio.value;
    });
  });
  
  // Finish level radios
  document.querySelectorAll('input[name="finish-level"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.finishLevel = radio.value;
    });
  });
  
  // Mud type radios
  document.querySelectorAll('input[name="mud-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.mudType = radio.value;
    });
  });
  
  // Coats slider
  const coatsSlider = document.getElementById('coats');
  const coatsValue = document.getElementById('coats-value');
  if (coatsSlider && coatsValue) {
    coatsSlider.addEventListener('input', () => {
      state.coats = parseInt(coatsSlider.value);
      coatsValue.textContent = coatsSlider.value;
    });
  }
  
  // Stud spacing radios
  document.querySelectorAll('input[name="stud-spacing"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.studSpacing = radio.value;
    });
  });
}

function bindInput(id, stateKey, type = 'string') {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      state[stateKey] = type === 'number' ? parseFloat(el.value) || 0 : el.value;
    });
  }
}

function bindCheckbox(id, stateKey) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      state[stateKey] = el.checked;
    });
  }
}

function setupCalculateButtons() {
  // Sheets calculator
  document.getElementById('calc-sheets-btn')?.addEventListener('click', calculateSheets);
  
  // Cost calculator
  document.getElementById('calc-cost-btn')?.addEventListener('click', calculateCost);
  
  // Mud calculator
  document.getElementById('calc-mud-btn')?.addEventListener('click', calculateMud);
  
  // Screws calculator
  document.getElementById('calc-screws-btn')?.addEventListener('click', calculateScrews);
  
  // Tape calculator
  document.getElementById('calc-tape-btn')?.addEventListener('click', calculateTape);
}

// ============================================
// SHEETS CALCULATOR
// ============================================
function calculateSheets() {
  const length = state.roomLength;
  const width = state.roomWidth;
  const height = state.ceilingHeight;
  
  // Calculate wall area
  let wallArea = 0;
  if (state.includeWalls) {
    const perimeter = 2 * (length + width);
    wallArea = perimeter * height;
  }
  
  // Calculate ceiling area
  let ceilingArea = 0;
  if (state.includeCeiling) {
    ceilingArea = length * width;
  }
  
  // Subtract openings
  const doorArea = state.doors * DOOR_SQFT;
  const windowArea = state.windows * WINDOW_SQFT;
  const otherArea = state.otherOpenings;
  const totalOpenings = doorArea + windowArea + otherArea;
  
  // Net area
  const netWallArea = Math.max(0, wallArea - totalOpenings);
  const totalArea = netWallArea + ceilingArea;
  
  // Add waste factor
  const wasteMultiplier = 1 + (state.wasteFactor / 100);
  const totalWithWaste = totalArea * wasteMultiplier;
  
  // Calculate sheets needed
  const sheetSqFt = SHEET_SIZES[state.sheetSize].sqft;
  const sheetsNeeded = Math.ceil(totalWithWaste / sheetSqFt);
  
  // Wall sheets vs ceiling sheets
  const wallSheets = Math.ceil((netWallArea * wasteMultiplier) / sheetSqFt);
  const ceilingSheets = Math.ceil((ceilingArea * wasteMultiplier) / sheetSqFt);
  
  // Estimated materials
  const mudGallons = Math.ceil(totalArea * MUD_COVERAGE.allPurpose * 3); // 3 coats
  const tapeLinearFt = Math.ceil(totalArea * TAPE_PER_SQFT);
  const screwsNeeded = Math.ceil(totalArea * SCREWS_PER_SQFT[state.studSpacing]);
  
  // Display results
  displaySheetsResults({
    totalSheets: sheetsNeeded,
    wallArea: Math.round(netWallArea),
    ceilingArea: Math.round(ceilingArea),
    totalArea: Math.round(totalArea),
    wallSheets,
    ceilingSheets,
    sheetSize: state.sheetSize,
    mudGallons,
    tapeLinearFt,
    screwsNeeded
  });
}

function displaySheetsResults(results) {
  const section = document.getElementById('sheets-results');
  if (!section) return;

  document.getElementById('total-sheets').textContent = results.totalSheets;
  document.getElementById('sheet-size-label').textContent = `${results.sheetSize.replace('x', "'×")}' sheets`;

  document.getElementById('wall-area').textContent = `${results.wallArea} sq ft`;
  document.getElementById('wall-sheets').textContent = `(${results.wallSheets} sheets)`;

  document.getElementById('ceiling-area').textContent = `${results.ceilingArea} sq ft`;
  document.getElementById('ceiling-sheets').textContent = `(${results.ceilingSheets} sheets)`;

  document.getElementById('total-area').textContent = `${results.totalArea} sq ft`;
  document.getElementById('waste-note').textContent = `+${state.wasteFactor}% waste`;

  // Materials list
  document.getElementById('mat-sheets').textContent = `${results.totalSheets} sheets`;
  document.getElementById('mat-mud').textContent = `~${results.mudGallons} gallons`;
  document.getElementById('mat-tape').textContent = `~${results.tapeLinearFt} ft`;
  document.getElementById('mat-screws').textContent = `~${results.screwsNeeded} screws`;

  // Update breakdown bar
  const wasteArea = Math.round(results.totalArea * (state.wasteFactor / 100));
  const totalWithWaste = results.wallArea + results.ceilingArea + wasteArea;

  if (totalWithWaste > 0) {
    const wallPct = Math.round((results.wallArea / totalWithWaste) * 100);
    const ceilingPct = Math.round((results.ceilingArea / totalWithWaste) * 100);
    const wastePct = 100 - wallPct - ceilingPct;

    const barWalls = document.getElementById('bar-walls');
    const barCeiling = document.getElementById('bar-ceiling');
    const barWaste = document.getElementById('bar-waste');

    if (barWalls) {
      barWalls.style.width = `${wallPct}%`;
      barWalls.textContent = wallPct > 15 ? 'Walls' : '';
      barWalls.style.display = wallPct > 0 ? 'flex' : 'none';
    }
    if (barCeiling) {
      barCeiling.style.width = `${ceilingPct}%`;
      barCeiling.textContent = ceilingPct > 15 ? 'Ceiling' : '';
      barCeiling.style.display = ceilingPct > 0 ? 'flex' : 'none';
    }
    if (barWaste) {
      barWaste.style.width = `${wastePct}%`;
      barWaste.textContent = wastePct > 10 ? `+${state.wasteFactor}%` : '';
    }
  }

  // Update breakdown legend
  const legendWalls = document.getElementById('legend-walls');
  const legendCeiling = document.getElementById('legend-ceiling');
  const legendWaste = document.getElementById('legend-waste');
  const legendWastePct = document.getElementById('legend-waste-pct');

  if (legendWalls) legendWalls.textContent = `${results.wallArea} sq ft`;
  if (legendCeiling) legendCeiling.textContent = `${results.ceilingArea} sq ft`;
  if (legendWaste) legendWaste.textContent = `${wasteArea} sq ft`;
  if (legendWastePct) legendWastePct.textContent = state.wasteFactor;

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Store for cost calculator
  state.calculatedArea = results.totalArea;
  state.calculatedSheets = results.totalSheets;
}

// ============================================
// COST CALCULATOR
// ============================================
function calculateCost() {
  // Get square footage from input or previous calculation
  const sqftInput = document.getElementById('cost-sqft');
  const sqft = parseFloat(sqftInput?.value) || state.calculatedArea || 400;
  
  const sheets = Math.ceil(sqft / SHEET_SIZES['4x8'].sqft);
  
  // Materials cost
  const sheetCostLow = sheets * COSTS.sheet.low;
  const sheetCostHigh = sheets * COSTS.sheet.high;
  const mudCostLow = sqft * COSTS.mud.low;
  const mudCostHigh = sqft * COSTS.mud.high;
  const tapeCostLow = sqft * COSTS.tape.low;
  const tapeCostHigh = sqft * COSTS.tape.high;
  const screwsCostLow = sqft * COSTS.screws.low;
  const screwsCostHigh = sqft * COSTS.screws.high;
  
  const materialsCostLow = sheetCostLow + mudCostLow + tapeCostLow + screwsCostLow;
  const materialsCostHigh = sheetCostHigh + mudCostHigh + tapeCostHigh + screwsCostHigh;
  
  // Labor cost (if professional)
  let laborCostLow = 0;
  let laborCostHigh = 0;
  
  if (state.projectType !== 'diy') {
    const laborRates = COSTS.labor[state.finishLevel] || COSTS.labor.standard;
    laborCostLow = sqft * laborRates.low;
    laborCostHigh = sqft * laborRates.high;
  }
  
  // Total
  const totalLow = materialsCostLow + laborCostLow;
  const totalHigh = materialsCostHigh + laborCostHigh;
  
  // Per sq ft
  const perSqFtLow = totalLow / sqft;
  const perSqFtHigh = totalHigh / sqft;
  
  displayCostResults({
    sqft,
    materialsCostLow,
    materialsCostHigh,
    laborCostLow,
    laborCostHigh,
    totalLow,
    totalHigh,
    perSqFtLow,
    perSqFtHigh,
    isDIY: state.projectType === 'diy'
  });
}

function displayCostResults(results) {
  const section = document.getElementById('cost-results');
  if (!section) return;

  // Primary result
  const totalMain = document.getElementById('cost-total-main');
  const perSqFtMain = document.getElementById('cost-per-sqft-main');
  if (totalMain) totalMain.textContent = `$${Math.round(results.totalLow)} - $${Math.round(results.totalHigh)}`;
  if (perSqFtMain) perSqFtMain.textContent = `$${results.perSqFtLow.toFixed(2)} - $${results.perSqFtHigh.toFixed(2)} per sq ft`;

  // Breakdown bar
  const materialsAvg = (results.materialsCostLow + results.materialsCostHigh) / 2;
  const laborAvg = (results.laborCostLow + results.laborCostHigh) / 2;
  const totalAvg = materialsAvg + laborAvg;

  const barMaterials = document.getElementById('bar-materials');
  const barLabor = document.getElementById('bar-labor');

  if (totalAvg > 0 && barMaterials && barLabor) {
    const matPct = Math.round((materialsAvg / totalAvg) * 100);
    const laborPct = 100 - matPct;

    barMaterials.style.width = `${matPct}%`;
    barMaterials.textContent = matPct > 20 ? 'Materials' : '';

    barLabor.style.width = `${laborPct}%`;
    barLabor.textContent = laborPct > 20 ? 'Labor' : '';
    barLabor.style.display = results.isDIY ? 'none' : 'flex';
  }

  // Legend
  const legendMaterials = document.getElementById('legend-materials');
  const legendLabor = document.getElementById('legend-labor');
  if (legendMaterials) legendMaterials.textContent = `$${Math.round(results.materialsCostLow)} - $${Math.round(results.materialsCostHigh)}`;
  if (legendLabor) {
    legendLabor.textContent = results.isDIY ? '$0' : `$${Math.round(results.laborCostLow)} - $${Math.round(results.laborCostHigh)}`;
    legendLabor.parentElement.style.display = results.isDIY ? 'none' : 'flex';
  }

  // Detailed breakdown
  const sheets = Math.ceil(results.sqft / SHEET_SIZES['4x8'].sqft);
  const costSheets = document.getElementById('cost-sheets');
  const costMudDetail = document.getElementById('cost-mud-detail');
  const costTapeDetail = document.getElementById('cost-tape-detail');
  const costScrewsDetail = document.getElementById('cost-screws-detail');

  if (costSheets) costSheets.textContent = `$${Math.round(sheets * COSTS.sheet.low)} - $${Math.round(sheets * COSTS.sheet.high)}`;
  if (costMudDetail) costMudDetail.textContent = `$${Math.round(results.sqft * COSTS.mud.low)} - $${Math.round(results.sqft * COSTS.mud.high)}`;
  if (costTapeDetail) costTapeDetail.textContent = `$${Math.round(results.sqft * COSTS.tape.low)} - $${Math.round(results.sqft * COSTS.tape.high)}`;
  if (costScrewsDetail) costScrewsDetail.textContent = `$${Math.round(results.sqft * COSTS.screws.low)} - $${Math.round(results.sqft * COSTS.screws.high)}`;

  document.getElementById('cost-materials').textContent =
    `$${Math.round(results.materialsCostLow)} - $${Math.round(results.materialsCostHigh)}`;

  const laborRow = document.getElementById('labor-row');
  if (results.isDIY) {
    laborRow.style.display = 'none';
  } else {
    laborRow.style.display = 'flex';
    document.getElementById('cost-labor').textContent =
      `$${Math.round(results.laborCostLow)} - $${Math.round(results.laborCostHigh)}`;
  }

  document.getElementById('cost-total').textContent =
    `$${Math.round(results.totalLow)} - $${Math.round(results.totalHigh)}`;

  document.getElementById('cost-per-sqft').textContent =
    `$${results.perSqFtLow.toFixed(2)} - $${results.perSqFtHigh.toFixed(2)} per sq ft`;

  // Interpretation
  const interpText = document.getElementById('cost-interpretation-text');
  if (interpText) {
    if (results.isDIY) {
      interpText.innerHTML = `For <strong>${results.sqft} sq ft</strong> of drywall (DIY materials only), expect to spend <strong>$${Math.round(results.totalLow)}-$${Math.round(results.totalHigh)}</strong>. This covers sheets, joint compound, tape, and screws. Add $50-100 for delivery if needed.`;
    } else {
      const savingsLow = Math.round(results.laborCostLow);
      interpText.innerHTML = `Professional installation of <strong>${results.sqft} sq ft</strong> costs <strong>$${Math.round(results.totalLow)}-$${Math.round(results.totalHigh)}</strong>. Labor accounts for ${Math.round((laborAvg/totalAvg)*100)}% of the total. DIY could save you approximately <strong>$${savingsLow}+</strong> in labor costs.`;
    }
  }

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// MUD CALCULATOR
// ============================================
function calculateMud() {
  const sqftInput = document.getElementById('mud-sqft');
  const sqft = parseFloat(sqftInput?.value) || state.calculatedArea || 400;
  
  const coverageRate = MUD_COVERAGE[state.mudType] || MUD_COVERAGE.allPurpose;
  const gallonsPerCoat = sqft * coverageRate;
  const totalGallons = gallonsPerCoat * state.coats;
  
  // Buckets (5-gallon and 1-gallon options)
  const fiveGalBuckets = Math.floor(totalGallons / 5);
  const remainingGallons = totalGallons - (fiveGalBuckets * 5);
  const oneGalBuckets = Math.ceil(remainingGallons);
  
  displayMudResults({
    sqft,
    gallonsPerCoat: gallonsPerCoat.toFixed(1),
    totalGallons: totalGallons.toFixed(1),
    coats: state.coats,
    fiveGalBuckets,
    oneGalBuckets,
    mudType: state.mudType
  });
}

function displayMudResults(results) {
  const section = document.getElementById('mud-results');
  if (!section) return;

  document.getElementById('mud-total').textContent = `${results.totalGallons} gallons`;
  document.getElementById('mud-per-coat').textContent = `(${results.gallonsPerCoat} gal × ${results.coats} coats)`;

  // Update coats bar
  const coatsBar = document.getElementById('mud-coats-bar');
  if (coatsBar) {
    coatsBar.innerHTML = '';
    const coatPct = Math.floor(100 / results.coats);
    const colors = ['walls', 'ceiling', 'waste'];
    for (let i = 0; i < results.coats; i++) {
      const segment = document.createElement('div');
      segment.className = `breakdown-segment ${colors[i % 3]}`;
      segment.style.width = i === results.coats - 1 ? `${100 - coatPct * (results.coats - 1)}%` : `${coatPct}%`;
      segment.textContent = `Coat ${i + 1}`;
      coatsBar.appendChild(segment);
    }
  }

  // Update gallons per coat
  const galPerCoat = document.getElementById('mud-gal-per-coat');
  if (galPerCoat) galPerCoat.textContent = `${results.gallonsPerCoat} gallons`;

  let buyText = '';
  if (results.fiveGalBuckets > 0) {
    buyText += `${results.fiveGalBuckets}× 5-gallon bucket${results.fiveGalBuckets > 1 ? 's' : ''}`;
  }
  if (results.oneGalBuckets > 0) {
    if (buyText) buyText += ' + ';
    buyText += `${results.oneGalBuckets}× 1-gallon`;
  }
  document.getElementById('mud-buckets').textContent = buyText || '1× 5-gallon bucket';

  const typeNames = {
    allPurpose: 'All-Purpose',
    topping: 'Topping Compound',
    setting: 'Setting Compound'
  };
  document.getElementById('mud-type-label').textContent = typeNames[results.mudType];

  // Update tips based on mud type
  const tips = document.getElementById('mud-tips');
  if (tips) {
    if (results.mudType === 'setting') {
      tips.innerHTML = `
        <li>Setting compound dries faster—mix only what you can use in 20-45 minutes</li>
        <li>Great for embedding tape and filling large gaps</li>
        <li>Follow up with all-purpose or topping for final coats</li>
      `;
    } else if (results.mudType === 'topping') {
      tips.innerHTML = `
        <li>Topping compound is for final coats only—don't use for taping</li>
        <li>Applies smoothly and sands easily for a professional finish</li>
        <li>Use over all-purpose or setting compound base coats</li>
      `;
    } else {
      tips.innerHTML = `
        <li>Let each coat dry completely (24 hours) before applying the next</li>
        <li>Apply thinner coats for better results—thick coats crack</li>
        <li>Sand lightly between coats with 120-150 grit sandpaper</li>
      `;
    }
  }

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// SCREWS CALCULATOR
// ============================================
function calculateScrews() {
  const sqftInput = document.getElementById('screws-sqft');
  const sqft = parseFloat(sqftInput?.value) || state.calculatedArea || 400;
  
  const screwsPerSqFt = SCREWS_PER_SQFT[state.studSpacing];
  const totalScrews = Math.ceil(sqft * screwsPerSqFt);
  
  // 1 lb ≈ 200 screws for 1-5/8" drywall screws
  const lbsNeeded = Math.ceil(totalScrews / 200);
  const boxesNeeded = Math.ceil(lbsNeeded / 5); // 5 lb boxes
  
  displayScrewsResults({
    sqft,
    totalScrews,
    lbsNeeded,
    boxesNeeded,
    studSpacing: state.studSpacing
  });
}

function displayScrewsResults(results) {
  const section = document.getElementById('screws-results');
  if (!section) return;

  document.getElementById('screws-total').textContent = results.totalScrews.toLocaleString();
  document.getElementById('screws-lbs').textContent = `(~${results.lbsNeeded} lbs)`;
  document.getElementById('screws-boxes').textContent =
    `${results.boxesNeeded}× 5-lb box${results.boxesNeeded > 1 ? 'es' : ''}`;
  document.getElementById('screws-spacing').textContent = `Based on ${results.studSpacing}" on-center stud spacing`;

  // Per sheet and stud display
  const perSheet = document.getElementById('screws-per-sheet');
  const studDisplay = document.getElementById('screws-stud-display');
  if (perSheet) {
    const screwsPerSheet = results.studSpacing === '16' ? '~32' : '~24';
    perSheet.textContent = screwsPerSheet;
  }
  if (studDisplay) {
    studDisplay.textContent = `${results.studSpacing}" OC`;
  }

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// TAPE CALCULATOR
// ============================================
function calculateTape() {
  const sqftInput = document.getElementById('tape-sqft');
  const sqft = parseFloat(sqftInput?.value) || state.calculatedArea || 400;
  
  // Base tape for flat joints
  let linearFeet = sqft * TAPE_PER_SQFT;
  
  // Add corners if selected (estimate based on typical room)
  if (state.includeCorners) {
    // Rough estimate: 4 vertical corners × ceiling height + ceiling perimeter
    const roomPerimeter = 2 * (state.roomLength + state.roomWidth);
    const cornerFeet = (4 * state.ceilingHeight) + roomPerimeter;
    linearFeet += cornerFeet;
  }
  
  linearFeet = Math.ceil(linearFeet);
  
  // Rolls (standard 500 ft rolls, also 75 ft and 250 ft available)
  const rolls500 = Math.floor(linearFeet / 500);
  const remaining = linearFeet - (rolls500 * 500);
  const rolls250 = remaining > 75 ? Math.ceil(remaining / 250) : 0;
  const rolls75 = remaining <= 75 && remaining > 0 ? 1 : 0;
  
  displayTapeResults({
    sqft,
    linearFeet,
    rolls500,
    rolls250,
    rolls75,
    includeCorners: state.includeCorners
  });
}

function displayTapeResults(results) {
  const section = document.getElementById('tape-results');
  if (!section) return;

  document.getElementById('tape-total').textContent = `${results.linearFeet} linear feet`;
  document.getElementById('tape-corners').textContent =
    results.includeCorners ? '(includes corner tape)' : '(flat joints only)';

  // Calculate flat vs corner tape
  const flatTape = Math.round(results.sqft * TAPE_PER_SQFT);
  const cornerTape = results.linearFeet - flatTape;

  const tapeFlat = document.getElementById('tape-flat');
  const tapeCornerFt = document.getElementById('tape-corner-ft');
  if (tapeFlat) tapeFlat.textContent = `${flatTape} ft`;
  if (tapeCornerFt) tapeCornerFt.textContent = results.includeCorners ? `${cornerTape} ft` : '0 ft';

  let buyText = '';
  if (results.rolls500 > 0) {
    buyText += `${results.rolls500}× 500-ft roll${results.rolls500 > 1 ? 's' : ''}`;
  }
  if (results.rolls250 > 0) {
    if (buyText) buyText += ' + ';
    buyText += `${results.rolls250}× 250-ft roll${results.rolls250 > 1 ? 's' : ''}`;
  }
  if (results.rolls75 > 0) {
    if (buyText) buyText += ' + ';
    buyText += `1× 75-ft roll`;
  }
  document.getElementById('tape-rolls').textContent = buyText || '1× 75-ft roll';

  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function setupFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function setupMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.nav-mobile');
  
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('active');
      }
    });
  }
}

function copyResults() {
  const activePanel = document.querySelector('.calc-panel.active');
  const resultsSection = activePanel?.querySelector('.results-section.visible');
  if (!resultsSection) return;
  
  const text = resultsSection.innerText;
  navigator.clipboard.writeText(`Drywall Calculator Results\n${text}\n\nCalculated at drywallcalculator.net`).then(() => {
    alert('Results copied to clipboard!');
  });
}
