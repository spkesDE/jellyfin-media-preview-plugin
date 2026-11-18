/**
 * Texts Media Preview shows on cards and in its dialogs. The language follows Jellyfin Web,
 * which sets <html lang> to the user's display language, and falls back to the browser
 * language and then English. Missing keys in a language also fall back to English.
 */

const en = {
  previewVolume: 'Preview volume',
  previewVolumeValue: 'Preview volume: {value}%',
  expandTrailer: 'Expand trailer',
  closeExpandedTrailer: 'Close expanded trailer',
  playPreview: 'Play preview',
  pausePreview: 'Pause preview',
  mutePreview: 'Mute preview',
  unmutePreview: 'Unmute preview',
  noTrailer: 'No Trailer Found',
  noDirectPlay: 'No Direct Play Preview Available',
  noTrickplay: 'No Trickplay Found',
  noPreview: 'No Preview Available',
  playPreviewAudio: 'Play preview audio',
  saveAudioChanges: 'Save mute and volume changes automatically',
  reset: 'Reset',
  save: 'Save',
  couldNotSave: 'Could not save.',
  couldNotLoad: 'Could not load.',
  close: 'Close',
  loading: 'Loading',
  trailer: 'Trailer',
  showPreviews: 'Show previews',
  previewSource: 'Preview source',
  sourceDefault: 'Server default',
  sourceTrickplay: 'Thumbnails (Trickplay)',
  sourceTrailer: 'Trailer first',
  sourceDirectPlay: 'Video first (Direct Play)',
  hoverDelay: 'Hover delay (ms)',
  sectionPreview: 'Previews',
  sectionAudio: 'Sound'
};

export type TranslationKey = keyof typeof en;
type Translations = Partial<Record<TranslationKey, string>>;

