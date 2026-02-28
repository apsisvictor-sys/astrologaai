/**
 * PDF Generator Service
 * US-17: Generate Chart PDF
 * 
 * Generates professional PDF natal charts using PDFKit
 * Includes: chart wheel, planet positions, houses, aspects
 */

import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import { Readable } from 'stream';
import { NatalChart, PlanetPosition, HouseCusp, Aspect } from './astrology';

// Design system colors
const COLORS = {
  primary: '#7C3AED',
  secondary: '#EC4899',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  harmonious: '#10B981',
  challenging: '#EF4444',
  neutral: '#6366F1',
};

// Planet symbols (Unicode)
const PLANET_SYMBOLS: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '⛢',
  neptune: '♆',
  pluto: '♇',
  northNode: '☊',
  southNode: '☋',
  chiron: '⚷',
  lilith: '⚷',
  rising: 'ASC',
};

// Sign symbols
const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

// Bulgarian translations
const BG_TRANSLATIONS = {
  title: 'Натална карта',
  generatedBy: 'Генерирано от AstroLogAI',
  birthData: 'Данни за раждане',
  date: 'Дата',
  time: 'Час',
  location: 'Място',
  planetPositions: 'Планетарни позиции',
  planet: 'Планета',
  sign: 'Знак',
  degree: 'Градус',
  house: 'Дом',
  status: 'Статус',
  direct: 'Директен',
  retrograde: 'Ретрограден',
  housePositions: 'Позиции на домовете',
  houseNum: 'Дом',
  cusp: 'Граница',
  aspects: 'Аспекти',
  aspectType: 'Тип',
  orb: 'Орбис',
  nature: 'Естество',
  harmonious: 'Хармоничен',
  challenging: 'Напрегнат',
  neutralAspect: 'Неутрален',
  elements: 'Елементи',
  modalities: 'Качества',
  fire: 'Огън',
  earth: 'Земя',
  air: 'Въздух',
  water: 'Вода',
  cardinal: 'Кардинален',
  fixed: 'Фиксиран',
  mutable: 'Променлив',
  page: 'Страница',
  chartWheel: 'Колело на наталната карта',
  disclaimer: 'Тази карта е предназначена само за развлекателни цели.',
};

interface ChartPDFData {
  chart: NatalChart;
  profileName: string;
  birthDate: string;
  birthTime: string | null;
  locationName: string;
  language: 'en' | 'bg';
}

/**
 * Generate a natal chart wheel as a base64 image
 */
