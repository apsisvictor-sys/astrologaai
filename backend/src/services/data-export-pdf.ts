/**
 * Data Export PDF Generator Service
 * US-32: Export User Data (GDPR Data Portability)
 * 
 * Generates human-readable PDF reports of user data
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Design system colors
const COLORS = {
  primary: '#7C3AED',
  secondary: '#EC4899',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#10B981',
  error: '#EF4444',
};

// Bulgarian translations
const BG_TRANSLATIONS = {
  title: 'Експорт на данни',
  subtitle: 'AstroLogAI',
  generatedOn: 'Генерирано на',
  accountInfo: 'Информация за акаунта',
  email: 'Имейл',
  name: 'Име',
  tier: 'План',
  language: 'Език',
  memberSince: 'Член от',
  birthData: 'Рождени данни',
  date: 'Дата',
  time: 'Час',
  location: 'Място',
  unknown: 'Неизвестно',
  birthProfiles: 'Рождени профили',
  noBirthProfiles: 'Няма допълнителни профили',
  chatHistory: 'История на чатовете',
  conversations: 'Разговори',
  messages: 'съобщения',
  noConversations: 'Няма разговори',
  partners: 'Партньори',
  noPartners: 'Няма запазени партньори',
  relationshipType: 'Тип връзка',
  subscription: 'Абонамент',
  status: 'Статус',
  active: 'Активен',
  canceled: 'Отменен',
  noSubscription: 'Няма активен абонамент',
  notificationPreferences: 'Настройки за известия',
  enabled: 'Включено',
  disabled: 'Изключено',
  dailyHoroscope: 'Дневен хороскоп',
  weeklyForecast: 'Седмична прогноза',
  newReading: 'Ново четене',
  partnerUpdates: 'Актуализации за партньори',
  marketing: 'Маркетинг',
  page: 'Страница',
  disclaimer: 'Този документ съдържа лични данни. Пазете го на сигурно място.',
  gdprNote: 'Генерирано съгласно правото на преносимост на данни (GDPR чл. 20)',
};

interface UserExportData {
  exportInfo: {
    exportedAt: string;
    format: string;
    version: string;
  };
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    language: string;
    tier: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    createdAt: string;
  };
  birthData: {
    date: string;
    time: string;
    place: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isUnknownTime: boolean;
  } | null;
  birthProfiles: Array<{
    id: string;
    name: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isUnknownTime: boolean;
    chart: {
      chartData: any;
      createdAt: string;
      history: Array<{
        archivedAt: string;
        reason: string;
        birthDate: string;
        locationName: string;
      }>;
    } | null;
  }>;
  birthChart: {
    chartData: any;
    createdAt: string;
    history: Array<{
      archivedAt: string;
      reason: string;
      birthDate: string;
      locationName: string;
    }>;
  } | null;
  chatHistory: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    createdAt: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  forecasts: {
    daily?: any;
    weekly?: any;
  };
  partners: Array<{
    id: string;
    name: string;
    label: string | null;
    relationshipType: string;
    birthDate: string;
    birthTime: string | null;
    locationName: string;
    chartSummary: any;
    notes: string | null;
    createdAt: string;
  }>;
  subscription: {
    tier: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  notificationPreferences: {
    dailyHoroscope: boolean;
    weeklyForecast: boolean;
    newReading: boolean;
    partnerUpdates: boolean;
    marketing: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  } | null;
}

/**
 * Generate a human-readable PDF document of user data
 */
