import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  de: {
    translation: {
      dashboardTitle: 'Demokratie.',
      dashboardSubtitle: 'Dein Dashboard für Gesetzgebung, Abstimmungen und EU-Recht.',
      recentVotes: 'Letzte Abstimmungen',
      recentChanges: 'Aktuelle Gesetzesänderungen',
      viewAllVotes: 'Alle Abstimmungen ansehen',
      viewAllLaws: 'Alle Gesetze ansehen',
      viewAllEu: 'Alle EU-Rechtsakte ansehen',
      viewTracker: 'Tracker ansehen',
      changesRecorded: 'Änderungen erfasst',
      summaryPending: 'Zusammenfassung wird generiert...',
      hasVoteData: 'Abstimmungsdaten',
      promises: 'Versprechen',
      gesetze: 'Gesetze',
      urteile: 'Urteile',
      euRechtsakte: 'EU-Rechtsakte',
      abstimmungen: 'Abstimmungen',
      federalCourts: '7 Bundesgerichte',
      last12Months: 'Letzte 12 Monate',
      legislativePeriod: '21. Wahlperiode',
      euLaw: 'EU-Recht',
      coalitionAgreement: 'Koalitionsvertrag',
      loadError: 'Daten konnten nicht geladen werden.',
      viewOnEurLex: 'Auf EUR-Lex ansehen',
      fulfilled: 'erfüllt',
      inProgress: 'in Bearbeitung',
      pending: 'ausstehend',
      aiDisclaimer: 'KI-generierte Zusammenfassung',
    },
  },
  en: {
    translation: {
      dashboardTitle: 'Democracy.',
      dashboardSubtitle: 'Your dashboard for legislation, votes and EU law.',
      recentVotes: 'Recent Votes',
      recentChanges: 'Recent Legislative Changes',
      viewAllVotes: 'View all votes',
      viewAllLaws: 'View all laws',
      viewAllEu: 'View all EU legislation',
      viewTracker: 'View tracker',
      changesRecorded: 'changes recorded',
      summaryPending: 'Summary is being generated...',
      hasVoteData: 'Vote data',
      promises: 'promises',
      gesetze: 'Laws',
      urteile: 'Rulings',
      euRechtsakte: 'EU Legislation',
      abstimmungen: 'Votes',
      federalCourts: '7 Federal Courts',
      last12Months: 'Last 12 months',
      legislativePeriod: '21st Legislative Period',
      euLaw: 'EU Law',
      coalitionAgreement: 'Coalition Agreement',
      loadError: 'Data could not be loaded.',
      viewOnEurLex: 'View on EUR-Lex',
      fulfilled: 'fulfilled',
      inProgress: 'in progress',
      pending: 'pending',
      aiDisclaimer: 'AI-generated summary',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'de',
  fallbackLng: 'de',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