const translations: Record<string, Translations> = {
  en,
  de: {
    previewVolume: 'Vorschau-Lautstärke',
    previewVolumeValue: 'Vorschau-Lautstärke: {value} %',
    expandTrailer: 'Trailer vergrößern',
    closeExpandedTrailer: 'Vergrößerten Trailer schließen',
    playPreview: 'Vorschau abspielen',
    pausePreview: 'Vorschau pausieren',
    mutePreview: 'Vorschau stummschalten',
    unmutePreview: 'Ton der Vorschau einschalten',
    noTrailer: 'Kein Trailer gefunden',
    noDirectPlay: 'Keine Direct-Play-Vorschau verfügbar',
    noTrickplay: 'Kein Trickplay gefunden',
    noPreview: 'Keine Vorschau verfügbar',
    playPreviewAudio: 'Ton in der Vorschau abspielen',
    saveAudioChanges: 'Stummschaltung und Lautstärke automatisch speichern',
    reset: 'Zurücksetzen',
    save: 'Speichern',
    couldNotSave: 'Speichern fehlgeschlagen.',
    couldNotLoad: 'Laden fehlgeschlagen.',
    close: 'Schließen',
    loading: 'Wird geladen',
    trailer: 'Trailer',
    showPreviews: 'Vorschauen anzeigen',
    previewSource: 'Vorschauquelle',
    sourceDefault: 'Server-Standard',
    sourceTrickplay: 'Vorschaubilder (Trickplay)',
    sourceTrailer: 'Trailer zuerst',
    sourceDirectPlay: 'Video zuerst (Direct Play)',
    hoverDelay: 'Hover-Verzögerung (ms)',
    sectionPreview: 'Vorschau',
    sectionAudio: 'Ton'
  },
  fr: {
    previewVolume: "Volume de l'aperçu",
    previewVolumeValue: "Volume de l'aperçu : {value} %",
    expandTrailer: 'Agrandir la bande-annonce',
    closeExpandedTrailer: 'Fermer la bande-annonce agrandie',
    playPreview: "Lire l'aperçu",
    pausePreview: "Mettre l'aperçu en pause",
    mutePreview: "Couper le son de l'aperçu",
    unmutePreview: "Réactiver le son de l'aperçu",
    noTrailer: 'Aucune bande-annonce trouvée',
    noDirectPlay: 'Aucun aperçu en lecture directe disponible',
    noTrickplay: 'Aucune image Trickplay trouvée',
    noPreview: 'Aucun aperçu disponible',
    playPreviewAudio: "Lire le son de l'aperçu",
    saveAudioChanges: 'Enregistrer automatiquement la sourdine et le volume',
    reset: 'Réinitialiser',
    save: 'Enregistrer',
    couldNotSave: "Échec de l'enregistrement.",
    couldNotLoad: 'Échec du chargement.',
    close: 'Fermer',
    loading: 'Chargement',
    trailer: 'Bande-annonce',
    showPreviews: 'Afficher les aperçus',
    previewSource: "Source de l'aperçu",
    sourceDefault: 'Valeur du serveur',
    sourceTrickplay: 'Miniatures (Trickplay)',
    sourceTrailer: "Bande-annonce d'abord",
    sourceDirectPlay: "Vidéo d'abord (lecture directe)",
    hoverDelay: 'Délai de survol (ms)',
    sectionPreview: 'Aperçus',
    sectionAudio: 'Son'
  },
  es: {
    previewVolume: 'Volumen de la vista previa',
    previewVolumeValue: 'Volumen de la vista previa: {value} %',
    expandTrailer: 'Ampliar tráiler',
    closeExpandedTrailer: 'Cerrar tráiler ampliado',
    playPreview: 'Reproducir vista previa',
    pausePreview: 'Pausar vista previa',
    mutePreview: 'Silenciar vista previa',
    unmutePreview: 'Activar el sonido de la vista previa',
    noTrailer: 'No se encontró ningún tráiler',
    noDirectPlay: 'No hay vista previa de reproducción directa',
    noTrickplay: 'No se encontró Trickplay',
    noPreview: 'No hay vista previa disponible',
    playPreviewAudio: 'Reproducir el audio de la vista previa',
    saveAudioChanges: 'Guardar automáticamente el silencio y el volumen',
    reset: 'Restablecer',
    save: 'Guardar',
    couldNotSave: 'No se pudo guardar.',
    couldNotLoad: 'No se pudo cargar.',
    close: 'Cerrar',
    loading: 'Cargando',
    trailer: 'Tráiler',
    showPreviews: 'Mostrar vistas previas',
    previewSource: 'Fuente de la vista previa',
    sourceDefault: 'Predeterminado del servidor',
    sourceTrickplay: 'Miniaturas (Trickplay)',
    sourceTrailer: 'Tráiler primero',
    sourceDirectPlay: 'Vídeo primero (reproducción directa)',
    hoverDelay: 'Retraso al pasar el cursor (ms)',
    sectionPreview: 'Vistas previas',
    sectionAudio: 'Sonido'
  },
  it: {
    previewVolume: 'Volume anteprima',
    previewVolumeValue: 'Volume anteprima: {value}%',
    expandTrailer: 'Ingrandisci trailer',
    closeExpandedTrailer: 'Chiudi trailer ingrandito',
    playPreview: 'Riproduci anteprima',
    pausePreview: 'Metti in pausa anteprima',
    mutePreview: 'Disattiva audio anteprima',
    unmutePreview: 'Attiva audio anteprima',
    noTrailer: 'Nessun trailer trovato',
    noDirectPlay: 'Nessuna anteprima in riproduzione diretta',
    noTrickplay: 'Nessun Trickplay trovato',
    noPreview: 'Nessuna anteprima disponibile',
    playPreviewAudio: "Riproduci l'audio dell'anteprima",
    saveAudioChanges: 'Salva automaticamente audio disattivato e volume',
    reset: 'Ripristina',
    save: 'Salva',
    couldNotSave: 'Impossibile salvare.',
    couldNotLoad: 'Impossibile caricare.',
    close: 'Chiudi',
    loading: 'Caricamento',
    trailer: 'Trailer',
    showPreviews: 'Mostra anteprime',
    previewSource: 'Sorgente anteprima',
    sourceDefault: 'Predefinito del server',
    sourceTrickplay: 'Miniature (Trickplay)',
    sourceTrailer: 'Prima il trailer',
    sourceDirectPlay: 'Prima il video (riproduzione diretta)',
    hoverDelay: 'Ritardo al passaggio del mouse (ms)',
    sectionPreview: 'Anteprime',
    sectionAudio: 'Audio'
  },
  nl: {
    previewVolume: 'Voorbeeldvolume',
    previewVolumeValue: 'Voorbeeldvolume: {value}%',
    expandTrailer: 'Trailer vergroten',
    closeExpandedTrailer: 'Vergrote trailer sluiten',
    playPreview: 'Voorbeeld afspelen',
    pausePreview: 'Voorbeeld pauzeren',
    mutePreview: 'Voorbeeld dempen',
    unmutePreview: 'Geluid van voorbeeld inschakelen',
    noTrailer: 'Geen trailer gevonden',
    noDirectPlay: 'Geen Direct Play-voorbeeld beschikbaar',
    noTrickplay: 'Geen Trickplay gevonden',
    noPreview: 'Geen voorbeeld beschikbaar',
    playPreviewAudio: 'Geluid van voorbeeld afspelen',
    saveAudioChanges: 'Dempen en volume automatisch opslaan',
    reset: 'Herstellen',
    save: 'Opslaan',
    couldNotSave: 'Opslaan mislukt.',
    couldNotLoad: 'Laden mislukt.',
    close: 'Sluiten',
    loading: 'Laden',
    trailer: 'Trailer',
    showPreviews: 'Voorbeelden tonen',
    previewSource: 'Voorbeeldbron',
    sourceDefault: 'Serverstandaard',
    sourceTrickplay: 'Miniaturen (Trickplay)',
    sourceTrailer: 'Eerst trailer',
    sourceDirectPlay: 'Eerst video (Direct Play)',
    hoverDelay: 'Vertraging bij aanwijzen (ms)',
    sectionPreview: 'Voorbeelden',
    sectionAudio: 'Geluid'
  },
  pt: {
    previewVolume: 'Volume da pré-visualização',
    previewVolumeValue: 'Volume da pré-visualização: {value}%',
    expandTrailer: 'Ampliar trailer',
    closeExpandedTrailer: 'Fechar trailer ampliado',
    playPreview: 'Reproduzir pré-visualização',
    pausePreview: 'Pausar pré-visualização',
    mutePreview: 'Silenciar pré-visualização',
    unmutePreview: 'Ativar som da pré-visualização',
    noTrailer: 'Nenhum trailer encontrado',
    noDirectPlay: 'Nenhuma pré-visualização de reprodução direta',
    noTrickplay: 'Nenhum Trickplay encontrado',
    noPreview: 'Nenhuma pré-visualização disponível',
    playPreviewAudio: 'Reproduzir o áudio da pré-visualização',
    saveAudioChanges: 'Salvar silêncio e volume automaticamente',
    reset: 'Redefinir',
    save: 'Salvar',
    couldNotSave: 'Não foi possível salvar.',
    couldNotLoad: 'Não foi possível carregar.',
    close: 'Fechar',
    loading: 'Carregando',
    trailer: 'Trailer',
    showPreviews: 'Mostrar pré-visualizações',
    previewSource: 'Fonte da pré-visualização',
    sourceDefault: 'Padrão do servidor',
    sourceTrickplay: 'Miniaturas (Trickplay)',
    sourceTrailer: 'Trailer primeiro',
    sourceDirectPlay: 'Vídeo primeiro (reprodução direta)',
    hoverDelay: 'Atraso ao passar o cursor (ms)',
    sectionPreview: 'Pré-visualizações',
    sectionAudio: 'Som'
  }
};

function getLanguageCandidates(): string[] {
  const candidates: string[] = [];
  const documentLanguage = document.documentElement?.getAttribute('lang');
  if (documentLanguage) {
    candidates.push(documentLanguage);
  }
  if (typeof navigator !== 'undefined') {
    candidates.push(...(navigator.languages || []), navigator.language);
  }
  return candidates.filter(Boolean);
}

export function getActiveTranslations(): Translations {
  for (const candidate of getLanguageCandidates()) {
    const normalized = candidate.toLowerCase();
    const exact = translations[normalized];
    if (exact) {
      return exact;
    }
    const base = translations[normalized.split(/[-_]/)[0]];
    if (base) {
      return base;
    }
  }
  return en;
}

/** Returns the text for a key in the current language; {name} placeholders are filled in. */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const template = getActiveTranslations()[key] ?? en[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