export async function generateDataExportPDF(data: UserExportData): Promise<Buffer> {
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
      
      const isBulgarian = data.profile.language === 'bg';
      const t = isBulgarian ? BG_TRANSLATIONS : {
        ...BG_TRANSLATIONS,
        title: 'Data Export',
        subtitle: 'AstroLogAI',
        generatedOn: 'Generated on',
        accountInfo: 'Account Information',
        email: 'Email',
        name: 'Name',
        tier: 'Plan',
        language: 'Language',
        memberSince: 'Member since',
        birthData: 'Birth Data',
        date: 'Date',
        time: 'Time',
        location: 'Location',
        unknown: 'Unknown',
        birthProfiles: 'Birth Profiles',
        noBirthProfiles: 'No additional profiles',
        chatHistory: 'Chat History',
        conversations: 'Conversations',
        messages: 'messages',
        noConversations: 'No conversations',
        partners: 'Partners',
        noPartners: 'No saved partners',
        relationshipType: 'Relationship type',
        subscription: 'Subscription',
        status: 'Status',
        active: 'Active',
        canceled: 'Canceled',
        noSubscription: 'No active subscription',
        notificationPreferences: 'Notification Preferences',
        enabled: 'Enabled',
        disabled: 'Disabled',
        dailyHoroscope: 'Daily horoscope',
        weeklyForecast: 'Weekly forecast',
        newReading: 'New reading',
        partnerUpdates: 'Partner updates',
        marketing: 'Marketing',
        page: 'Page',
        disclaimer: 'This document contains personal data. Keep it secure.',
        gdprNote: 'Generated under GDPR Article 20 - Right to data portability',
      };
      
      // ==================== PAGE 1: HEADER & ACCOUNT INFO ====================
      
      // Header with gradient background
      doc.save();
      doc.rect(0, 0, doc.page.width, 100);
      doc.fill(COLORS.primary);
      doc.restore();
      
      // Title
      doc.fillColor('#FFFFFF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text(t.title, 50, 30, { align: 'center' });
      
      // Subtitle
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#E9D5FF')
        .text(t.subtitle, 50, 60, { align: 'center' });
      
      // Generated date
      doc.fontSize(10)
        .text(`${t.generatedOn}: ${new Date(data.exportInfo.exportedAt).toLocaleDateString(
          isBulgarian ? 'bg-BG' : 'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        )}`, 50, 80, { align: 'center' });
      
      doc.y = 120;
      
      // ==================== ACCOUNT INFO ====================
      
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.accountInfo, 50, doc.y);
      
      doc.y += 30;
      
      // Account info box
      doc.roundedRect(50, doc.y, doc.page.width - 100, 120, 8);
      doc.fillAndStroke(COLORS.surface, '#E2E8F0');
      
      const accountInfo = [
        { label: t.email, value: data.profile.email },
        { label: t.name, value: data.profile.fullName || '-' },
        { label: t.tier, value: data.profile.tier },
        { label: t.language, value: data.profile.language === 'bg' ? 'Български' : 'English' },
        { label: t.memberSince, value: new Date(data.profile.createdAt).toLocaleDateString(
          isBulgarian ? 'bg-BG' : 'en-GB',
          { day: 'numeric', month: 'long', year: 'numeric' }
        )},
      ];
      
      let infoY = doc.y + 15;
      accountInfo.forEach((info) => {
        doc.fillColor(COLORS.textSecondary)
          .fontSize(10)
          .font('Helvetica')
          .text(info.label + ':', 70, infoY);
        
        doc.fillColor(COLORS.textPrimary)
          .font('Helvetica-Bold')
          .text(info.value, 200, infoY);
        
        infoY += 20;
      });
      
      doc.y += 140;
      
      // ==================== BIRTH DATA ====================
      
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.birthData, 50, doc.y);
      
      doc.y += 30;
      
      if (data.birthData) {
        doc.roundedRect(50, doc.y, doc.page.width - 100, 80, 8);
        doc.fillAndStroke(COLORS.surface, '#E2E8F0');
        
        const birthInfo = [
          { label: t.date, value: new Date(data.birthData.date).toLocaleDateString(
            isBulgarian ? 'bg-BG' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' }
          )},
          { label: t.time, value: data.birthData.isUnknownTime ? t.unknown : data.birthData.time },
          { label: t.location, value: data.birthData.place },
        ];
        
        infoY = doc.y + 15;
        birthInfo.forEach((info) => {
          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font('Helvetica')
            .text(info.label + ':', 70, infoY);
          
          doc.fillColor(COLORS.textPrimary)
            .font('Helvetica-Bold')
            .text(info.value, 200, infoY);
          
          infoY += 20;
        });
        
        doc.y += 100;
      } else {
        doc.fillColor(COLORS.textMuted)
          .fontSize(11)
          .font('Helvetica')
          .text(isBulgarian ? 'Няма въведени рождени данни' : 'No birth data entered', 70, doc.y);
        
        doc.y += 30;
      }
      
      // ==================== BIRTH PROFILES ====================
      
      if (data.birthProfiles.length > 0) {
        doc.fillColor(COLORS.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(t.birthProfiles, 50, doc.y);
        
        doc.y += 30;
        
        data.birthProfiles.forEach((profile, index) => {
          // Check if we need a new page
          if (doc.y > doc.page.height - 150) {
            doc.addPage();
            doc.y = 50;
          }
          
          doc.roundedRect(50, doc.y, doc.page.width - 100, 60, 8);
          doc.fillAndStroke(COLORS.surface, '#E2E8F0');
          
          doc.fillColor(COLORS.textPrimary)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(profile.name, 70, doc.y + 12);
          
          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font('Helvetica')
            .text(
              `${new Date(profile.birthDate).toLocaleDateString()} - ${profile.locationName}`,
              70,
              doc.y + 32
            );
          
          doc.y += 75;
        });
      }
      
      // Footer
      const footerY = doc.page.height - 30;
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(t.disclaimer, 50, footerY, { align: 'center' });
      
      // ==================== PAGE 2: CHAT HISTORY ====================
      
      doc.addPage();
      
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.chatHistory, 50, 50);
      
      doc.y = 85;
      
      if (data.chatHistory.length > 0) {
        data.chatHistory.forEach((session, index) => {
          // Check if we need a new page
          if (doc.y > doc.page.height - 120) {
            doc.addPage();
            doc.y = 50;
          }
          
          doc.roundedRect(50, doc.y, doc.page.width - 100, 80, 8);
          doc.fillAndStroke(COLORS.surface, '#E2E8F0');
          
          const title = session.title || (isBulgarian ? `Разговор ${index + 1}` : `Conversation ${index + 1}`);
          
          doc.fillColor(COLORS.textPrimary)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(title, 70, doc.y + 12);
          
          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font('Helvetica')
            .text(
              `${new Date(session.createdAt).toLocaleDateString()} - ${session.messages.length} ${t.messages}`,
              70,
              doc.y + 32
            );
          
          // Show first message preview
          if (session.messages.length > 0) {
            const preview = session.messages[0].content.substring(0, 100);
            doc.fillColor(COLORS.textMuted)
              .fontSize(9)
              .text(preview + (session.messages[0].content.length > 100 ? '...' : ''), 70, doc.y + 52);
          }
          
          doc.y += 95;
        });
      } else {
        doc.fillColor(COLORS.textMuted)
          .fontSize(11)
          .font('Helvetica')
          .text(t.noConversations, 70, doc.y);
      }
      
      // ==================== PAGE 3: PARTNERS & SUBSCRIPTION ====================
      
      doc.addPage();
      
      // Partners section
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.partners, 50, 50);
      
      doc.y = 85;
      
      if (data.partners.length > 0) {
        data.partners.forEach((partner) => {
          // Check if we need a new page
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
            doc.y = 50;
          }
          
          doc.roundedRect(50, doc.y, doc.page.width - 100, 70, 8);
          doc.fillAndStroke(COLORS.surface, '#E2E8F0');
          
          doc.fillColor(COLORS.textPrimary)
            .fontSize(12)
            .font('Helvetica-Bold')
            .text(partner.name, 70, doc.y + 12);
          
          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font('Helvetica')
            .text(
              `${t.relationshipType}: ${partner.relationshipType} | ${new Date(partner.birthDate).toLocaleDateString()}`,
              70,
              doc.y + 32
            );
          
          if (partner.notes) {
            doc.fillColor(COLORS.textMuted)
              .fontSize(9)
              .text(partner.notes.substring(0, 60) + (partner.notes.length > 60 ? '...' : ''), 70, doc.y + 50);
          }
          
          doc.y += 85;
        });
      } else {
        doc.fillColor(COLORS.textMuted)
          .fontSize(11)
          .font('Helvetica')
          .text(t.noPartners, 70, doc.y);
        
        doc.y += 30;
      }
      
      doc.y += 20;
      
      // Subscription section
      doc.fillColor(COLORS.primary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(t.subscription, 50, doc.y);
      
      doc.y += 30;
      
      if (data.subscription) {
        doc.roundedRect(50, doc.y, doc.page.width - 100, 60, 8);
        doc.fillAndStroke(COLORS.surface, '#E2E8F0');
        
        doc.fillColor(COLORS.textPrimary)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(data.subscription.tier, 70, doc.y + 12);
        
        const statusText = data.subscription.status === 'ACTIVE' ? t.active : t.canceled;
        const statusColor = data.subscription.status === 'ACTIVE' ? COLORS.success : COLORS.error;
        
        doc.fillColor(statusColor)
          .fontSize(10)
          .font('Helvetica')
          .text(`${t.status}: ${statusText}`, 70, doc.y + 35);
      } else {
        doc.fillColor(COLORS.textMuted)
          .fontSize(11)
          .font('Helvetica')
          .text(t.noSubscription, 70, doc.y);
      }
      
      doc.y += 90;
      
      // Notification Preferences section
      if (data.notificationPreferences) {
        doc.fillColor(COLORS.primary)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(t.notificationPreferences, 50, doc.y);
        
        doc.y += 30;
        
        doc.roundedRect(50, doc.y, doc.page.width - 100, 140, 8);
        doc.fillAndStroke(COLORS.surface, '#E2E8F0');
        
        const prefs = [
          { label: t.dailyHoroscope, value: data.notificationPreferences.dailyHoroscope },
          { label: t.weeklyForecast, value: data.notificationPreferences.weeklyForecast },
          { label: t.newReading, value: data.notificationPreferences.newReading },
          { label: t.partnerUpdates, value: data.notificationPreferences.partnerUpdates },
          { label: t.marketing, value: data.notificationPreferences.marketing },
        ];
        
        infoY = doc.y + 15;
        prefs.forEach((pref) => {
          doc.fillColor(COLORS.textSecondary)
            .fontSize(10)
            .font('Helvetica')
            .text(pref.label, 70, infoY);
          
          doc.fillColor(pref.value ? COLORS.success : COLORS.textMuted)
            .font('Helvetica-Bold')
            .text(pref.value ? t.enabled : t.disabled, 400, infoY);
          
          infoY += 22;
        });
      }
      
      // Footer
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(t.gdprNote, 50, doc.page.height - 30, { align: 'center' });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default generateDataExportPDF;