function generateChartWheelImage(chart: NatalChart, size: number = 500): string {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.35;
  const planetRadius = size * 0.28;
  
  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  
  // Draw outer circle
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw inner circle
  ctx.strokeStyle = COLORS.textSecondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw house divisions
  const houses = chart.houses;
  for (let i = 0; i < 12; i++) {
    const house = houses[i];
    if (!house) continue;
    
    // Calculate angle from cusp degree
    const angle = ((house.degree - 180) * Math.PI) / 180;
    
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(
      centerX + innerRadius * Math.cos(angle),
      centerY + innerRadius * Math.sin(angle)
    );
    ctx.lineTo(
      centerX + outerRadius * Math.cos(angle),
      centerY + outerRadius * Math.sin(angle)
    );
    ctx.stroke();
    
    // Draw house number
    const midAngle = angle + (Math.PI / 12);
    const labelRadius = (outerRadius + innerRadius) / 2 + 15;
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);
    
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((i + 1).toString(), labelX, labelY);
  }
  
  // Draw zodiac ring
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  
  for (let i = 0; i < 12; i++) {
    const startAngle = ((i * 30 - 90) * Math.PI) / 180;
    const endAngle = (((i + 1) * 30 - 90) * Math.PI) / 180;
    
    // Draw sign background segment
    ctx.fillStyle = i % 2 === 0 ? '#F8FAFC' : '#F1F5F9';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    
    // Draw sign symbol
    const symbolAngle = startAngle + (Math.PI / 12);
    const symbolRadius = innerRadius - 20;
    const symbolX = centerX + symbolRadius * Math.cos(symbolAngle);
    const symbolY = centerY + symbolRadius * Math.sin(symbolAngle);
    
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SIGN_SYMBOLS[signs[i]] || signs[i][0], symbolX, symbolY);
  }
  
  // Draw inner circle again (on top of zodiac ring)
  ctx.strokeStyle = COLORS.textSecondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 40, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw planets
  const planets = [
    chart.sun, chart.moon, chart.mercury, chart.venus, chart.mars,
    chart.jupiter, chart.saturn, chart.uranus, chart.neptune, chart.pluto,
    chart.northNode, chart.chiron
  ].filter(Boolean);
  
  planets.forEach((planet) => {
    // Calculate position based on degree
    const angle = ((planet.degree - 90) * Math.PI) / 180;
    const x = centerX + planetRadius * Math.cos(angle);
    const y = centerY + planetRadius * Math.sin(angle);
    
    // Draw planet symbol
    ctx.fillStyle = planet.retrograde ? COLORS.secondary : COLORS.primary;
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PLANET_SYMBOLS[planet.name] || planet.name[0], x, y);
    
    // Draw degree
    ctx.font = '8px Inter, sans-serif';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.fillText(`${Math.floor(planet.degree)}°`, x, y + 12);
  });
  
  // Draw aspect lines (major aspects only)
  const majorAspects = chart.aspects.filter(a => 
    ['conjunction', 'trine', 'sextile', 'square', 'opposition'].includes(a.aspect)
  );
  
  majorAspects.slice(0, 15).forEach((aspect) => {
    const planet1 = planets.find(p => p.name === aspect.planet1);
    const planet2 = planets.find(p => p.name === aspect.planet2);
    
    if (!planet1 || !planet2) return;
    
    const angle1 = ((planet1.degree - 90) * Math.PI) / 180;
    const angle2 = ((planet2.degree - 90) * Math.PI) / 180;
    
    const x1 = centerX + planetRadius * Math.cos(angle1);
    const y1 = centerY + planetRadius * Math.sin(angle1);
    const x2 = centerX + planetRadius * Math.cos(angle2);
    const y2 = centerY + planetRadius * Math.sin(angle2);
    
    // Color based on aspect nature
    if (aspect.nature === 'harmonious') {
      ctx.strokeStyle = `${COLORS.harmonious}40`;
    } else if (aspect.nature === 'challenging') {
      ctx.strokeStyle = `${COLORS.challenging}40`;
    } else {
      ctx.strokeStyle = `${COLORS.neutral}40`;
    }
    
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  
  return canvas.toDataURL('image/png');
}

/**
 * Generate a professional PDF document for natal chart
 */
export async function generateNatalChartPDF(data: ChartPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        bufferPages: true,
      });
      
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const isBulgarian = data.language === 'bg';
      const t = isBulgarian ? BG_TRANSLATIONS : {
        ...BG_TRANSLATIONS,
        title: 'Natal Chart',
        generatedBy: 'Generated by AstroLogAI',
        birthData: 'Birth Data',
        date: 'Date',
        time: 'Time',
        location: 'Location',
        planetPositions: 'Planetary Positions',
        planet: 'Planet',
        sign: 'Sign',
        degree: 'Degree',
        house: 'House',
        status: 'Status',
        direct: 'Direct',
        retrograde: 'Retrograde',
        housePositions: 'House Positions',
        houseNum: 'House',
        cusp: 'Cusp',
        aspects: 'Aspects',
        aspectType: 'Type',
        orb: 'Orb',
        nature: 'Nature',
        harmonious: 'Harmonious',
        challenging: 'Challenging',
        neutralAspect: 'Neutral',
        elements: 'Elements',
        modalities: 'Modalities',
        fire: 'Fire',
        earth: 'Earth',
        air: 'Air',
        water: 'Water',
        cardinal: 'Cardinal',
        fixed: 'Fixed',
        mutable: 'Mutable',
        page: 'Page',
        chartWheel: 'Natal Chart Wheel',
        disclaimer: 'This chart is for entertainment purposes only.',
      };
      
      const chart = data.chart;
      
      // ==================== PAGE 1: HEADER & CHART WHEEL ====================
      
      // Header with gradient background
      doc.save();
      doc.rect(0, 0, doc.page.width, 100);
      doc.fill('#7C3AED');
      doc.restore();
      
      // Title
      doc.fillColor('#FFFFFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text(t.title, 50, 35, { align: 'center' });
      
      // Profile name
      doc.fontSize(16)
        .font('Helvetica')
        .text(data.profileName, 50, 65, { align: 'center' });
      
      // Generated by
      doc.fontSize(10)
        .fillColor('#E9D5FF')
        .text(t.generatedBy, 50, 85, { align: 'center' });
      
      // Birth data box
      doc.y = 120;
      
      doc.roundedRect(50, doc.y, doc.page.width - 100, 60, 8);
      doc.fillAndStroke('#F8FAFC', '#E2E8F0');
      
      doc.fillColor(COLORS.textPrimary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(t.birthData, 70, doc.y + 15);
      
      doc.font('Helvetica')
        .fontSize(11)
        .fillColor(COLORS.textSecondary);
      
      const birthDateFormatted = new Date(data.birthDate).toLocaleDateString(
        isBulgarian ? 'bg-BG' : 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }
      );
      
      const birthTimeFormatted = data.birthTime 
        ? data.birthTime 
        : (isBulgarian ? 'Неизвестно' : 'Unknown');
      
      doc.text(`${t.date}: ${birthDateFormatted}`, 70, doc.y + 35);
      doc.text(`${t.time}: ${birthTimeFormatted}`, 250, doc.y + 35);
      doc.text(`${t.location}: ${data.locationName}`, 400, doc.y + 35);
      
      doc.y = 200;
      
      // Chart wheel image
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(COLORS.textPrimary)
        .text(t.chartWheel, 50, doc.y, { align: 'center' });
      
      doc.y += 20;
      
      const chartImage = generateChartWheelImage(chart, 400);
      const chartImageBuffer = Buffer.from(chartImage.split(',')[1], 'base64');
      
      doc.image(chartImageBuffer, (doc.page.width - 350) / 2, doc.y, {
        width: 350,
        height: 350,
      });
      
      doc.y = 580;
      
      // Key placements summary
      doc.roundedRect(50, doc.y, doc.page.width - 100, 80, 8);
      doc.fillAndStroke('#FAF5FF', '#E9D5FF');
      
      doc.fillColor(COLORS.primary)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(isBulgarian ? 'Ключови позиции' : 'Key Placements', 70, doc.y + 12);
      
      const keyPlacements = [
        { label: isBulgarian ? 'Слънце' : 'Sun', value: `${chart.sun.signBg || chart.sun.sign} (${Math.floor(chart.sun.degree)}°)` },
        { label: isBulgarian ? 'Луна' : 'Moon', value: `${chart.moon.signBg || chart.moon.sign} (${Math.floor(chart.moon.degree)}°)` },
        { label: isBulgarian ? 'Асцендент' : 'Rising', value: `${chart.rising.signBg || chart.rising.sign} (${Math.floor(chart.rising.degree)}°)` },
      ];
      
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.textSecondary);
      
      let xPos = 70;
      keyPlacements.forEach((p, i) => {
        doc.font('Helvetica-Bold')
          .fillColor(COLORS.textPrimary)
          .text(p.label, xPos, doc.y + 35);
        doc.font('Helvetica')
          .fillColor(COLORS.textSecondary)
          .text(p.value, xPos, doc.y + 50);
        xPos += 170;
      });
      
      // Footer
      const footerY = doc.page.height - 30;
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(t.disclaimer, 50, footerY, { align: 'center' });
      
      // ==================== PAGE 2: PLANET POSITIONS ====================
      
      doc.addPage();
      
      // Page header
      doc.fillColor(COLORS.primary)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(t.planetPositions, 50, 50);
      
      doc.y = 85;
      
      // Planets table
      const planets: PlanetPosition[] = [
        chart.sun, chart.moon, chart.mercury, chart.venus, chart.mars,
        chart.jupiter, chart.saturn, chart.uranus, chart.neptune, chart.pluto,
        chart.northNode, chart.southNode, chart.chiron
      ].filter(Boolean);
      
      // Table header
      const tableTop = doc.y;
      const colWidths = [100, 100, 80, 60, 80];
      const rowHeight = 25;
      
      // Header row
      doc.roundedRect(50, tableTop, doc.page.width - 100, rowHeight, 0);
      doc.fill('#7C3AED');
      
      doc.fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold');
      
      let colX = 60;
      doc.text(t.planet, colX, tableTop + 8);
      colX += colWidths[0];
      doc.text(t.sign, colX, tableTop + 8);
      colX += colWidths[1];
      doc.text(t.degree, colX, tableTop + 8);
      colX += colWidths[2];
      doc.text(t.house, colX, tableTop + 8);
      colX += colWidths[3];
      doc.text(t.status, colX, tableTop + 8);
      
      doc.y = tableTop + rowHeight;
      
      // Planet rows
      planets.forEach((planet, index) => {
        const isEven = index % 2 === 0;
        
        doc.rect(50, doc.y, doc.page.width - 100, rowHeight);
        doc.fill(isEven ? '#F8FAFC' : '#FFFFFF');
        
        doc.fillColor(COLORS.textPrimary)
          .fontSize(10)
          .font('Helvetica');
        
        colX = 60;
        
        // Planet name with symbol
        const symbol = PLANET_SYMBOLS[planet.name] || '';
        doc.text(`${symbol} ${planet.name.charAt(0).toUpperCase() + planet.name.slice(1)}`, colX, doc.y + 8);
        colX += colWidths[0];
        
        // Sign
        doc.text(planet.signBg || planet.sign, colX, doc.y + 8);
        colX += colWidths[1];
        
        // Degree
        doc.text(`${planet.degree.toFixed(2)}°`, colX, doc.y + 8);
        colX += colWidths[2];
        
        // House
        doc.text(planet.house.toString(), colX, doc.y + 8);
        colX += colWidths[3];
        
        // Status
        doc.fillColor(planet.retrograde ? COLORS.challenging : COLORS.harmonious)
          .text(planet.retrograde ? t.retrograde : t.direct, colX, doc.y + 8);
        
        doc.y += rowHeight;
      });
      
      doc.y += 30;
      
      // ==================== HOUSE POSITIONS ====================
      
      doc.fillColor(COLORS.primary)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(t.housePositions, 50, doc.y);
      
      doc.y += 35;
      
      // Houses table
      const houseTableTop = doc.y;
      
      // Header row
      doc.roundedRect(50, houseTableTop, doc.page.width - 100, rowHeight, 0);
      doc.fill('#7C3AED');
      
      doc.fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold');
      
      colX = 60;
      doc.text(t.houseNum, colX, houseTableTop + 8);
      colX += 80;
      doc.text(t.sign, colX, houseTableTop + 8);
      colX += 120;
      doc.text(t.cusp, colX, houseTableTop + 8);
      
      doc.y = houseTableTop + rowHeight;
      
      // House rows
      chart.houses.forEach((house, index) => {
        const isEven = index % 2 === 0;
        
        doc.rect(50, doc.y, doc.page.width - 100, rowHeight);
        doc.fill(isEven ? '#F8FAFC' : '#FFFFFF');
        
        doc.fillColor(COLORS.textPrimary)
          .fontSize(10)
          .font('Helvetica');
        
        colX = 60;
        doc.text(house.number.toString(), colX, doc.y + 8);
        colX += 80;
        doc.text(`${SIGN_SYMBOLS[house.sign] || ''} ${house.signBg || house.sign}`, colX, doc.y + 8);
        colX += 120;
        doc.text(`${house.degree.toFixed(2)}°`, colX, doc.y + 8);
        
        doc.y += rowHeight;
      });
      
      // Footer
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(
          `${t.page} 2`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      
      // ==================== PAGE 3: ASPECTS & ELEMENTS ====================
      
      doc.addPage();
      
      // Aspects header
      doc.fillColor(COLORS.primary)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(t.aspects, 50, 50);
      
      doc.y = 85;
      
      // Filter to major aspects
      const majorAspects = chart.aspects.filter(a => 
        ['conjunction', 'trine', 'sextile', 'square', 'opposition'].includes(a.aspect)
      );
      
      // Aspects table header
      const aspectTableTop = doc.y;
      const aspectColWidths = [100, 100, 100, 60, 80];
      
      doc.roundedRect(50, aspectTableTop, doc.page.width - 100, rowHeight, 0);
      doc.fill('#7C3AED');
      
      doc.fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold');
      
      colX = 60;
      doc.text(t.planet, colX, aspectTableTop + 8);
      colX += aspectColWidths[0];
      doc.text(t.planet, colX, aspectTableTop + 8);
      colX += aspectColWidths[1];
      doc.text(t.aspectType, colX, aspectTableTop + 8);
      colX += aspectColWidths[2];
      doc.text(t.orb, colX, aspectTableTop + 8);
      colX += aspectColWidths[3];
      doc.text(t.nature, colX, aspectTableTop + 8);
      
      doc.y = aspectTableTop + rowHeight;
      
      // Aspect rows
      majorAspects.forEach((aspect, index) => {
        const isEven = index % 2 === 0;
        
        doc.rect(50, doc.y, doc.page.width - 100, rowHeight);
        doc.fill(isEven ? '#F8FAFC' : '#FFFFFF');
        
        doc.fillColor(COLORS.textPrimary)
          .fontSize(10)
          .font('Helvetica');
        
        colX = 60;
        
        // Planet 1
        const symbol1 = PLANET_SYMBOLS[aspect.planet1] || '';
        doc.text(`${symbol1} ${aspect.planet1.charAt(0).toUpperCase() + aspect.planet1.slice(1)}`, colX, doc.y + 8);
        colX += aspectColWidths[0];
        
        // Planet 2
        const symbol2 = PLANET_SYMBOLS[aspect.planet2] || '';
        doc.text(`${symbol2} ${aspect.planet2.charAt(0).toUpperCase() + aspect.planet2.slice(1)}`, colX, doc.y + 8);
        colX += aspectColWidths[1];
        
        // Aspect type
        doc.text(aspect.aspectBg || aspect.aspect, colX, doc.y + 8);
        colX += aspectColWidths[2];
        
        // Orb
        doc.text(`${aspect.orb.toFixed(1)}°`, colX, doc.y + 8);
        colX += aspectColWidths[3];
        
        // Nature
        let natureText = t.neutralAspect;
        let natureColor = COLORS.neutral;
        if (aspect.nature === 'harmonious') {
          natureText = t.harmonious;
          natureColor = COLORS.harmonious;
        } else if (aspect.nature === 'challenging') {
          natureText = t.challenging;
          natureColor = COLORS.challenging;
        }
        
        doc.fillColor(natureColor)
          .text(natureText, colX, doc.y + 8);
        
        doc.y += rowHeight;
      });
      
      doc.y += 40;
      
      // Elements & Modalities section
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.elements + ' & ' + t.modalities, 50, doc.y);
      
      doc.y += 30;
      
      // Elements box
      const elementsBoxY = doc.y;
      doc.roundedRect(50, elementsBoxY, 220, 100, 8);
      doc.fillAndStroke('#FAF5FF', '#E9D5FF');
      
      doc.fillColor(COLORS.primary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(t.elements, 70, elementsBoxY + 15);
      
      const elements = [
        { label: t.fire, value: chart.elements.fire, color: '#F97316' },
        { label: t.earth, value: chart.elements.earth, color: '#22C55E' },
        { label: t.air, value: chart.elements.air, color: '#3B82F6' },
        { label: t.water, value: chart.elements.water, color: '#0EA5E9' },
      ];
      
      doc.font('Helvetica')
        .fontSize(10);
      
      let elemY = elementsBoxY + 35;
      elements.forEach((elem) => {
        doc.fillColor(COLORS.textSecondary)
          .text(elem.label, 70, elemY);
        
        // Draw bar
        const barWidth = elem.value * 20;
        doc.roundedRect(120, elemY - 2, barWidth, 14, 4);
        doc.fill(elem.color);
        
        doc.fillColor(COLORS.textPrimary)
          .text(elem.value.toString(), 130 + barWidth, elemY);
        
        elemY += 18;
      });
      
      // Modalities box
      doc.roundedRect(300, elementsBoxY, 220, 100, 8);
      doc.fillAndStroke('#FAF5FF', '#E9D5FF');
      
      doc.fillColor(COLORS.primary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(t.modalities, 320, elementsBoxY + 15);
      
      const modalities = [
        { label: t.cardinal, value: chart.modalities.cardinal },
        { label: t.fixed, value: chart.modalities.fixed },
        { label: t.mutable, value: chart.modalities.mutable },
      ];
      
      doc.font('Helvetica')
        .fontSize(10);
      
      elemY = elementsBoxY + 35;
      modalities.forEach((mod) => {
        doc.fillColor(COLORS.textSecondary)
          .text(mod.label, 320, elemY);
        
        // Draw bar
        const barWidth = mod.value * 25;
        doc.roundedRect(400, elemY - 2, barWidth, 14, 4);
        doc.fill(COLORS.secondary);
        
        doc.fillColor(COLORS.textPrimary)
          .text(mod.value.toString(), 410 + barWidth, elemY);
        
        elemY += 20;
      });
      
      // Footer
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(
          `${t.page} 3`,
          50,
          doc.page.height - 30,
          { align: 'center' }
        );
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get content type and headers for PDF response
 */
export function getPDFHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    'Cache-Control': 'no-cache',
  };
}
